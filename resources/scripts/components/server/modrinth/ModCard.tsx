import { ArrowDownToLine } from '@gravity-ui/icons';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { getModVersions, installMod } from '@/api/server/modrinth';
import Button from '@/components/elements/ButtonV2';

import { ServerContext } from '@/state/server';

import { type Mod, useGlobalStateContext } from './config';

interface ModCardProps {
    mod: Mod;
}

export const ModCard = ({ mod }: ModCardProps) => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { selectedLoaders, selectedVersions } = useGlobalStateContext();
    const [installing, setInstalling] = useState(false);

    const formatDownloads = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const handleInstall = async () => {
        setInstalling(true);
        try {
            // Fetch versions filtered by current loaders/game versions
            const versions = await getModVersions(
                uuid,
                mod.id,
                selectedLoaders.length > 0 ? selectedLoaders : undefined,
                selectedVersions.length > 0 ? selectedVersions : undefined,
            );

            if (!versions || versions.length === 0) {
                toast.error('No compatible version found for your filters.');
                return;
            }

            // Pick the first (latest compatible) version's primary file
            const latestVersion = versions[0];
            if (!latestVersion) {
                toast.error('No compatible version found.');
                return;
            }
            const file = latestVersion.files.find((f) => f.primary) ?? latestVersion.files[0];
            if (!file) {
                toast.error('No downloadable file found.');
                return;
            }

            // Determine directory based on loaders
            const isPlugin = latestVersion.loaders.some((l: string) =>
                ['paper', 'spigot', 'bukkit', 'purpur', 'pufferfish', 'folia'].includes(l),
            );
            const directory = isPlugin ? 'plugins' : 'mods';

            toast.info(`Installing ${mod.title} v${latestVersion.version_number}...`);

            const result = await installMod(uuid, file.url, file.filename, directory);

            if (result.success) {
                toast.success(`${mod.title} installed to /${directory}/`);
            }
        } catch (err: any) {
            const msg = err?.response?.data?.error || 'Installation failed.';
            toast.error(msg);
        } finally {
            setInstalling(false);
        }
    };

    return (
        <div className='group bg-gradient-to-br from-[#090909] via-[#0f0f0f] to-[#131313] rounded-xl overflow-hidden border border-gray-800/70 hover:border-brand/60 transition-all duration-300 hover:shadow-2xl hover:shadow-brand/15'>
            <div className='p-6 flex items-start space-x-5'>
                <div className='flex-shrink-0 relative'>
                    {mod.icon_url ? (
                        <div className='relative'>
                            <Link to={`${mod.id}`}>
                                <img
                                    src={mod.icon_url}
                                    alt={mod.title}
                                    className='w-20 h-20 object-cover rounded-xl shadow-lg group-hover:scale-105 transition-transform duration-300 border border-gray-700/50'
                                />
                            </Link>
                        </div>
                    ) : (
                        <div className='w-20 h-20 bg-gradient-to-br from-[#131313] to-[#1a1a1a] rounded-xl flex items-center justify-center border border-gray-700/30'>
                            <span className='text-gray-400 text-sm'>No Icon</span>
                        </div>
                    )}
                </div>

                <div className='flex-1 min-w-0 space-y-3'>
                    <div>
                        <Link
                            to={`${mod.id}`}
                            className='text-xl font-bold text-white hover:text-brand/50 transition-colors duration-200 line-clamp-1 group-hover:underline'
                        >
                            {mod.title}
                        </Link>
                        <p className='text-sm text-gray-400 mt-1 font-medium'>by {mod.author}</p>
                    </div>

                    <p className='text-gray-500 leading-relaxed line-clamp-2 text-sm'>{mod.description}</p>

                    <div className='flex items-center space-x-6 text-sm'>
                        <div className='flex items-center space-x-2 text-gray-400'>
                            <svg className='w-4 h-4 text-brand' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'
                                />
                            </svg>
                            <span className='font-semibold text-gray-300'>{formatDownloads(mod.downloads)}</span>
                        </div>
                    </div>
                </div>

                <div className='flex-shrink-0 self-center'>
                    <Button
                        onClick={handleInstall}
                        disabled={installing}
                        className={`border-gray-500/70 border-2 rounded-md transition duration-200 hover:border-brand/50 hover:text-gray-200 ${installing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <ArrowDownToLine width={22} height={22} className='px-1' />
                        {installing ? 'Installing...' : 'Install'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
