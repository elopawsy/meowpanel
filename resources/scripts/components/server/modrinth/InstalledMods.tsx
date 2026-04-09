import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
    identifyInstalledMods,
    installMod,
    uninstallMod,
    type IdentifiedMod,
    type ServerDetection,
} from '@/api/server/modrinth';

import { ServerContext } from '@/state/server';

const formatSize = (bytes: number): string => {
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
};

interface Props {
    detection: ServerDetection | null;
}

const InstalledMods = ({ detection }: Props) => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const [mods, setMods] = useState<IdentifiedMod[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    const directory = detection?.directory ?? 'mods';
    const loader = detection?.loader;
    const gameVersion = detection?.game_version;

    const fetchMods = useCallback(() => {
        setLoading(true);
        identifyInstalledMods(
            uuid,
            directory,
            loader ? [loader] : undefined,
            gameVersion ? [gameVersion] : undefined,
        )
            .then(setMods)
            .catch(() => toast.error('Failed to load installed mods.'))
            .finally(() => setLoading(false));
    }, [uuid, directory, loader, gameVersion]);

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

    const handleUpdate = async (mod: IdentifiedMod) => {
        if (!mod.update_available?.file_url || !mod.update_available?.file_name) return;

        setUpdating(mod.name);
        try {
            // Remove old version
            await uninstallMod(uuid, mod.name, directory);
            // Install new version
            await installMod(uuid, mod.update_available.file_url, mod.update_available.file_name, directory);
            toast.success(`Updated to ${mod.update_available.version_number}`);
            fetchMods();
        } catch {
            toast.error('Update failed.');
        } finally {
            setUpdating(null);
        }
    };

    if (loading) {
        return (
            <div className='flex justify-center py-8'>
                <div className='animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand' />
            </div>
        );
    }

    const updatableCount = mods.filter((m) => m.update_available).length;

    return (
        <div className='space-y-3'>
            <div className='flex items-center justify-between'>
                <div className='text-sm text-gray-400'>
                    {mods.length} mod{mods.length !== 1 ? 's' : ''} in /{directory}/
                    {updatableCount > 0 && (
                        <span className='ml-2 text-yellow-400 font-medium'>
                            ({updatableCount} update{updatableCount !== 1 ? 's' : ''} available)
                        </span>
                    )}
                </div>
                <button
                    onClick={fetchMods}
                    className='text-xs px-2 py-1 rounded bg-[#ffffff0a] border border-[#ffffff12] text-zinc-400 hover:text-white transition-colors'
                >
                    Refresh
                </button>
            </div>

            {mods.length === 0 ? (
                <div className='text-center text-gray-500 py-8'>No .jar files found in /{directory}/.</div>
            ) : (
                <div className='space-y-2'>
                    {mods.map((mod) => (
                        <div
                            key={mod.name}
                            className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                                mod.update_available
                                    ? 'bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/30'
                                    : 'bg-[#ffffff06] border-[#ffffff0e] hover:border-[#ffffff18]'
                            }`}
                        >
                            <div className='flex-1 min-w-0'>
                                <div className='flex items-center gap-2'>
                                    <p className='text-sm font-medium text-white truncate font-mono'>{mod.name}</p>
                                    {mod.modrinth && (
                                        <a
                                            href={`https://modrinth.com/project/${mod.modrinth.project_id}`}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            className='text-[10px] px-1.5 py-0.5 rounded bg-green-600/15 border border-green-500/25 text-green-400 hover:bg-green-600/25 transition-colors shrink-0'
                                        >
                                            Modrinth
                                        </a>
                                    )}
                                </div>
                                <div className='flex items-center gap-2 mt-0.5'>
                                    <span className='text-xs text-gray-500'>{formatSize(mod.size)}</span>
                                    {mod.modrinth?.version_number && (
                                        <span className='text-xs text-gray-500'>
                                            v{mod.modrinth.version_number}
                                        </span>
                                    )}
                                    {mod.update_available && (
                                        <span className='text-xs text-yellow-400 font-medium'>
                                            → v{mod.update_available.version_number}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className='flex items-center gap-1.5 shrink-0 ml-3'>
                                {mod.update_available && (
                                    <button
                                        onClick={() => handleUpdate(mod)}
                                        disabled={updating === mod.name}
                                        className={`px-3 py-1 text-xs rounded-md bg-yellow-600/15 border border-yellow-500/25 text-yellow-400 hover:bg-yellow-600/25 transition-colors ${
                                            updating === mod.name ? 'opacity-50 animate-pulse' : ''
                                        }`}
                                    >
                                        {updating === mod.name ? 'Updating...' : 'Update'}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleUninstall(mod.name)}
                                    className='px-3 py-1 text-xs rounded-md bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 transition-colors'
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default InstalledMods;
