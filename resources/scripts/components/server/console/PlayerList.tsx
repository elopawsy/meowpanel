import { useEffect, useState } from 'react';

import getPlayerList, {
    getPlayerData,
    type Player,
    type PlayerDataResponse,
    type PlayerListData,
    type PlayerStats,
} from '@/api/server/getPlayerList';
import { ServerContext } from '@/state/server';

const REFRESH_INTERVAL = 30_000;

const HealthBar = ({ health, max }: { health: number; max: number }) => {
    const hearts = Math.ceil(max / 2);
    const fullHearts = Math.floor(health / 2);
    const halfHeart = health % 2 >= 1;

    return (
        <div className='flex gap-px flex-wrap' title={`${health} / ${max} HP`}>
            {Array.from({ length: hearts }, (_, i) => (
                <span
                    key={i}
                    className={`text-[10px] leading-none ${
                        i < fullHearts
                            ? 'text-red-500'
                            : i === fullHearts && halfHeart
                              ? 'text-red-400/60'
                              : 'text-zinc-700'
                    }`}
                >
                    &#10084;
                </span>
            ))}
        </div>
    );
};

const FoodBar = ({ level }: { level: number }) => {
    const drumsticks = 10;
    const full = Math.floor(level / 2);
    const half = level % 2 >= 1;

    return (
        <div className='flex gap-px flex-wrap' title={`${level} / 20 Hunger`}>
            {Array.from({ length: drumsticks }, (_, i) => (
                <span
                    key={i}
                    className={`text-[10px] leading-none ${
                        i < full
                            ? 'text-amber-500'
                            : i === full && half
                              ? 'text-amber-500/50'
                              : 'text-zinc-700'
                    }`}
                >
                    &#9679;
                </span>
            ))}
        </div>
    );
};

