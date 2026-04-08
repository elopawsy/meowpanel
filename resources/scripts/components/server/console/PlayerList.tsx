import { useEffect, useState } from 'react';

import getPlayerList, { type PlayerListData } from '@/api/server/getPlayerList';
import { ServerContext } from '@/state/server';

const REFRESH_INTERVAL = 30_000;

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

            {status !== 'running' && (
                <p className='text-xs text-zinc-500'>Server is offline.</p>
            )}

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
                            {data.online === 0 ? 'No players online.' : `${data.online} player(s) online (names not available).`}
                        </p>
                    ) : (
                        <div className='flex flex-wrap gap-1.5'>
                            {data.players.map((name) => (
                                <span
                                    key={name}
                                    className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-[#ffffff0a] border border-[#ffffff12] text-zinc-300'
                                >
                                    <span className='w-1.5 h-1.5 rounded-full bg-green-400 inline-block' />
                                    {name}
                                </span>
                            ))}
                        </div>
                    )}
                    <p className='text-[10px] text-zinc-600 mt-1'>
                        {data.version} · refreshes every 30s
                    </p>
                </>
            )}
        </div>
    );
};

export default PlayerList;
