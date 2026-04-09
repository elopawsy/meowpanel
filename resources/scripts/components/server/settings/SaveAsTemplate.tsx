import { useState } from 'react';

import { createTemplateFromServer } from '@/api/server/templates';
import { ServerContext } from '@/state/server';

const SaveAsTemplate = () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const serverName = ServerContext.useStoreState((state) => state.server.data!.name);

    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [flash, setFlash] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleSave = async () => {
        if (!name.trim()) {
            setFlash({ type: 'error', message: 'Template name is required.' });
            return;
        }

        setSaving(true);
        try {
            await createTemplateFromServer(uuid, {
                name: name.trim(),
                description: description.trim() || undefined,
            });
            setFlash({ type: 'success', message: 'Template saved! You can find it in the templates list.' });
            setName('');
            setDescription('');
            setShowForm(false);
        } catch {
            setFlash({ type: 'error', message: 'Failed to save template.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className='bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border border-[#ffffff12] rounded-xl p-4'>
            <div className='flex items-center justify-between'>
                <div>
                    <h3 className='text-sm font-semibold text-white'>Server Template</h3>
                    <p className='text-xs text-zinc-500 mt-0.5'>
                        Save this server's configuration as a reusable template.
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className='px-3 py-1.5 text-xs rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors'
                >
                    {showForm ? 'Cancel' : 'Save as Template'}
                </button>
            </div>

            {flash && (
                <div
                    className={`mt-3 px-3 py-2 rounded-md text-xs ${
                        flash.type === 'success'
                            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                            : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}
                >
                    {flash.message}
                </div>
            )}

            {showForm && (
                <div className='mt-3 flex flex-col gap-2'>
                    <input
                        type='text'
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={`${serverName} Template`}
                        className='px-3 py-2 rounded-md bg-[#ffffff0a] border border-[#ffffff12] text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500'
                    />
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder='Optional description...'
                        rows={2}
                        className='px-3 py-2 rounded-md bg-[#ffffff0a] border border-[#ffffff12] text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none'
                    />
                    <div className='flex justify-end'>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className='px-4 py-1.5 text-xs rounded-md bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white transition-colors'
                        >
                            {saving ? 'Saving...' : 'Create Template'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SaveAsTemplate;
