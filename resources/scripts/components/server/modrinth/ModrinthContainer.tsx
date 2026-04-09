import debounce from 'debounce';
import { useCallback, useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';

import { detectServer, type ServerDetection } from '@/api/server/modrinth';
import Can from '@/components/elements/Can';
import ContentBox from '@/components/elements/ContentBox';
import { ModBox } from '@/components/elements/ModBox';
import PageContentBlock from '@/components/elements/PageContentBlock';

import { ServerContext } from '@/state/server';

import InstalledMods from './InstalledMods';
import LoaderSelector from './LoaderSelector';
import { ModList } from './ModList';
import GameVersionSelector from './VersionSelector';
import { GlobalStateProvider, ModrinthService, appVersion, useGlobalStateContext } from './config';

type Tab = 'browse' | 'installed';

const ModrinthContainerInner = () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const {
        searchQuery,
        setSearchQuery,
        setSelectedLoaders,
        setSelectedVersions,
        updateGameVersions,
        updateLoaders,
    } = useGlobalStateContext();

    const [searchTerm, setSearchTerm] = useState(searchQuery);
    const [isLoadingLoader, setLoaderLoading] = useState(true);
    const [isLoadingVersion, setVersionLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('browse');
    const [detection, setDetection] = useState<ServerDetection | null>(null);

    const debouncedSetSearchTerm = useCallback(
        debounce((value: string) => {
            setSearchQuery(value);
        }, 500),
        [setSearchQuery],
    );

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchTerm(value);
        debouncedSetSearchTerm(value);
    };

    useEffect(() => {
        const initialize = async () => {
            if (isInitialized) return;

            // Auto-detect server version and loader
            try {
                const det = await detectServer(uuid);
                setDetection(det);

                // Auto-set filters from detection
                if (det.loader) {
                    setSelectedLoaders([det.loader]);
                }
                if (det.game_version) {
                    setSelectedVersions([det.game_version]);
                }
            } catch {
                // Detection failed, continue without auto-filters
            }

            const initialized = await ModrinthService.init(appVersion);
            if (!initialized) {
                toast.error('Failed to initialize Modrinth API');
                return;
            }

            try {
                const [loaderResponse, versionResponse] = await Promise.all([
                    ModrinthService.fetchLoaders(),
                    ModrinthService.fetchGameVersions(),
                ]);

                updateLoaders(loaderResponse.data);
                updateGameVersions(versionResponse.data);

                setLoaderLoading(false);
                setVersionLoading(false);
                setIsInitialized(true);
            } catch (error) {
                console.error('Initial fetch error:', error);
                toast.error(error instanceof Error ? error.message : 'Failed to fetch initial data');
                setLoaderLoading(false);
                setVersionLoading(false);
            }
        };

        initialize();
    }, [isInitialized, uuid, updateLoaders, updateGameVersions, setSelectedLoaders, setSelectedVersions]);

    useEffect(() => {
        setSearchTerm(searchQuery);
    }, [searchQuery]);

    return (
        <PageContentBlock title={'Mods/Plugins'}>
            <Toaster />

            {/* Detection banner */}
            {detection && (detection.loader || detection.game_version) && (
                <div className='flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-blue-600/10 border border-blue-500/20 text-xs text-blue-300'>
                    <span>Auto-detected:</span>
                    {detection.loader && (
                        <span className='px-1.5 py-0.5 rounded bg-blue-600/20 font-medium'>{detection.loader}</span>
                    )}
                    {detection.game_version && (
                        <span className='px-1.5 py-0.5 rounded bg-blue-600/20 font-medium'>{detection.game_version}</span>
                    )}
                    <span className='text-blue-400/60'>({detection.egg_name})</span>
                </div>
            )}

            {/* Tab bar */}
            <div className='flex gap-1 bg-[#ffffff06] border border-[#ffffff0d] rounded-xl p-1 w-fit mb-5'>
                {(
                    [
                        { id: 'browse' as Tab, label: 'Browse Modrinth' },
                        { id: 'installed' as Tab, label: 'Installed' },
                    ] as const
                ).map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                            activeTab === t.id
                                ? 'bg-[#ffffff14] text-white border border-[#ffffff18]'
                                : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {activeTab === 'browse' && (
                <div className='flex flex-wrap gap-4'>
                    <ContentBox
                        className='p-8 bg-[#ffffff09] border-[1px] border-[#ffffff11] shadow-xs rounded-xl w-full md:w-1/6'
                        title='Filters'
                    >
                        <Can action={'modrinth.loader'}>
                            <ModBox>
                                <ContentBox title='Loader'>
                                    {isLoadingLoader ? <p>Loading loaders...</p> : <LoaderSelector />}
                                </ContentBox>
                            </ModBox>
                        </Can>
                        <Can action={'modrinth.version'}>
                            <ModBox>
                                <ContentBox title='Version' className='scrollbar-thumb-red-700'>
                                    {isLoadingVersion ? <p>Loading versions...</p> : <GameVersionSelector />}
                                </ContentBox>
                            </ModBox>
                        </Can>
                    </ContentBox>

                    <ContentBox
                        className='p-8 bg-[#ffffff09] border-[1px] border-[#ffffff11] shadow-xs rounded-xl w-full md:w-4/5'
                        title='Modrinth'
                    >
                        <div className='relative w-full h-full mb-4'>
                            <svg
                                xmlns='http://www.w3.org/2000/svg'
                                fill='none'
                                viewBox='0 0 24 24'
                                strokeWidth={1.5}
                                stroke='currentColor'
                                className='w-5 h-5 absolute top-1/2 -translate-y-1/2 left-5 opacity-40'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    d='m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z'
                                />
                            </svg>
                            <input
                                className='pl-14 pr-4 py-4 w-full rounded-lg bg-[#ffffff11] text-sm font-bold'
                                type='text'
                                placeholder='Search mods and plugins...'
                                value={searchTerm}
                                onChange={handleInputChange}
                            />
                        </div>
                        <ModList />
                    </ContentBox>
                </div>
            )}

            {activeTab === 'installed' && (
                <ContentBox className='p-8 bg-[#ffffff09] border-[1px] border-[#ffffff11] shadow-xs rounded-xl'>
                    <InstalledMods detection={detection} />
                </ContentBox>
            )}
        </PageContentBlock>
    );
};

const ModrinthContainer = () => {
    return (
        <GlobalStateProvider>
            <ModrinthContainerInner />
        </GlobalStateProvider>
    );
};

export default ModrinthContainer;