const PlayerAvatar = ({ player }: { player: Player }) => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const [stats, setStats] = useState<PlayerStats | null>(null);
    const [rconEnabled, setRconEnabled] = useState<boolean | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [hovered, setHovered] = useState(false);

    const avatarUrl = player.uuid ? `https://crafatar.com/avatars/${player.uuid}?size=32&overlay` : null;

    // Load player stats on hover
    useEffect(() => {
        if (!hovered || loadingStats || stats !== null || rconEnabled === false) return;

        setLoadingStats(true);
        getPlayerData(uuid, player.name)
            .then((res: PlayerDataResponse) => {
                setRconEnabled(res.rcon_enabled);
                if (res.data) {
                    setStats(res.data);
                }
            })
            .catch(() => {
                // RCON not available
            })
            .finally(() => setLoadingStats(false));
    }, [hovered, uuid, player.name, loadingStats, stats, rconEnabled]);

    return (
        <div
            className='group relative inline-flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-[#ffffff06] border border-[#ffffff0e] hover:border-[#ffffff20] transition-all duration-150'
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {avatarUrl ? (
                <img src={avatarUrl} alt={player.name} width={20} height={20} className='rounded-sm' loading='lazy' />
            ) : (
                <span className='w-5 h-5 rounded-sm bg-green-500/20 flex items-center justify-center text-[8px] text-green-400 font-bold'>
                    {player.name.charAt(0).toUpperCase()}
                </span>
            )}
            <span className='text-xs text-zinc-300 font-medium'>{player.name}</span>

            {/* Hover tooltip */}
            {player.uuid && hovered && (
                <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10'>
                    <div className='bg-[#1a1a1a] border border-[#ffffff18] rounded-lg p-3 shadow-xl min-w-[200px]'>
                        <div className='flex items-center gap-2.5'>
                            <img
                                src={`https://crafatar.com/renders/head/${player.uuid}?overlay`}
                                alt={player.name}
                                width={40}
                                height={40}
                                className='rounded'
                                loading='lazy'
                            />
                            <div>
                                <p className='text-sm font-semibold text-white'>{player.name}</p>
                                {stats?.game_mode && (
                                    <p className='text-[10px] text-zinc-400'>{stats.game_mode}</p>
                                )}
                                <a
                                    href={`https://namemc.com/profile/${player.uuid}`}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className='text-[10px] text-blue-400 hover:underline'
                                >
                                    NameMC
                                </a>
                            </div>
                        </div>

                        {/* RCON Stats */}
                        {loadingStats && (
                            <div className='mt-2 pt-2 border-t border-[#ffffff0a]'>
                                <p className='text-[10px] text-zinc-500 animate-pulse'>Loading stats...</p>
                            </div>
                        )}

                        {stats && (
                            <div className='mt-2 pt-2 border-t border-[#ffffff0a] space-y-1.5'>
                                {stats.health !== null && (
                                    <div className='flex items-center justify-between gap-2'>
                                        <span className='text-[10px] text-zinc-500'>HP</span>
                                        <HealthBar health={stats.health} max={stats.max_health} />
                                    </div>
                                )}
                                {stats.food_level !== null && (
                                    <div className='flex items-center justify-between gap-2'>
                                        <span className='text-[10px] text-zinc-500'>Food</span>
                                        <FoodBar level={stats.food_level} />
                                    </div>
                                )}
                                {stats.xp_level !== null && (
                                    <div className='flex items-center justify-between'>
                                        <span className='text-[10px] text-zinc-500'>XP Level</span>
                                        <span className='text-[10px] text-green-400 font-medium'>{stats.xp_level}</span>
                                    </div>
                                )}
                                {stats.position && (
                                    <div className='flex items-center justify-between'>
                                        <span className='text-[10px] text-zinc-500'>Position</span>
                                        <span className='text-[10px] text-zinc-400 font-mono'>
                                            {stats.position.x}, {stats.position.y}, {stats.position.z}
                                        </span>
                                    </div>
                                )}
                                {stats.dimension && (
                                    <div className='flex items-center justify-between'>
                                        <span className='text-[10px] text-zinc-500'>Dimension</span>
                                        <span className='text-[10px] text-zinc-400'>{stats.dimension}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className='mt-2 pt-1.5 border-t border-[#ffffff08]'>
                            <p className='text-[9px] text-zinc-600 font-mono break-all'>{player.uuid}</p>
                        </div>
                    </div>
                    <div className='absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1a1a1a] border-r border-b border-[#ffffff18] rotate-45 -mt-1' />
                </div>
            )}
        </div>
    );
};

const PlayerList = () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const status = ServerContext.useStoreState((state) => state.status.value);

    const [data, setData] = useState<PlayerListData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchPlayers = () => {
        if (status !== 'running') {
            setData(null);
            setLoading(false);
            setError(false);
            return;
        }

        getPlayerList(uuid)
            .then((result) => {
                setData(result);
                setError(false);
            })
            .catch(() => {
                setError(true);
                setData(null);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchPlayers();
        const interval = setInterval(fetchPlayers, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [uuid, status]);

    return (
        <div className='flex flex-col gap-2'>
            <div className='flex items-center justify-between'>
                <h3 className='text-sm font-semibold text-white'>Connected Players</h3>
                {status === 'running' && !loading && !error && data && (
                    <span className='text-xs text-zinc-400'>
                        {data.online} / {data.max}
                    </span>
                )}
            </div>

            {status !== 'running' && <p className='text-xs text-zinc-500'>Server is offline.</p>}

            {status === 'running' && loading && (
                <p className='text-xs text-zinc-500 animate-pulse'>Querying server...</p>
            )}

            {status === 'running' && !loading && error && (
                <p className='text-xs text-zinc-500'>Unable to query server.</p>
            )}

            {status === 'running' && !loading && !error && data && (
                <>
                    {data.players.length === 0 ? (
                        <p className='text-xs text-zinc-500'>
                            {data.online === 0
                                ? 'No players online.'
                                : `${data.online} player(s) online (names not available).`}
                        </p>
                    ) : (
                        <div className='flex flex-wrap gap-1.5'>
                            {data.players.map((player) => (
                                <PlayerAvatar key={player.uuid || player.name} player={player} />
                            ))}
                        </div>
                    )}
                    <p className='text-[10px] text-zinc-600 mt-1'>{data.version} · refreshes every 30s</p>
                </>
            )}
        </div>
    );
};

export default PlayerList;
