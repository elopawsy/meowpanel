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

    // Basic file listing (fast, reliable)
    const [files, setFiles] = useState<InstalledFile[]>([]);
    const [loading, setLoading] = useState(true);

    // Modrinth enrichment (slow, optional)
    const [enrichment, setEnrichment] = useState<Map<string, IdentifiedMod>>(new Map());
    const [identifying, setIdentifying] = useState(false);

    const [updating, setUpdating] = useState<string | null>(null);

    const directory = detection?.directory ?? 'mods';
    const loader = detection?.loader;
    const gameVersion = detection?.game_version;

    // Step 1: Fast file listing
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

    // Step 2: Background Modrinth identification
    const fetchEnrichment = useCallback(() => {
        setIdentifying(true);
        identifyInstalledMods(
            uuid,
            directory,
            loader ? [loader] : undefined,
            gameVersion ? [gameVersion] : undefined,
        )
            .then((data) => {
                const map = new Map<string, IdentifiedMod>();
                for (const mod of data) {
                    map.set(mod.name, mod);
                }
                setEnrichment(map);
            })
            .catch(() => {
                // Enrichment failed silently — basic listing still works
            })
            .finally(() => setIdentifying(false));
    }, [uuid, directory, loader, gameVersion]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    // Start enrichment after files are loaded
    useEffect(() => {
        if (files.length > 0 && enrichment.size === 0 && !identifying) {
            fetchEnrichment();
        }
    }, [files, enrichment.size, identifying, fetchEnrichment]);

    const handleUninstall = async (filename: string) => {
        if (!confirm(`Remove ${filename}?`)) return;
        try {
            await uninstallMod(uuid, filename, directory);
            toast.success(`${filename} removed.`);
            setEnrichment(new Map());
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
            await uninstallMod(uuid, filename, directory);
            await installMod(uuid, info.update_available.file_url, info.update_available.file_name, directory);
            toast.success(`Updated to ${info.update_available.version_number}`);
            setEnrichment(new Map());
            fetchFiles();
        } catch {
            toast.error('Update failed.');
        } finally {
            setUpdating(null);
        }
    };

    const handleRefresh = () => {
        setEnrichment(new Map());
        fetchFiles();
    };

    if (loading) {
        return (
            <div className='flex justify-center py-8'>
                <div className='animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand' />
            </div>
        );
    }

    const updatableCount = files.filter((f) => enrichment.get(f.name)?.update_available).length;

    return (
        <div className='space-y-3'>
            <div className='flex items-center justify-between'>
                <div className='text-sm text-gray-400'>
                    {files.length} mod{files.length !== 1 ? 's' : ''} in /{directory}/
                    {identifying && (
                        <span className='ml-2 text-blue-400 animate-pulse'>Checking Modrinth...</span>
                    )}
                    {!identifying && updatableCount > 0 && (
                        <span className='ml-2 text-yellow-400 font-medium'>
                            ({updatableCount} update{updatableCount !== 1 ? 's' : ''} available)
                        </span>
                    )}
                </div>
                <button
                    onClick={handleRefresh}
                    className='text-xs px-2 py-1 rounded bg-[#ffffff0a] border border-[#ffffff12] text-zinc-400 hover:text-white transition-colors'
                >
                    Refresh
                </button>
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
