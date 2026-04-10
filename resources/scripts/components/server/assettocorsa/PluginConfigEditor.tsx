import { useCallback, useEffect, useState } from 'react';

import getFileContents from '@/api/server/files/getFileContents';
import saveFileContents from '@/api/server/files/saveFileContents';
import { httpErrorToHuman } from '@/api/http';
import { Field } from '@/components/server/assettocorsa/FormControls';
import { type IniData, parseIni, serializeIni } from '@/components/server/assettocorsa/iniParser';

interface PluginConfigEditorProps {
    uuid: string;
    filePath: string;
    title: string;
    description: string;
    templates?: { label: string; section: string; defaults: Record<string, string> }[];
}

const PluginConfigEditor = ({ uuid, filePath, title, description, templates }: PluginConfigEditorProps) => {
    const [config, setConfig] = useState<IniData | null>(null);
    const [rawMode, setRawMode] = useState(false);
    const [rawText, setRawText] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
    const [newSection, setNewSection] = useState('');

    const flash = (text: string, ok = true) => {
        setMsg({ text, ok });
        setTimeout(() => setMsg(null), 3000);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const raw = await getFileContents(uuid, filePath);
            setConfig(parseIni(raw));
            setRawText(raw);
        } catch {
            setConfig({});
            setRawText('');
        }
        setLoading(false);
    }, [uuid, filePath]);

    useEffect(() => {
        load();
    }, [load]);

    const save = async () => {
        setSaving(true);
        try {
            const content = rawMode ? rawText : serializeIni(config ?? {});
            await saveFileContents(uuid, filePath, content);
            if (rawMode) setConfig(parseIni(rawText));
            flash('Saved.');
        } catch (e) {
            flash(httpErrorToHuman(e), false);
        }
        setSaving(false);
    };

    const setVal = (section: string, key: string, value: string) => {
        setConfig((prev) => (prev ? { ...prev, [section]: { ...prev[section], [key]: value } } : prev));
    };

    const removeKey = (section: string, key: string) => {
        setConfig((prev) => {
            if (!prev?.[section]) return prev;
            const s = { ...prev[section] };
            delete s[key];
            return { ...prev, [section]: Object.keys(s).length > 0 ? s : prev[section] };
        });
    };

    const removeSection = (section: string) => {
        setConfig((prev) => {
            if (!prev) return prev;
            const next = { ...prev };
            delete next[section];
            return next;
        });
    };

    const addSection = () => {
        if (!newSection.trim()) return;
        const name = newSection.trim().toUpperCase();
        setConfig((prev) => ({ ...prev, [name]: {} }));
        setNewSection('');
    };

    const addKey = (section: string) => {
        const key = prompt('Key name:');
        if (!key?.trim()) return;
        setVal(section, key.trim().toUpperCase(), '');
    };

    const addTemplate = (tpl: { section: string; defaults: Record<string, string> }) => {
        setConfig((prev) => ({ ...prev, [tpl.section]: { ...(prev?.[tpl.section] ?? {}), ...tpl.defaults } }));
    };

    if (loading) return <p className='text-xs text-zinc-500 animate-pulse'>Loading {title}...</p>;

    const sections = Object.keys(config ?? {});

    return (
        <div className='bg-[#ffffff05] border border-[#ffffff0d] rounded-xl p-4 flex flex-col gap-3'>
            <div className='flex items-center justify-between'>
                <div>
                    <h3 className='text-sm font-semibold text-white'>{title}</h3>
                    <p className='text-[11px] text-zinc-500'>{description}</p>
                </div>
                <div className='flex gap-1.5'>
                    <button
                        type='button'
                        onClick={() => {
                            if (!rawMode) setRawText(serializeIni(config ?? {}));
                            else setConfig(parseIni(rawText));
                            setRawMode(!rawMode);
                        }}
                        className='text-[10px] px-2 py-0.5 rounded bg-[#ffffff0a] border border-[#ffffff12] text-zinc-400 hover:text-white transition-colors'
                    >
                        {rawMode ? 'Visual' : 'Raw'}
                    </button>
                    <button
                        type='button'
                        onClick={save}
                        disabled={saving}
                        className='text-[10px] px-2 py-0.5 rounded bg-green-600/80 text-white hover:bg-green-600 disabled:opacity-50 transition-colors'
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            {msg && (
                <p className={`text-[11px] px-2 py-1 rounded ${msg.ok ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                    {msg.text}
                </p>
            )}

            {rawMode ? (
                <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    rows={16}
                    className='w-full px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[#ffffff12] text-xs text-white font-mono focus:outline-none focus:border-blue-500 resize-y'
                    spellCheck={false}
                />
            ) : (
                <>
                    {/* Quick-add templates */}
                    {templates && templates.some((t) => !sections.includes(t.section)) && (
                        <div className='flex flex-wrap gap-1.5'>
                            {templates
                                .filter((t) => !sections.includes(t.section))
                                .map((t) => (
                                    <button
                                        key={t.section}
                                        type='button'
                                        onClick={() => addTemplate(t)}
                                        className='text-[10px] px-2 py-1 rounded bg-blue-600/10 border border-blue-500/20 text-blue-300 hover:bg-blue-600/20 transition-colors'
                                    >
                                        + {t.label}
                                    </button>
                                ))}
                        </div>
                    )}

                    {sections.length === 0 ? (
                        <p className='text-xs text-zinc-600 py-3 text-center'>No sections. Add one or use a template above.</p>
                    ) : (
                        sections.map((sec) => (
                            <div key={sec} className='bg-[#ffffff04] border border-[#ffffff0a] rounded-lg p-2.5'>
                                <div className='flex items-center justify-between mb-2'>
                                    <span className='text-xs font-semibold text-zinc-300 font-mono'>[{sec}]</span>
                                    <div className='flex gap-1'>
                                        <button
                                            type='button'
                                            onClick={() => addKey(sec)}
                                            className='text-[9px] px-1.5 py-0.5 rounded bg-[#ffffff08] border border-[#ffffff12] text-zinc-400 hover:text-white transition-colors'
                                        >
                                            + Key
                                        </button>
                                        <button
                                            type='button'
                                            onClick={() => removeSection(sec)}
                                            className='text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors'
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                                <div className='grid grid-cols-1 md:grid-cols-2 gap-1.5'>
                                    {Object.entries(config?.[sec] ?? {}).map(([key, val]) => (
                                        <div key={key} className='flex items-end gap-1'>
                                            <div className='flex-1'>
                                                <Field label={key} value={val} onChange={(v) => setVal(sec, key, v)} />
                                            </div>
                                            <button
                                                type='button'
                                                onClick={() => removeKey(sec, key)}
                                                className='mb-0.5 text-[9px] px-1 py-1 rounded text-zinc-600 hover:text-red-400 transition-colors'
                                                title='Remove key'
                                            >
                                                x
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}

                    {/* Add section */}
                    <div className='flex gap-2 items-end'>
                        <input
                            type='text'
                            value={newSection}
                            onChange={(e) => setNewSection(e.target.value)}
                            placeholder='NEW_SECTION'
                            onKeyDown={(e) => e.key === 'Enter' && addSection()}
                            className='px-2 py-1 rounded-md bg-[#ffffff08] border border-[#ffffff12] text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-blue-500'
                        />
                        <button
                            type='button'
                            onClick={addSection}
                            className='text-[10px] px-2 py-1 rounded bg-[#ffffff10] border border-[#ffffff18] text-white hover:bg-[#ffffff1a] transition-colors'
                        >
                            + Section
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default PluginConfigEditor;
