import { useCallback, useEffect, useState } from 'react';

import { ServerContext } from '@/state/server';

interface QuickCommand {
    id: string;
    label: string;
    command: string;
}

const STORAGE_KEY_PREFIX = 'quick_commands:';

const DEFAULT_PRESETS: QuickCommand[] = [
    { id: 'save', label: 'Save', command: 'save-all' },
    { id: 'list', label: 'List', command: 'list' },
    { id: 'stop', label: 'Stop', command: 'stop' },
];

const QuickCommands = () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const status = ServerContext.useStoreState((state) => state.status.value);
    const instance = ServerContext.useStoreState((state) => state.socket.instance);

    const storageKey = STORAGE_KEY_PREFIX + uuid;

    const [commands, setCommands] = useState<QuickCommand[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [newCommand, setNewCommand] = useState('');
    const [flash, setFlash] = useState<string | null>(null);

    // Load from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                setCommands(JSON.parse(stored));
            } else {
                setCommands(DEFAULT_PRESETS);
            }
        } catch {
            setCommands(DEFAULT_PRESETS);
        }
    }, [storageKey]);

    // Persist to localStorage
    const persist = useCallback(
        (cmds: QuickCommand[]) => {
            setCommands(cmds);
            localStorage.setItem(storageKey, JSON.stringify(cmds));
        },
        [storageKey],
    );

    const sendCommand = (command: string) => {
        if (!instance || status !== 'running') return;
        instance.send('send command', command);
        setFlash(`Sent: ${command}`);
        setTimeout(() => setFlash(null), 2000);
    };

    const addCommand = () => {
        if (!newLabel.trim() || !newCommand.trim()) return;
        const cmd: QuickCommand = {
            id: Date.now().toString(36),
            label: newLabel.trim(),
            command: newCommand.trim(),
        };
        persist([...commands, cmd]);
        setNewLabel('');
        setNewCommand('');
        setShowAdd(false);
    };

    const removeCommand = (id: string) => {
        persist(commands.filter((c) => c.id !== id));
    };

    const isRunning = status === 'running';

    return (
        <div className='flex flex-col gap-2'>
            <div className='flex items-center justify-between'>
                <h3 className='text-sm font-semibold text-white'>Quick Commands</h3>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className='text-[10px] px-2 py-0.5 rounded bg-[#ffffff0a] border border-[#ffffff12] text-zinc-400 hover:text-white transition-colors'
                >
                    {showAdd ? 'Cancel' : '+ Add'}
                </button>
            </div>

            {flash && <p className='text-[10px] text-green-400 animate-pulse'>{flash}</p>}

            {showAdd && (
                <div className='flex gap-2 items-end'>
                    <div className='flex flex-col gap-0.5 flex-1'>
                        <label className='text-[10px] text-zinc-500'>Label</label>
                        <input
                            type='text'
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder='Whitelist'
                            className='px-2 py-1 rounded-md bg-[#ffffff0a] border border-[#ffffff12] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500'
                            onKeyDown={(e) => e.key === 'Enter' && addCommand()}
                        />
                    </div>
                    <div className='flex flex-col gap-0.5 flex-[2]'>
                        <label className='text-[10px] text-zinc-500'>Command</label>
                        <input
                            type='text'
                            value={newCommand}
                            onChange={(e) => setNewCommand(e.target.value)}
                            placeholder='whitelist add Steve'
                            className='px-2 py-1 rounded-md bg-[#ffffff0a] border border-[#ffffff12] text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-blue-500'
                            onKeyDown={(e) => e.key === 'Enter' && addCommand()}
                        />
                    </div>
                    <button
                        onClick={addCommand}
                        className='px-2.5 py-1 rounded-md bg-green-600/80 text-xs text-white hover:bg-green-600 transition-colors shrink-0'
                    >
                        Save
                    </button>
                </div>
            )}

            {commands.length === 0 ? (
                <p className='text-xs text-zinc-600'>No quick commands yet.</p>
            ) : (
                <div className='flex flex-wrap gap-1.5'>
                    {commands.map((cmd) => (
                        <div key={cmd.id} className='group relative'>
                            <button
                                onClick={() => sendCommand(cmd.command)}
                                disabled={!isRunning}
                                title={cmd.command}
                                className={`px-2.5 py-1 rounded-md text-xs border transition-all duration-150 ${
                                    isRunning
                                        ? 'bg-[#ffffff0a] border-[#ffffff12] text-zinc-300 hover:bg-[#ffffff14] hover:text-white'
                                        : 'bg-[#ffffff05] border-[#ffffff08] text-zinc-600 cursor-not-allowed'
                                }`}
                            >
                                {cmd.label}
                            </button>
                            <button
                                onClick={() => removeCommand(cmd.id)}
                                className='absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500/80 text-white text-[8px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'
                                title='Remove'
                            >
                                x
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {!isRunning && commands.length > 0 && (
                <p className='text-[10px] text-zinc-600'>Server must be running to send commands.</p>
            )}
        </div>
    );
};

export default QuickCommands;
