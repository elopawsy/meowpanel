import { useState } from 'react';

import { ServerContext } from '@/state/server';

import { usePersistedState } from '@/plugins/usePersistedState';

interface Props {
    onSend: (command: string) => void;
}

const CommandHistory = ({ onSend }: Props) => {
    const serverId = ServerContext.useStoreState((state) => state.server.data!.id);
    const status = ServerContext.useStoreState((state) => state.status.value);
    const [history, setHistory] = usePersistedState<string[]>(`${serverId}:command_history`, []);
    const [expanded, setExpanded] = useState(false);

    const isRunning = status === 'running';

    const clearHistory = () => {
        setHistory([]);
    };

    if (!history || history.length === 0) {
        return null;
    }

    // Deduplicate while preserving order (most recent first)
    const unique = [...new Set(history)];
    const displayed = expanded ? unique : unique.slice(0, 8);

    return (
        <div className='flex flex-col gap-1.5'>
            <div className='flex items-center justify-between'>
                <h3 className='text-sm font-semibold text-white'>Command History</h3>
                <div className='flex gap-1.5'>
                    {unique.length > 8 && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className='text-[10px] px-2 py-0.5 rounded bg-[#ffffff0a] border border-[#ffffff12] text-zinc-400 hover:text-white transition-colors'
                        >
                            {expanded ? 'Show less' : `Show all (${unique.length})`}
                        </button>
                    )}
                    <button
                        onClick={clearHistory}
                        className='text-[10px] px-2 py-0.5 rounded bg-[#ffffff0a] border border-[#ffffff12] text-zinc-500 hover:text-red-400 transition-colors'
                    >
                        Clear
                    </button>
                </div>
            </div>
            <div className='flex flex-wrap gap-1'>
                {displayed.map((cmd, i) => (
                    <button
                        key={`${cmd}-${i}`}
                        onClick={() => onSend(cmd)}
                        disabled={!isRunning}
                        title={isRunning ? `Send: ${cmd}` : 'Server must be running'}
                        className={`px-2 py-0.5 rounded text-xs font-mono border transition-all ${
                            isRunning
                                ? 'bg-[#ffffff06] border-[#ffffff0e] text-zinc-400 hover:bg-[#ffffff10] hover:text-white'
                                : 'bg-[#ffffff03] border-[#ffffff08] text-zinc-600 cursor-not-allowed'
                        }`}
                    >
                        {cmd}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CommandHistory;
