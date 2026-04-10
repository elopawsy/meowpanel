import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
    getInstalledMods,
    identifyInstalledMods,
    installMod,
    uninstallMod,
    type IdentifiedMod,
    type InstalledFile,
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

    const [files, setFiles] = useState<InstalledFile[]>([]);
    const [loading, setLoading] = useState(true);

    const [enrichment, setEnrichment] = useState<Map<string, IdentifiedMod>>(new Map());
    const [identifying, setIdentifying] = useState(false);
    const [identified, setIdentified] = useState(false);

    const [updating, setUpdating] = useState<string | null>(null);

    const directory = detection?.directory ?? 'mods';
    const loader = detection?.loader;
    const gameVersion = detection?.game_version;

    const fetchFiles = useCallback(() => {
        setLoading(true);
        getInstalledMods(uuid, directory)
            .then((data) => {
                setFiles(data);
                setLoading(false);
            })
            .catch(() => {
                toast.error('Failed to list mods.');
                setLoading(false);
            });
    }, [uuid, directory]);

    const checkForUpdates = useCallback(() => {
        setIdentifying(true);
        setIdentified(false);
        identifyInstalledMods(
            uuid,
            directory,
            loader ? [loader] : undefined,
            gameVersion ? [gameVersion] : undefined,
        )
            .then((data) => {
                const map = new Map<string, IdentifiedMod>();
                let identifiedCount = 0;
                for (const mod of data) {
                    if (mod.modrinth) identifiedCount++;
                    map.set(mod.name, mod);
                }
                setEnrichment(map);
                setIdentified(true);
                const updateCount = data.filter((m) => m.update_available).length;
                if (updateCount > 0) {
                    toast.info(`${updateCount} update${updateCount !== 1 ? 's' : ''} available`);
                } else if (identifiedCount > 0) {
                    toast.success(`${identifiedCount} mod${identifiedCount !== 1 ? 's' : ''} identified, all up to date`);
                } else {
                    toast.info('Could not identify any mods on Modrinth');
                }
            })
            .catch(() => {
                toast.error('Update check failed.');
                setIdentified(true);
            })
            .finally(() => setIdentifying(false));
    }, [uuid, directory, loader, gameVersion]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const handleUninstall = async (filename: string) => {
        if (!confirm(`Remove ${filename}?`)) return;
        try {
            await uninstallMod(uuid, filename, directory);
            toast.success(`${filename} removed.`);
            setEnrichment(new Map());
            setIdentified(false);
            fetchFiles();
        } catch {
            toast.error('Failed to remove mod.');
        }
    };

    const handleUpdate = async (filename: string) => {
        const info = enrichment.get(filename);
        if (!info?.update_available?.file_url || !info?.update_available?.file_name) return;

        setUpdating(filename);
        try {
            // Install new version first, then remove old — if install fails, the old mod is preserved
            await installMod(uuid, info.update_available.file_url, info.update_available.file_name, directory);
            await uninstallMod(uuid, filename, directory);
            toast.success(`Updated to ${info.update_available.version_number}`);
            setEnrichment(new Map());
            setIdentified(false);
            fetchFiles();
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

    const identifiedCount = [...enrichment.values()].filter((m) => m.modrinth).length;
    const updatableCount = [...enrichment.values()].filter((m) => m.update_available).length;

    return (
        <div className='space-y-3'>
            <div className='flex items-center justify-between'>
                <div className='text-sm text-gray-400'>
                    {files.length} mod{files.length !== 1 ? 's' : ''} in /{directory}/
                    {identified && identifiedCount > 0 && (
                        <span className='ml-2 text-green-400'>
                            {identifiedCount} identified
                        </span>
                    )}
                    {identified && updatableCount > 0 && (
                        <span className='ml-1 text-yellow-400 font-medium'>
                            · {updatableCount} update{updatableCount !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <div className='flex gap-1.5'>
                    <button
                        onClick={checkForUpdates}
                        disabled={identifying || files.length === 0}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                            identifying
                                ? 'bg-blue-600/20 border-blue-500/30 text-blue-300 animate-pulse'
                                : 'bg-[#ffffff0a] border-[#ffffff12] text-zinc-400 hover:text-white hover:border-blue-500/30'
                        }`}
                    >
                        {identifying ? 'Checking...' : 'Check for updates'}
                    </button>
                    <button
                        onClick={() => { setEnrichment(new Map()); setIdentified(false); fetchFiles(); }}
                        className='text-xs px-2 py-1 rounded bg-[#ffffff0a] border border-[#ffffff12] text-zinc-400 hover:text-white transition-colors'
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {files.length === 0 ? (
                <div className='text-center text-gray-500 py-8'>No .jar files found in /{directory}/.</div>
            ) : (
                <div className='space-y-2'>
                    {files.map((file) => {
                        const info = enrichment.get(file.name);
                        const hasUpdate = !!info?.update_available;

                        return (
                            <div
                                key={file.name}
                                className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                                    hasUpdate
                                        ? 'bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/30'
                                        : 'bg-[#ffffff06] border-[#ffffff0e] hover:border-[#ffffff18]'
                                }`}
                            >
                                <div className='flex-1 min-w-0'>
                                    <div className='flex items-center gap-2'>
                                        <p className='text-sm font-medium text-white truncate font-mono'>
                                            {file.name}
                                        </p>
                                        {info?.modrinth && (
                                            <a
                                                href={`https://modrinth.com/project/${info.modrinth.project_id}`}
                                                target='_blank'
                                                rel='noopener noreferrer'
                                                className='text-[10px] px-1.5 py-0.5 rounded bg-green-600/15 border border-green-500/25 text-green-400 hover:bg-green-600/25 transition-colors shrink-0'
                                            >
                                                Modrinth
                                            </a>
                                        )}
                                    </div>
                                    <div className='flex items-center gap-2 mt-0.5'>
                                        <span className='text-xs text-gray-500'>{formatSize(file.size)}</span>
                                        {info?.modrinth?.version_number && (
                                            <span className='text-xs text-gray-500'>
                                                v{info.modrinth.version_number}
                                            </span>
                                        )}
                                        {info?.update_available && (
                                            <span className='text-xs text-yellow-400 font-medium'>
                                                → v{info.update_available.version_number}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className='flex items-center gap-1.5 shrink-0 ml-3'>
                                    {hasUpdate && (
                                        <button
                                            onClick={() => handleUpdate(file.name)}
                                            disabled={updating === file.name}
                                            className={`px-3 py-1 text-xs rounded-md bg-yellow-600/15 border border-yellow-500/25 text-yellow-400 hover:bg-yellow-600/25 transition-colors ${
                                                updating === file.name ? 'opacity-50 animate-pulse' : ''
                                            }`}
                                        >
                                            {updating === file.name ? 'Updating...' : 'Update'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleUninstall(file.name)}
                                        className='px-3 py-1 text-xs rounded-md bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 transition-colors'
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default InstalledMods;
