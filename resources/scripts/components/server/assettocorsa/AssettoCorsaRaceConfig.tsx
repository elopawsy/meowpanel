import { useCallback, useEffect, useMemo, useState } from 'react';

import createDirectory from '@/api/server/files/createDirectory';
import getFileContents from '@/api/server/files/getFileContents';
import loadDirectory from '@/api/server/files/loadDirectory';
import saveFileContents from '@/api/server/files/saveFileContents';
import { httpErrorToHuman } from '@/api/http';
import AdvancedServerSettings from '@/components/server/assettocorsa/AdvancedServerSettings';
import CollapsibleSection from '@/components/server/assettocorsa/CollapsibleSection';
import DynamicTrackSettings from '@/components/server/assettocorsa/DynamicTrackSettings';
import EntryListEditor from '@/components/server/assettocorsa/EntryListEditor';
import { Field, SectionTitle, Toggle } from '@/components/server/assettocorsa/FormControls';
import ModThumbnail from '@/components/server/assettocorsa/ModThumbnail';
import PluginsTab from '@/components/server/assettocorsa/PluginsTab';
import SearchableSelect from '@/components/server/assettocorsa/SearchableSelect';
import TrackLayoutSelector from '@/components/server/assettocorsa/TrackLayoutSelector';
import WeatherSection from '@/components/server/assettocorsa/WeatherSection';
import {
    DEFAULT_SERVER_CFG,
    parseEntryList,
    parseIni,
    renumberSections,
    serializeEntryList,
    serializeIni,
    type EntrySlot,
    type IniData,
} from '@/components/server/assettocorsa/iniParser';
import { ServerContext } from '@/state/server';

type ConfigTab = 'server' | 'track' | 'sessions' | 'weather' | 'race' | 'entry' | 'plugins';

// ─── Allowed Cars Selector ──────────────────────────────────────────────────

