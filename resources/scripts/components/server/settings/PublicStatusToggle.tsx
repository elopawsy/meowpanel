import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { httpErrorToHuman } from '@/api/http';
import { getPublicStatus, togglePublicStatus } from '@/api/server/togglePublicStatus';
import { ServerContext } from '@/state/server';

const PublicStatusToggle = () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const uuidShort = uuid.substring(0, 8);
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getPublicStatus(uuid)
            .then(setEnabled)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [uuid]);

    const handleToggle = async () => {
        setLoading(true);
        try {
            const newState = await togglePublicStatus(uuid);
            setEnabled(newState);
            toast.success(newState ? 'Public status page enabled.' : 'Public status page disabled.');
        } catch (error) {
            toast.error(httpErrorToHuman(error));
        } finally {
            setLoading(false);
        }
    };

    const statusUrl = `${window.location.origin}/status/${uuidShort}`;

    return (
        <div className='bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border border-[#ffffff12] rounded-xl p-4'>
            <div className='flex items-center justify-between'>
                <div>
                    <h3 className='text-sm font-semibold text-white'>Public Status Page</h3>
                    <p className='text-xs text-zinc-500 mt-0.5'>
                        Share a public page showing this server's online status and players.
                    </p>
                </div>
                <button
                    onClick={handleToggle}
                    disabled={loading}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                        loading ? 'opacity-50' : ''
                    } ${enabled ? 'bg-green-500' : 'bg-[#ffffff20]'}`}
                >
                    <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                            enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                </button>
            </div>

            {enabled && (
                <div className='mt-3 pt-3 border-t border-[#ffffff0a]'>
                    <p className='text-[11px] text-zinc-500 mb-1'>Public URL:</p>
                    <a
                        href={statusUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-xs text-blue-400 hover:underline font-mono break-all'
                    >
                        {statusUrl}
                    </a>
                </div>
            )}
        </div>
    );
};

export default PublicStatusToggle;
