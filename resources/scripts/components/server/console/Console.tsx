import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { ITerminalOptions, Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import clsx from 'clsx';
import debounce from 'debounce';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import { SocketEvent, SocketRequest } from '@/components/server/events';

import { ServerContext } from '@/state/server';

import useEventListener from '@/plugins/useEventListener';
import { usePermissions } from '@/plugins/usePermissions';
import { usePersistedState } from '@/plugins/usePersistedState';

import styles from './style.module.css';

const theme = {
    // background: 'rgba(0, 0, 0, 0)',
    background: '#131313',
    cursor: 'transparent',
    black: '#000000',
    red: '#E54B4B',
    green: '#9ECE58',
    yellow: '#FAED70',
    blue: '#396FE2',
    magenta: '#BB80B3',
    cyan: '#2DDAFD',
    white: '#d0d0d0',
    brightBlack: 'rgba(255, 255, 255, 0.2)',
    brightRed: '#FF5370',
    brightGreen: '#C3E88D',
    brightYellow: '#FFCB6B',
    brightBlue: '#82AAFF',
    brightMagenta: '#C792EA',
    brightCyan: '#89DDFF',
    brightWhite: '#ffffff',
    selection: '#FAF089',
};

const terminalProps: ITerminalOptions = {
    disableStdin: true,
    cursorStyle: 'underline',
    allowTransparency: true,
    fontSize: window.innerWidth < 640 ? 11 : 12,
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    theme: theme,
};

const FILTER_PRESETS = [
    { label: 'Errors', pattern: 'error|exception|fatal|crash' },
    { label: 'Warnings', pattern: 'warn|warning' },
    { label: 'Players', pattern: 'joined|left|logged in|lost connection|connected' },
    { label: 'Chat', pattern: '<.*>|\\[chat\\]|says:' },
] as const;

const Console = () => {
    const TERMINAL_PRELUDE = '\u001b[1m\u001b[33mcontainer@:3~ \u001b[0m';
    const ref = useRef<HTMLDivElement>(null);
    const terminal = useMemo(
        () =>
            new Terminal({
                ...terminalProps,
                rows: window.innerWidth < 640 ? 20 : 25,
            }),
        [],
    );
    const fitAddon = useMemo(() => new FitAddon(), []);
    const searchAddon = useMemo(() => new SearchAddon(), []);
    const webLinksAddon = useMemo(() => new WebLinksAddon(), []);
    const [filterText, setFilterText] = useState('');
    const [showFilter, setShowFilter] = useState(false);
    const { connected, instance } = ServerContext.useStoreState((state) => state.socket);
    const [canSendCommands] = usePermissions(['control.console']);
    const serverId = ServerContext.useStoreState((state) => state.server.data!.id);
    const isTransferring = ServerContext.useStoreState((state) => state.server.data!.isTransferring);
    const [history, setHistory] = usePersistedState<string[]>(`${serverId}:command_history`, []);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const handleConsoleOutput = (line: string, prelude = false) =>
        terminal.writeln((prelude ? TERMINAL_PRELUDE : '') + line.replace(/(?:\r\n|\r|\n)$/im, '') + '\u001b[0m');

    const handleTransferStatus = (status: string) => {
        switch (status) {
            // Sent by either the source or target node if a failure occurs.
            case 'failure':
                terminal.writeln(TERMINAL_PRELUDE + 'Transfer has failed.\u001b[0m');
                return;
        }
    };

    const handleDaemonErrorOutput = (line: string) =>
        terminal.writeln(
            TERMINAL_PRELUDE + '\u001b[1m\u001b[41m' + line.replace(/(?:\r\n|\r|\n)$/im, '') + '\u001b[0m',
        );

    const handlePowerChangeEvent = (state: string) =>
        terminal.writeln(TERMINAL_PRELUDE + 'Server marked as ' + state + '...\u001b[0m');

    const searchDecorations = {
        matchOverviewRuler: '#5865F2',
        activeMatchColorOverviewRuler: '#57F287',
    };

    const clearFilter = useCallback(() => {
        setFilterText('');
        searchAddon.clearDecorations();
        setShowFilter(false);
    }, [searchAddon]);

    const find = useCallback(
        (text: string, direction: 'next' | 'previous') => {
            if (!text) return;
            const searchFn = direction === 'next' ? searchAddon.findNext : searchAddon.findPrevious;
            try {
                searchFn.call(searchAddon, text, { regex: true, caseSensitive: false, decorations: searchDecorations });
            } catch {
                searchFn.call(searchAddon, text, { regex: false, caseSensitive: false, decorations: searchDecorations });
            }
        },
        [searchAddon],
    );

    const applyFilter = useCallback(
        (text: string) => {
            if (!text) {
                searchAddon.clearDecorations();
                return;
            }
            find(text, 'next');
        },
        [searchAddon, find],
    );

    const handleFilterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') applyFilter(filterText);
        if (e.key === 'Escape') clearFilter();
    };

    const handleFilterNext = () => find(filterText, 'next');
    const handleFilterPrev = () => find(filterText, 'previous');

    const setPreset = (pattern: string) => {
        setFilterText(pattern);
        setShowFilter(true);
        requestAnimationFrame(() => applyFilter(pattern));
    };

    const handleCommandKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp') {
            const newIndex = Math.min(historyIndex + 1, history!.length - 1);

            setHistoryIndex(newIndex);
            e.currentTarget.value = history![newIndex] || '';

            // By default up arrow will also bring the cursor to the start of the line,
            // so we'll preventDefault to keep it at the end.
            e.preventDefault();
        }

        if (e.key === 'ArrowDown') {
            const newIndex = Math.max(historyIndex - 1, -1);

            setHistoryIndex(newIndex);
            e.currentTarget.value = history![newIndex] || '';
        }

        const command = e.currentTarget.value;
        if (e.key === 'Enter' && command.length > 0) {
            setHistory((prevHistory) => [command, ...prevHistory!].slice(0, 32));
            setHistoryIndex(-1);

            if (instance) instance.send('send command', command);
            e.currentTarget.value = '';
        }
    };

    useEffect(() => {
        if (connected && ref.current && !terminal.element) {
            terminal.loadAddon(fitAddon);
            terminal.loadAddon(searchAddon);
            terminal.loadAddon(webLinksAddon);

            terminal.open(ref.current);
            fitAddon.fit();

            // Add support for capturing keys
            terminal.attachCustomKeyEventHandler((e: KeyboardEvent) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                    document.execCommand('copy');
                    return false;
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                    e.preventDefault();
                    setShowFilter(true);
                    return false;
                } else if (e.key === 'Escape') {
                    clearFilter();
                }
                return true;
            });
        }
    }, [terminal, connected]);

    useEventListener(
        'resize',
        debounce(() => {
            if (terminal.element) {
                // Update font size based on window width
                const newFontSize = window.innerWidth < 640 ? 11 : 12;
                terminal.options.fontSize = newFontSize;
                fitAddon.fit();
            }
        }, 100),
    );

    useEffect(() => {
        const listeners: Record<string, (s: string) => void> = {
            [SocketEvent.STATUS]: handlePowerChangeEvent,
            [SocketEvent.CONSOLE_OUTPUT]: handleConsoleOutput,
            [SocketEvent.INSTALL_OUTPUT]: handleConsoleOutput,
            [SocketEvent.TRANSFER_LOGS]: handleConsoleOutput,
            [SocketEvent.TRANSFER_STATUS]: handleTransferStatus,
            [SocketEvent.DAEMON_MESSAGE]: (line) => handleConsoleOutput(line, true),
            [SocketEvent.DAEMON_ERROR]: handleDaemonErrorOutput,
        };

        if (connected && instance) {
            // Do not clear the console if the server is being transferred.
            if (!isTransferring) {
                terminal.clear();
            }

            Object.keys(listeners).forEach((key: string) => {
                const listener = listeners[key];
                if (listener === undefined) {
                    return;
                }

                instance.addListener(key, listener);
            });
            instance.send(SocketRequest.SEND_LOGS);
        }

        return () => {
            if (instance) {
                Object.keys(listeners).forEach((key: string) => {
                    const listener = listeners[key];
                    if (listener === undefined) {
                        return;
                    }

                    instance.removeListener(key, listener);
                });
            }
        };
    }, [connected, instance]);

    return (
        <div className='bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border-[1px] border-[#ffffff12] rounded-xl hover:border-[#ffffff20] transition-all duration-150 overflow-hidden shadow-sm'>
            <div className='relative'>
                <SpinnerOverlay visible={!connected} size={'large'} />
                {/* Filter bar */}
                <div className='flex items-center gap-1.5 px-3 py-1.5 bg-[#0f0f0f] border-b border-[#ffffff0a]'>
                    <div className='flex gap-1'>
                        {FILTER_PRESETS.map((preset) => (
                            <button
                                key={preset.label}
                                onClick={() => setPreset(preset.pattern)}
                                className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                                    filterText === preset.pattern
                                        ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                                        : 'bg-[#ffffff06] border-[#ffffff0e] text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                    {showFilter && (
                        <div className='flex items-center gap-1 ml-auto'>
                            <input
                                type='text'
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                onKeyDown={handleFilterKeyDown}
                                placeholder='Filter (regex)...'
                                autoFocus
                                className='w-40 px-2 py-0.5 text-[11px] rounded bg-[#ffffff08] border border-[#ffffff12] text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-blue-500'
                            />
                            <button onClick={handleFilterPrev} className='px-1.5 py-0.5 text-[10px] rounded bg-[#ffffff08] border border-[#ffffff0e] text-zinc-400 hover:text-white' title='Previous match'>&#9650;</button>
                            <button onClick={handleFilterNext} className='px-1.5 py-0.5 text-[10px] rounded bg-[#ffffff08] border border-[#ffffff0e] text-zinc-400 hover:text-white' title='Next match'>&#9660;</button>
                            <button
                                onClick={clearFilter}
                                className='px-1.5 py-0.5 text-[10px] rounded bg-[#ffffff08] border border-[#ffffff0e] text-zinc-400 hover:text-red-400'
                                title='Clear filter'
                            >&#10005;</button>
                        </div>
                    )}
                    {!showFilter && (
                        <button
                            onClick={() => setShowFilter(true)}
                            className='ml-auto text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors'
                            title='Ctrl+F'
                        >
                            Search
                        </button>
                    )}
                </div>
                <div className='bg-[#131313] min-h-[280px] sm:min-h-[380px] p-3 sm:p-4 font-mono overflow-hidden'>
                    <div className='h-full w-full'>
                        <div ref={ref} className='h-full w-full' />
                    </div>
                </div>
                {canSendCommands && (
                    <div className='relative border-t-[1px] border-[#ffffff11] bg-[#0f0f0f]'>
                        <input
                            className='w-full bg-transparent px-3 py-2.5 sm:px-4 sm:py-3 font-mono text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 border-0 outline-none focus:ring-0 focus:outline-none focus:bg-[#1a1a1a] transition-colors duration-150'
                            type='text'
                            placeholder='Enter a command...'
                            aria-label='Console command input.'
                            disabled={!instance || !connected}
                            onKeyDown={handleCommandKeyDown}
                            autoCorrect='off'
                            autoCapitalize='none'
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Console;