const AllowedCarsSelector = ({
    installedCars,
    value,
    onChange,
}: {
    installedCars: string[];
    value: string;
    onChange: (v: string) => void;
}) => {
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState(false);

    const selected = useMemo(() => value.split(';').filter(Boolean), [value]);
    const filtered = useMemo(
        () => (search ? installedCars.filter((c) => c.toLowerCase().includes(search.toLowerCase())) : installedCars),
        [installedCars, search],
    );

    const toggle = (car: string) => {
        const next = selected.includes(car) ? selected.filter((c) => c !== car) : [...selected, car];
        onChange(next.join(';'));
    };

    return (
        <div className='flex flex-col gap-2'>
            <div className='flex items-center gap-3'>
                <span className='text-xs text-zinc-300'>
                    <span className='text-white font-semibold'>{selected.length}</span>
                    <span className='text-zinc-500'>/{installedCars.length} cars selected</span>
                </span>
                <button type='button' onClick={() => onChange(installedCars.join(';'))} className='text-[10px] px-2 py-0.5 rounded bg-[#ffffff0a] border border-[#ffffff12] text-zinc-400 hover:text-white transition-colors'>All</button>
                <button type='button' onClick={() => onChange('')} className='text-[10px] px-2 py-0.5 rounded bg-[#ffffff0a] border border-[#ffffff12] text-zinc-400 hover:text-white transition-colors'>None</button>
                <button type='button' onClick={() => setExpanded(!expanded)} className='text-[10px] px-2 py-0.5 rounded bg-[#ffffff0a] border border-[#ffffff12] text-zinc-400 hover:text-white transition-colors ml-auto'>
                    {expanded ? 'Collapse' : 'Edit selection'}
                </button>
            </div>
            {!expanded && selected.length > 0 && (
                <div className='flex flex-wrap gap-1'>
                    {selected.map((car) => (
                        <span key={car} className='inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-md text-[11px] bg-green-500/10 border border-green-500/20 text-green-300 font-mono'>
                            <ModThumbnail type='cars' name={car} className='w-5 h-5 rounded' />
                            {car}
                        </span>
                    ))}
                </div>
            )}
            {expanded && (
                <div className='bg-[#ffffff05] border border-[#ffffff0d] rounded-xl p-3'>
                    <input type='text' value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Search cars...' className='w-full px-3 py-1.5 mb-2 rounded-lg bg-[#ffffff08] border border-[#ffffff12] text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-blue-500' />
                    <div className='max-h-52 overflow-y-auto flex flex-col gap-0.5'>
                        {filtered.map((car) => {
                            const active = selected.includes(car);
                            return (
                                <button key={car} type='button' onClick={() => toggle(car)} className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-left transition-colors ${active ? 'bg-green-500/10 text-green-300' : 'text-zinc-400 hover:bg-[#ffffff08] hover:text-white'}`}>
                                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${active ? 'bg-green-500 border-green-500' : 'border-[#ffffff20]'}`}>
                                        {active && <svg width='10' height='10' viewBox='0 0 10 10' fill='none'><path d='M2 5L4 7L8 3' stroke='white' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' /></svg>}
                                    </span>
                                    <ModThumbnail type='cars' name={car} className='w-6 h-6 rounded shrink-0' />
                                    <span className='font-mono truncate'>{car}</span>
                                </button>
                            );
                        })}
                        {filtered.length === 0 && <p className='text-xs text-zinc-600 py-2 text-center'>No cars match "{search}"</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const AssettoCorsaRaceConfig = () => {
    const uuid = ServerContext.useStoreState((s) => s.server.data!.uuid);

    const [activeTab, setActiveTab] = useState<ConfigTab>('server');
    const [config, setConfig] = useState<IniData | null>(null);
    const [entryList, setEntryList] = useState<EntrySlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
    const [installedCars, setInstalledCars] = useState<string[]>([]);
    const [installedTracks, setInstalledTracks] = useState<string[]>([]);
    const [hasPlugins, setHasPlugins] = useState(false);

    const flash = (text: string, ok = true) => {
        setMsg({ text, ok });
        setTimeout(() => setMsg(null), 3000);
    };

    const loadAll = useCallback(async () => {
        setLoading(true);
        const [cfgRaw, entryRaw] = await Promise.allSettled([
            getFileContents(uuid, 'cfg/server_cfg.ini'),
            getFileContents(uuid, 'cfg/entry_list.ini'),
        ]);
        setConfig(cfgRaw.status === 'fulfilled' ? parseIni(cfgRaw.value) : { ...DEFAULT_SERVER_CFG });
        setEntryList(entryRaw.status === 'fulfilled' ? parseEntryList(entryRaw.value) : []);

        const [cars, tracks] = await Promise.allSettled([
            loadDirectory(uuid, '/content/cars'),
            loadDirectory(uuid, '/content/tracks'),
        ]);
        setInstalledCars(cars.status === 'fulfilled' ? cars.value.filter((f) => !f.isFile).map((f) => f.name) : []);
        setInstalledTracks(tracks.status === 'fulfilled' ? tracks.value.filter((f) => !f.isFile).map((f) => f.name) : []);

        // Detect plugins
        const [cspRes, cmRes] = await Promise.allSettled([
            getFileContents(uuid, 'cfg/csp_extra_options.ini'),
            getFileContents(uuid, 'cfg/ks_content_manager_wrapper.ini'),
        ]);
        setHasPlugins(cspRes.status === 'fulfilled' || cmRes.status === 'fulfilled');

        setLoading(false);
    }, [uuid]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const set = (section: string, key: string, value: string) =>
        setConfig((prev) => (prev ? { ...prev, [section]: { ...prev[section], [key]: value } } : prev));

    const get = (section: string, key: string, fallback = ''): string => config?.[section]?.[key] ?? fallback;

    const save = async () => {
        if (!config) return;
        setSaving(true);
        try {
            await createDirectory(uuid, '/', 'cfg').catch(() => {});
            await Promise.all([
                saveFileContents(uuid, 'cfg/server_cfg.ini', serializeIni(config)),
                saveFileContents(uuid, 'cfg/entry_list.ini', serializeEntryList(entryList)),
            ]);
            flash('Configuration saved.');
        } catch (e) {
            flash('Failed to save: ' + httpErrorToHuman(e), false);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className='text-xs text-zinc-500 animate-pulse'>Loading configuration...</p>;

    const tabs: { id: ConfigTab; label: string }[] = [
        { id: 'server', label: 'Server' },
        { id: 'track', label: 'Track & Cars' },
        { id: 'sessions', label: `Sessions` },
        { id: 'weather', label: 'Weather' },
        { id: 'race', label: 'Race' },
        { id: 'entry', label: `Entry List (${entryList.length})` },
        ...(hasPlugins ? [{ id: 'plugins' as ConfigTab, label: 'Plugins' }] : []),
    ];

    const currentTrack = get('SERVER', 'TRACK');
    const carsValue = get('SERVER', 'CARS');

    return (
        <div className='flex flex-col gap-2'>
            {msg && (
                <p className={`text-xs px-3 py-2 rounded-lg border ${msg.ok ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'}`}>
                    {msg.text}
                </p>
            )}

            {/* Tab bar */}
            <div className='flex gap-1 bg-[#ffffff06] border border-[#ffffff0d] rounded-xl p-1 w-fit mb-2 flex-wrap'>
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                            activeTab === t.id
                                ? 'bg-[#ffffff14] text-white border border-[#ffffff18]'
                                : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ─── Server Tab ─────────────────────────────────────── */}
            {activeTab === 'server' && (
                <>
                    <SectionTitle>Server</SectionTitle>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2'>
                        <Field label='Server Name' value={get('SERVER', 'NAME')} onChange={(v) => set('SERVER', 'NAME', v)} />
                        <Field label='Max Clients' type='number' value={get('SERVER', 'MAX_CLIENTS')} onChange={(v) => set('SERVER', 'MAX_CLIENTS', v)} />
                        <Field label='Password' type='password' value={get('SERVER', 'PASSWORD')} onChange={(v) => set('SERVER', 'PASSWORD', v)} hint='Leave empty for public' />
                        <Field label='Admin Password' type='password' value={get('SERVER', 'ADMIN_PASSWORD')} onChange={(v) => set('SERVER', 'ADMIN_PASSWORD', v)} />
                        <Field label='Welcome Message' value={get('SERVER', 'WELCOME_MESSAGE')} onChange={(v) => set('SERVER', 'WELCOME_MESSAGE', v)} />
                    </div>
                    <div className='mt-3'>
                        <CollapsibleSection title='Advanced Server Settings'>
                            <AdvancedServerSettings get={get} set={set} />
                        </CollapsibleSection>
                    </div>
                </>
            )}

            {/* ─── Track & Cars Tab ───────────────────────────────── */}
            {activeTab === 'track' && (
                <>
                    <SectionTitle>Track</SectionTitle>
                    <div className='flex gap-4 items-start'>
                        {currentTrack && (
                            <ModThumbnail type='tracks' name={currentTrack} className='w-48 h-28 rounded-xl shrink-0' />
                        )}
                        <div className='flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2'>
                            <div className='flex flex-col gap-1'>
                                <label className='text-xs text-zinc-400'>Track</label>
                                {installedTracks.length > 0 ? (
                                    <SearchableSelect options={installedTracks} value={currentTrack} onChange={(v) => set('SERVER', 'TRACK', v)} placeholder='Search tracks...' />
                                ) : (
                                    <input type='text' value={currentTrack} onChange={(e) => set('SERVER', 'TRACK', e.target.value)} placeholder='ks_nurburgring' className='bg-[#ffffff08] border border-[#ffffff12] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#ffffff30] font-mono placeholder:text-zinc-600' />
                                )}
                            </div>
                            <TrackLayoutSelector uuid={uuid} track={currentTrack} value={get('SERVER', 'CONFIG_TRACK')} onChange={(v) => set('SERVER', 'CONFIG_TRACK', v)} />
                        </div>
                    </div>

                    <SectionTitle>Allowed Cars</SectionTitle>
                    {installedCars.length > 0 ? (
                        <AllowedCarsSelector installedCars={installedCars} value={carsValue} onChange={(v) => set('SERVER', 'CARS', v)} />
                    ) : (
                        <Field label='Cars (semicolon-separated)' value={carsValue} onChange={(v) => set('SERVER', 'CARS', v)} hint='e.g. ks_ferrari_488_gt3;ks_porsche_911_gt3_r' />
                    )}
                </>
            )}

            {/* ─── Sessions Tab ───────────────────────────────────── */}
            {activeTab === 'sessions' && (
                <>
                    <SectionTitle>Sessions</SectionTitle>
                    <div className='flex flex-col gap-2'>
                        {Object.keys(config ?? {})
                            .filter((k) => k.startsWith('SESSION_'))
                            .sort((a, b) => parseInt(a.split('_')[1] ?? '0') - parseInt(b.split('_')[1] ?? '0'))
                            .map((sec) => (
                                <div key={sec} className='bg-[#ffffff05] border border-[#ffffff0d] rounded-xl p-3 flex flex-col gap-2'>
                                    <div className='flex items-center justify-between'>
                                        <span className='text-xs font-semibold text-zinc-300'>{get(sec, 'NAME') || sec}</span>
                                        <button type='button' onClick={() => setConfig((prev) => prev ? renumberSections(prev, 'SESSION_', sec) : prev)} className='text-[10px] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors'>Remove</button>
                                    </div>
                                    <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
                                        <Field label='Name' value={get(sec, 'NAME')} onChange={(v) => set(sec, 'NAME', v)} />
                                        <div className='flex flex-col gap-1'>
                                            <label className='text-xs text-zinc-400'>Type</label>
                                            <div className='flex gap-1'>
                                                <button type='button' onClick={() => setConfig((prev) => { if (!prev) return prev; const s = { ...prev[sec] }; delete s.LAPS; s.TIME = s.TIME || '15'; return { ...prev, [sec]: s }; })} className={`flex-1 px-2 py-1 text-[10px] rounded border transition-colors ${config?.[sec]?.TIME !== undefined && config?.[sec]?.LAPS === undefined ? 'bg-blue-600/20 border-blue-500/30 text-blue-300' : 'bg-[#ffffff06] border-[#ffffff10] text-zinc-400'}`}>Timed</button>
                                                <button type='button' onClick={() => setConfig((prev) => { if (!prev) return prev; const s = { ...prev[sec] }; delete s.TIME; s.LAPS = s.LAPS || '5'; return { ...prev, [sec]: s }; })} className={`flex-1 px-2 py-1 text-[10px] rounded border transition-colors ${config?.[sec]?.LAPS !== undefined ? 'bg-blue-600/20 border-blue-500/30 text-blue-300' : 'bg-[#ffffff06] border-[#ffffff10] text-zinc-400'}`}>Laps</button>
                                            </div>
                                        </div>
                                        {config?.[sec]?.LAPS !== undefined && <Field label='Laps' type='number' value={get(sec, 'LAPS')} onChange={(v) => set(sec, 'LAPS', v)} />}
                                        {config?.[sec]?.TIME !== undefined && config?.[sec]?.LAPS === undefined && <Field label='Time (min)' type='number' value={get(sec, 'TIME')} onChange={(v) => set(sec, 'TIME', v)} />}
                                        <Field label='Wait Time (s)' type='number' value={get(sec, 'WAIT_TIME')} onChange={(v) => set(sec, 'WAIT_TIME', v)} />
                                        <Toggle label='Open' value={get(sec, 'IS_OPEN')} onChange={(v) => set(sec, 'IS_OPEN', v)} />
                                    </div>
                                </div>
                            ))}
                        <button type='button' onClick={() => setConfig((prev) => { if (!prev) return prev; const c = Object.keys(prev).filter((k) => k.startsWith('SESSION_')).length; return { ...prev, [`SESSION_${c}`]: { NAME: c === 0 ? 'Practice' : c === 1 ? 'Qualifying' : 'Race', TIME: '15', IS_OPEN: '1', WAIT_TIME: '60' } }; })} className='px-3 py-1.5 rounded-lg text-xs font-medium bg-[#ffffff10] border border-[#ffffff18] text-white hover:bg-[#ffffff1a] transition-all duration-150 w-fit'>
                            + Add Session
                        </button>
                    </div>
                </>
            )}

            {/* ─── Weather Tab ────────────────────────────────────── */}
            {activeTab === 'weather' && config && (
                <>
                    <SectionTitle>Weather</SectionTitle>
                    <WeatherSection config={config} get={get} set={set} setConfig={setConfig} />
                </>
            )}

            {/* ─── Race Tab ───────────────────────────────────────── */}
            {activeTab === 'race' && (
                <>
                    <SectionTitle>Race Settings</SectionTitle>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2'>
                        <Field label='Damage Multiplier (%)' type='number' value={get('SERVER', 'DAMAGE_MULTIPLIER')} onChange={(v) => set('SERVER', 'DAMAGE_MULTIPLIER', v)} />
                        <Field label='Fuel Rate (%)' type='number' value={get('SERVER', 'FUEL_RATE')} onChange={(v) => set('SERVER', 'FUEL_RATE', v)} />
                        <Field label='Tyre Wear Rate (%)' type='number' value={get('SERVER', 'TYRE_WEAR_RATE')} onChange={(v) => set('SERVER', 'TYRE_WEAR_RATE', v)} />
                        <Field label='Sun Angle' type='number' value={get('SERVER', 'SUN_ANGLE')} onChange={(v) => set('SERVER', 'SUN_ANGLE', v)} hint='-80 (dawn) to 80 (dusk)' />
                    </div>

                    <SectionTitle>Driving Aids</SectionTitle>
                    <div className='grid grid-cols-2 md:grid-cols-3 gap-x-8 mt-1'>
                        <Toggle label='TC Allowed' value={get('SERVER', 'TC_ALLOWED')} onChange={(v) => set('SERVER', 'TC_ALLOWED', v)} />
                        <Toggle label='ABS Allowed' value={get('SERVER', 'ABS_ALLOWED')} onChange={(v) => set('SERVER', 'ABS_ALLOWED', v)} />
                        <Toggle label='Stability Control' value={get('SERVER', 'STABILITY_ALLOWED')} onChange={(v) => set('SERVER', 'STABILITY_ALLOWED', v)} />
                        <Toggle label='Autoclutch' value={get('SERVER', 'AUTOCLUTCH_ALLOWED')} onChange={(v) => set('SERVER', 'AUTOCLUTCH_ALLOWED', v)} />
                        <Toggle label='Tyre Blankets' value={get('SERVER', 'TYRE_BLANKETS_ALLOWED')} onChange={(v) => set('SERVER', 'TYRE_BLANKETS_ALLOWED', v)} />
                    </div>

                    <SectionTitle>Track Surface</SectionTitle>
                    <div className='grid grid-cols-2 md:grid-cols-3 gap-x-8'>
                        <Toggle label='Pickup Mode' value={get('SERVER', 'PICKUP_MODE_ENABLED')} onChange={(v) => set('SERVER', 'PICKUP_MODE_ENABLED', v)} />
                        <Toggle label='Loop Mode' value={get('SERVER', 'LOOP_MODE')} onChange={(v) => set('SERVER', 'LOOP_MODE', v)} />
                        <Toggle label='Register to Lobby' value={get('SERVER', 'REGISTER_TO_LOBBY')} onChange={(v) => set('SERVER', 'REGISTER_TO_LOBBY', v)} />
                        <Toggle label='Dynamic Track' value={get('SERVER', 'DYNAMIC_TRACK')} onChange={(v) => set('SERVER', 'DYNAMIC_TRACK', v)} />
                    </div>
                    {get('SERVER', 'DYNAMIC_TRACK') === '1' && <DynamicTrackSettings get={get} set={set} />}
                </>
            )}

            {/* ─── Entry List Tab ─────────────────────────────────── */}
            {activeTab === 'entry' && (
                <EntryListEditor slots={entryList} onChange={setEntryList} installedCars={installedCars} />
            )}

            {/* ─── Plugins Tab ────────────────────────────────────── */}
            {activeTab === 'plugins' && <PluginsTab uuid={uuid} />}

            {/* ─── Save Button ────────────────────────────────────── */}
            {activeTab !== 'plugins' && (
                <div className='flex justify-end pt-3'>
                    <button
                        onClick={save}
                        disabled={saving}
                        className='px-5 py-2 rounded-lg text-sm font-semibold bg-green-600/80 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all duration-150 border border-green-500/30'
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default AssettoCorsaRaceConfig;
