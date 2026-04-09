import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { getInstalledMods, uninstallMod, type InstalledMod } from '@/api/server/modrinth';

import { ServerContext } from '@/state/server';

const formatSize = (bytes: number): string => {
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
};

interface Props {
    directory: 'mods' | 'plugins';
}

const InstalledMods = ({ directory }: Props) => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const [mods, setMods] = useState<InstalledMod[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMods = useCallback(() => {
        setLoading(true);
        getInstalledMods(uuid, directory)
            .then(setMods)
            .catch(() => toast.error('Failed to load installed mods.'))
            .finally(() => setLoading(false));
    }, [uuid, directory]);

    useEffect(() => {
        fetchMods();
    }, [fetchMods]);

    const handleUninstall = async (filename: string) => {
        if (!confirm(`Remove ${filename}?`)) return;
        try {
            await uninstallMod(uuid, filename, directory);
            toast.success(`${filename} removed.`);
            fetchMods();
        } catch {
            toast.error('Failed to remove mod.');
        }
    };

    if (loading) {
        return (
            <div className='flex justify-center py-8'>
                <div className='animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand' />
            </div>
        );
    }

    if (mods.length === 0) {
        return (
            <div className='text-center text-gray-500 py-8'>
                No .jar files found in /{directory}/.
            </div>
        );
    }

    return (
        <div className='space-y-2'>
            <div className='text-sm text-gray-400 mb-3'>
                {mods.length} mod{mods.length !== 1 ? 's' : ''} installed in /{directory}/
            </div>
            {mods.map((mod) => (
                <div
                    key={mod.name}
                    className='flex items-center justify-between px-4 py-3 rounded-lg bg-[#ffffff06] border border-[#ffffff0e] hover:border-[#ffffff18] transition-colors'
                >
                    <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-white truncate font-mono'>{mod.name}</p>
                        <p className='text-xs text-gray-500'>
                            {formatSize(mod.size)}
                            {mod.modified_at && ` · ${new Date(mod.modified_at).toLocaleDateString()}`}
                        </p>
                    </div>
                    <button
                        onClick={() => handleUninstall(mod.name)}
                        className='px-3 py-1 text-xs rounded-md bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 transition-colors shrink-0 ml-3'
                    >
                        Remove
                    </button>
                </div>
            ))}
        </div>
    );
};

export default InstalledMods;
