import { useCallback, useEffect, useState } from 'react';

import {
    WEBHOOK_EVENTS,
    createWebhook,
    deleteWebhook,
    getWebhooks,
    testWebhook,
    updateWebhook,
    type WebhookConfiguration,
} from '@/api/server/webhooks';
import { ServerContext } from '@/state/server';

const WebhookContainer = () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);

    const [webhooks, setWebhooks] = useState<WebhookConfiguration[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [flash, setFlash] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formUrl, setFormUrl] = useState('');
    const [formEvents, setFormEvents] = useState<string[]>([]);

    const fetchWebhooks = useCallback(() => {
        getWebhooks(uuid)
            .then(setWebhooks)
            .catch(() => setFlash({ type: 'error', message: 'Failed to load webhooks.' }))
            .finally(() => setLoading(false));
    }, [uuid]);

    useEffect(() => {
        fetchWebhooks();
    }, [fetchWebhooks]);

    useEffect(() => {
        if (!flash) return undefined;
        const timer = setTimeout(() => setFlash(null), 4000);
        return () => clearTimeout(timer);
    }, [flash]);

    const handleCreate = async () => {
        if (!formName || !formUrl || formEvents.length === 0) {
            setFlash({ type: 'error', message: 'Name, URL, and at least one event are required.' });
            return;
        }
        try {
            await createWebhook(uuid, { name: formName, url: formUrl, events: formEvents });
            setFormName('');
            setFormUrl('');
            setFormEvents([]);
            setShowForm(false);
            setFlash({ type: 'success', message: 'Webhook created.' });
            fetchWebhooks();
        } catch {
            setFlash({ type: 'error', message: 'Failed to create webhook.' });
        }
    };

    const handleToggle = async (webhook: WebhookConfiguration) => {
        try {
            await updateWebhook(uuid, webhook.id, { enabled: !webhook.enabled });
            setFlash({ type: 'success', message: `Webhook ${webhook.enabled ? 'disabled' : 'enabled'}.` });
            fetchWebhooks();
        } catch {
            setFlash({ type: 'error', message: 'Failed to update webhook.' });
        }
    };

    const handleDelete = async (webhook: WebhookConfiguration) => {
        if (!confirm(`Delete webhook "${webhook.name}"?`)) return;
        try {
            await deleteWebhook(uuid, webhook.id);
            setFlash({ type: 'success', message: 'Webhook deleted.' });
            fetchWebhooks();
        } catch {
            setFlash({ type: 'error', message: 'Failed to delete webhook.' });
        }
    };

    const handleTest = async (webhook: WebhookConfiguration) => {
        try {
            const success = await testWebhook(uuid, webhook.id);
            setFlash({
                type: success ? 'success' : 'error',
                message: success ? 'Test notification sent!' : 'Test failed — check the webhook URL.',
            });
        } catch {
            setFlash({ type: 'error', message: 'Test request failed.' });
        }
    };

    const toggleEvent = (event: string) => {
        setFormEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]));
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center p-8'>
                <p className='text-sm text-zinc-400 animate-pulse'>Loading webhooks...</p>
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-4 p-4'>
            <div className='flex items-center justify-between'>
                <h2 className='text-lg font-semibold text-white'>Discord Webhooks</h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className='px-3 py-1.5 text-sm rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors'
                >
                    {showForm ? 'Cancel' : 'New Webhook'}
                </button>
            </div>

            {flash && (
                <div
                    className={`px-3 py-2 rounded-md text-sm ${
                        flash.type === 'success'
                            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                            : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}
                >
                    {flash.message}
                </div>
            )}

            {showForm && (
                <div className='flex flex-col gap-3 p-4 rounded-lg bg-[#ffffff06] border border-[#ffffff12]'>
                    <input
                        type='text'
                        placeholder='Webhook name'
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className='px-3 py-2 rounded-md bg-[#ffffff0a] border border-[#ffffff12] text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500'
                    />
                    <input
                        type='url'
                        placeholder='https://discord.com/api/webhooks/...'
                        value={formUrl}
                        onChange={(e) => setFormUrl(e.target.value)}
                        className='px-3 py-2 rounded-md bg-[#ffffff0a] border border-[#ffffff12] text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500'
                    />
                    <div>
                        <p className='text-xs text-zinc-400 mb-2'>Events:</p>
                        <div className='flex flex-wrap gap-2'>
                            {WEBHOOK_EVENTS.map((evt) => (
                                <button
                                    key={evt.value}
                                    onClick={() => toggleEvent(evt.value)}
                                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                                        formEvents.includes(evt.value)
                                            ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                                            : 'bg-[#ffffff0a] border-[#ffffff12] text-zinc-400 hover:text-zinc-300'
                                    }`}
                                >
                                    {evt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={handleCreate}
                        className='self-end px-4 py-1.5 text-sm rounded-md bg-green-600 hover:bg-green-500 text-white transition-colors'
                    >
                        Create
                    </button>
                </div>
            )}

            {webhooks.length === 0 && !showForm ? (
                <p className='text-sm text-zinc-500 text-center py-8'>
                    No webhooks configured. Create one to get Discord notifications for server events.
                </p>
            ) : (
                <div className='flex flex-col gap-2'>
                    {webhooks.map((wh) => (
                        <div
                            key={wh.id}
                            className='flex items-center justify-between gap-3 p-3 rounded-lg bg-[#ffffff06] border border-[#ffffff12]'
                        >
                            <div className='flex-1 min-w-0'>
                                <div className='flex items-center gap-2'>
                                    <span
                                        className={`w-2 h-2 rounded-full ${wh.enabled ? 'bg-green-400' : 'bg-zinc-600'}`}
                                    />
                                    <span className='text-sm font-medium text-white truncate'>{wh.name}</span>
                                </div>
                                <div className='flex flex-wrap gap-1 mt-1.5'>
                                    {wh.events.map((evt) => (
                                        <span
                                            key={evt}
                                            className='px-1.5 py-0.5 text-[10px] rounded bg-[#ffffff0a] text-zinc-400'
                                        >
                                            {WEBHOOK_EVENTS.find((e) => e.value === evt)?.label ?? evt}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className='flex items-center gap-1.5'>
                                <button
                                    onClick={() => handleTest(wh)}
                                    className='px-2 py-1 text-xs rounded bg-[#ffffff0a] border border-[#ffffff12] text-zinc-400 hover:text-white transition-colors'
                                    title='Send test notification'
                                >
                                    Test
                                </button>
                                <button
                                    onClick={() => handleToggle(wh)}
                                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                                        wh.enabled
                                            ? 'bg-yellow-600/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-600/20'
                                            : 'bg-green-600/10 border-green-500/20 text-green-400 hover:bg-green-600/20'
                                    }`}
                                >
                                    {wh.enabled ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                    onClick={() => handleDelete(wh)}
                                    className='px-2 py-1 text-xs rounded bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 transition-colors'
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WebhookContainer;
