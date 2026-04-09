import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import createServerBackup from '@/api/server/backups/createServerBackup';
import Can from '@/components/elements/Can';
import { Dialog } from '@/components/elements/dialog';
import { PowerAction } from '@/components/server/console/ServerConsoleContainer';

import { ServerContext } from '@/state/server';

const BACKUP_BEFORE_RESTART_KEY = 'backup_before_restart:';

interface PowerButtonProps {
    className?: string;
}

const PowerButtons = ({ className }: PowerButtonProps) => {
    const [open, setOpen] = useState(false);
    const status = ServerContext.useStoreState((state) => state.status.value);
    const instance = ServerContext.useStoreState((state) => state.socket.instance);
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const serverId = ServerContext.useStoreState((state) => state.server.data!.id);

    const [backupBeforeRestart, setBackupBeforeRestart] = useState(() => {
        try {
            return localStorage.getItem(BACKUP_BEFORE_RESTART_KEY + serverId) === 'true';
        } catch {
            return false;
        }
    });
    const [backingUp, setBackingUp] = useState(false);

    const toggleBackupBeforeRestart = () => {
        const next = !backupBeforeRestart;
        setBackupBeforeRestart(next);
        localStorage.setItem(BACKUP_BEFORE_RESTART_KEY + serverId, String(next));
    };

    const killable = status === 'stopping';
    const onButtonClick = (
        action: PowerAction | 'kill-confirmed',
        e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    ): void => {
        e.preventDefault();
        if (action === 'kill') {
            return setOpen(true);
        }

        // If backup before restart is enabled and action is restart
        if (backupBeforeRestart && action === 'restart' && instance) {
            setBackingUp(true);
            toast.info('Creating backup before restart...');
createServerBackup(uuid, { name: `Pre-restart ${new Date().toISOString()}`, isLocked: false })
                .then(() => {
                    toast.success('Backup started. Restarting server...');
                    instance.send('set state', 'restart');
                })
                .catch(() => {
                    toast.error('Backup failed — restarting anyway.');
                    instance.send('set state', 'restart');
                })
                .finally(() => setBackingUp(false));
            return;
        }

        if (instance) {
            if (action === 'start') {
                toast.success('Your server is starting!');
            } else if (action === 'restart') {
                toast.success('Your server is restarting.');
            } else {
                toast.success('Your server is being stopped.');
            }
            setOpen(false);
            instance.send('set state', action === 'kill-confirmed' ? 'kill' : action);
        }
    };

    useEffect(() => {
        if (status === 'offline') {
            setOpen(false);
        }
    }, [status]);

    if (!status) {
        return null;
    }

    return (
        <div
            className={className}
            style={{
                animationTimingFunction:
                    'linear(0 0%, 0.01 0.8%, 0.04 1.6%, 0.161 3.3%, 0.816 9.4%, 1.046 11.9%, 1.189 14.4%, 1.231 15.7%, 1.254 17%, 1.259 17.8%, 1.257 18.6%, 1.236 20.45%, 1.194 22.3%, 1.057 27%, 0.999 29.4%, 0.955 32.1%, 0.942 33.5%, 0.935 34.9%, 0.933 36.65%, 0.939 38.4%, 1 47.3%, 1.011 49.95%, 1.017 52.6%, 1.016 56.4%, 1 65.2%, 0.996 70.2%, 1.001 87.2%, 1 100%)',
            }}
        >
            <Dialog.Confirm
                open={open}
                hideCloseIcon
                onClose={() => setOpen(false)}
                title={'Forcibly Stop Process'}
                confirm={'Continue'}
                onConfirmed={onButtonClick.bind(this, 'kill-confirmed')}
            >
                Forcibly stopping a server can lead to data corruption.
            </Dialog.Confirm>
            <Can action={'control.start'}>
                <button
                    style={
                        status === 'offline'
                            ? {
                                  background:
                                      'radial-gradient(109.26% 109.26% at 49.83% 13.37%, #FF343C 0%, #F06F53 100%)',
                                  opacity: 1,
                              }
                            : {
                                  background:
                                      'radial-gradient(124.75% 124.75% at 50.01% -10.55%, rgb(36, 36, 36) 0%, rgb(20, 20, 20) 100%)',
                                  opacity: 0.5,
                              }
                    }
                    className='px-8 py-3 border-[1px] border-[#ffffff12] rounded-l-full rounded-r-md text-sm font-bold shadow-md cursor-pointer'
                    disabled={status !== 'offline'}
                    onClick={onButtonClick.bind(this, 'start')}
                >
                    Start
                </button>
            </Can>
            <Can action={'control.restart'}>
                <button
                    style={{
                        background:
                            'radial-gradient(124.75% 124.75% at 50.01% -10.55%, rgb(36, 36, 36) 0%, rgb(20, 20, 20) 100%)',
                    }}
                    className='px-8 py-3 border-[1px] border-[#ffffff12] rounded-none text-sm font-bold shadow-md cursor-pointer'
                    disabled={!status}
                    onClick={onButtonClick.bind(this, 'restart')}
                >
                    Restart
                </button>
            </Can>
            <Can action={'control.stop'}>
                <button
                    style={
                        status === 'offline'
                            ? {
                                  background:
                                      'radial-gradient(124.75% 124.75% at 50.01% -10.55%, rgb(36, 36, 36) 0%, rgb(20, 20, 20) 100%)',
                                  opacity: 0.5,
                              }
                            : {
                                  background:
                                      'radial-gradient(109.26% 109.26% at 49.83% 13.37%, #FF343C 0%, #F06F53 100%)',
                                  opacity: 1,
                              }
                    }
                    className='px-8 py-3 border-[1px] border-[#ffffff12] rounded-r-full rounded-l-md text-sm font-bold shadow-md transition-all cursor-pointer'
                    disabled={status === 'offline'}
                    onClick={onButtonClick.bind(this, killable ? 'kill' : 'stop')}
                >
                    {killable ? 'Kill' : 'Stop'}
                </button>
            </Can>
            <Can action={'backup.create'}>
                <button
                    onClick={toggleBackupBeforeRestart}
                    title={backupBeforeRestart ? 'Backup before restart: ON' : 'Backup before restart: OFF'}
                    className={`ml-2 px-3 py-2 rounded-full border text-[10px] font-medium transition-all ${
                        backupBeforeRestart
                            ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                            : 'bg-[#ffffff06] border-[#ffffff12] text-zinc-500 hover:text-zinc-300'
                    } ${backingUp ? 'animate-pulse' : ''}`}
                >
                    {backingUp ? 'Backing up...' : backupBeforeRestart ? 'Backup+Restart' : 'Backup+Restart'}
                </button>
            </Can>
        </div>
    );
};

export default PowerButtons;
