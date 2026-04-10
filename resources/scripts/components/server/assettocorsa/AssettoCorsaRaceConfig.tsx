import { useCallback, useEffect, useMemo, useState } from 'react';

import createDirectory from '@/api/server/files/createDirectory';
import getFileContents from '@/api/server/files/getFileContents';
import loadDirectory from '@/api/server/files/loadDirectory';
import saveFileContents from '@/api/server/files/saveFileContents';
import { httpErrorToHuman } from '@/api/http';
import ActionButton from '@/components/elements/ActionButton';
import AdvancedServerSettings from '@/components/server/assettocorsa/AdvancedServerSettings';
import CollapsibleSection from '@/components/server/assettocorsa/CollapsibleSection';
import DynamicTrackSettings from '@/components/server/assettocorsa/DynamicTrackSettings';
import EntryListEditor from '@/components/server/assettocorsa/EntryListEditor';
import { Field, Toggle } from '@/components/server/assettocorsa/FormControls';
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
        <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-3'>
                <span className='text-sm text-[#ffffff77]'>
                    <span className='text-white font-extrabold'>{selected.length}</span>
                    <span>/{installedCars.length} cars selected</span>
                </span>
                <ActionButton size='sm' variant='secondary' onClick={() => onChange(installedCars.join(';'))}>All</ActionButton>
                <ActionButton size='sm' variant='secondary' onClick={() => onChange('')}>None</ActionButton>
                <div className='ml-auto'>
                    <ActionButton size='sm' variant='secondary' onClick={() => setExpanded(!expanded)}>
                        {expanded ? 'Collapse' : 'Edit selection'}
                    </ActionButton>
                </div>
            </div>
            {!expanded && selected.length > 0 && (
                <div className='flex flex-wrap gap-1.5'>
                    {selected.map((car) => (
                        <span key={car} className='inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-lg text-xs bg-brand/10 border border-brand/20 text-white font-mono'>
                            <ModThumbnail type='cars' name={car} className='w-5 h-5 rounded' />
                            {car}
                        </span>
                    ))}
                </div>
            )}
            {expanded && (
                <div className='rounded-xl shadow-md border-[1px] border-[#ffffff07] bg-[#ffffff08] p-6'>
                    <input type='text' value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Search cars...' className='w-full px-4 py-2 mb-3 rounded-lg bg-[#ffffff17] text-sm outline-hidden font-mono' />
                    <div className='max-h-64 overflow-y-auto flex flex-col gap-1'>
                        {filtered.map((car) => {
                            const active = selected.includes(car);
                            return (
                                <button key={car} type='button' onClick={() => toggle(car)} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors ${active ? 'bg-brand/10 text-white' : 'text-[#ffffff88] hover:bg-[#ffffff11]'}`}>
                                    <span className={`w-5 h-5 rounded border-[1px] flex items-center justify-center shrink-0 ${active ? 'bg-brand border-brand' : 'border-[#ffffff20]'}`}>
                                        {active && <svg width='12' height='12' viewBox='0 0 10 10' fill='none'><path d='M2 5L4 7L8 3' stroke='white' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' /></svg>}
                                    </span>
                                    <ModThumbnail type='cars' name={car} className='w-7 h-7 rounded shrink-0' />
                                    <span className='font-mono truncate'>{car}</span>
                                </button>
                            );
                        })}
                        {filtered.length === 0 && <p className='text-sm text-[#ffffff44] py-4 text-center'>No cars match "{search}"</p>}
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

        const [cspRes, cmRes] = await Promise.allSettled([
            getFileContents(uuid, 'cfg/csp_extra_options.ini'),
            getFileContents(uuid, 'cfg/ks_content_manager_wrapper.ini'),
        ]);
        setHasPlugins(cspRes.status === 'fulfilled' || cmRes.status === 'fulfilled');

        setLoading(false);
    }, [uuid]);

    useEffect(() => { loadAll(); }, [loadAll]);

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

    if (loading) return <p className='text-sm text-[#ffffff44] animate-pulse'>Loading configuration...</p>;

    const tabs: { id: ConfigTab; label: string }[] = [
        { id: 'server', label: 'Server' },
        { id: 'track', label: 'Track & Cars' },
        { id: 'sessions', label: 'Sessions' },
        { id: 'weather', label: 'Weather' },
        { id: 'race', label: 'Race' },
        { id: 'entry', label: `Entry List (${entryList.length})` },
        ...(hasPlugins ? [{ id: 'plugins' as ConfigTab, label: 'Plugins' }] : []),
    ];

    const currentTrack = get('SERVER', 'TRACK');
    const carsValue = get('SERVER', 'CARS');

    return (
        <div className='flex flex-col gap-4'>
            {msg && (
                <div className={`rounded-xl shadow-md border-[1px] p-4 text-sm ${msg.ok ? 'border-green-500/20 bg-green-500/5 text-green-400' : 'border-red-500/20 bg-red-500/5 text-red-400'}`}>
                    {msg.text}
                </div>
            )}

            {/* Tab bar */}
            <div className='flex gap-1 bg-[#ffffff06] border border-[#ffffff0d] rounded-xl p-1 w-fit flex-wrap'>
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                            activeTab === t.id
                                ? 'bg-[#ffffff14] text-white shadow-sm border border-[#ffffff18]'
                                : 'text-[#ffffff55] hover:text-white'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ─── Server Tab ─────────────────────────────────────── */}
            {activeTab === 'server' && (
                <div className='flex flex-col gap-6'>
                    <div className='rounded-xl shadow-md border-[1px] border-[#ffffff07] bg-[#ffffff08] p-8'>
                        <p className='text-xl font-extrabold tracking-tight mb-4'>Server</p>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4'>
                            <Field label='Server Name' value={get('SERVER', 'NAME')} onChange={(v) => set('SERVER', 'NAME', v)} />
                            <Field label='Max Clients' type='number' value={get('SERVER', 'MAX_CLIENTS')} onChange={(v) => set('SERVER', 'MAX_CLIENTS', v)} />
                            <Field label='Password' type='password' value={get('SERVER', 'PASSWORD')} onChange={(v) => set('SERVER', 'PASSWORD', v)} hint='Leave empty for public' />
                            <Field label='Admin Password' type='password' value={get('SERVER', 'ADMIN_PASSWORD')} onChange={(v) => set('SERVER', 'ADMIN_PASSWORD', v)} />
                            <Field label='Welcome Message' value={get('SERVER', 'WELCOME_MESSAGE')} onChange={(v) => set('SERVER', 'WELCOME_MESSAGE', v)} />
                        </div>
                    </div>
                    <CollapsibleSection title='Advanced Server Settings'>
                        <AdvancedServerSettings get={get} set={set} />
                    </CollapsibleSection>
                </div>
            )}

            {/* ─── Track & Cars Tab ───────────────────────────────── */}
            {activeTab === 'track' && (
                <div className='flex flex-col gap-6'>
                    <div className='rounded-xl shadow-md border-[1px] border-[#ffffff07] bg-[#ffffff08] p-8'>
                        <p className='text-xl font-extrabold tracking-tight mb-4'>Track</p>
                        <div className='flex gap-6 items-start'>
                            {currentTrack && (
                                <ModThumbnail type='tracks' name={currentTrack} className='w-48 h-28 rounded-xl shrink-0' />
                            )}
                            <div className='flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4'>
                                <div className='flex flex-col gap-2'>
                                    <label className='text-sm text-[#ffffff77]'>Track</label>
                                    {installedTracks.length > 0 ? (
                                        <SearchableSelect options={installedTracks} value={currentTrack} onChange={(v) => set('SERVER', 'TRACK', v)} placeholder='Search tracks...' />
                                    ) : (
                                        <input type='text' value={currentTrack} onChange={(e) => set('SERVER', 'TRACK', e.target.value)} placeholder='ks_nurburgring' className='px-4 py-2 rounded-lg bg-[#ffffff17] text-sm outline-hidden font-mono' />
                                    )}
                                </div>
                                <TrackLayoutSelector uuid={uuid} track={currentTrack} value={get('SERVER', 'CONFIG_TRACK')} onChange={(v) => set('SERVER', 'CONFIG_TRACK', v)} />
                            </div>
                        </div>
                    </div>
                    <div className='rounded-xl shadow-md border-[1px] border-[#ffffff07] bg-[#ffffff08] p-8'>
                        <p className='text-xl font-extrabold tracking-tight mb-4'>Allowed Cars</p>
                        {installedCars.length > 0 ? (
                            <AllowedCarsSelector installedCars={installedCars} value={carsValue} onChange={(v) => set('SERVER', 'CARS', v)} />
                        ) : (
                            <Field label='Cars (semicolon-separated)' value={carsValue} onChange={(v) => set('SERVER', 'CARS', v)} hint='e.g. ks_ferrari_488_gt3;ks_porsche_911_gt3_r' />
                        )}
                    </div>
                </div>
            )}

            {/* ─── Sessions Tab ───────────────────────────────────── */}
            {activeTab === 'sessions' && (
                <div className='rounded-xl shadow-md border-[1px] border-[#ffffff07] bg-[#ffffff08] p-8'>
                    <p className='text-xl font-extrabold tracking-tight mb-4'>Sessions</p>
                    <div className='flex flex-col gap-3'>
                        {Object.keys(config ?? {})
                            .filter((k) => k.startsWith('SESSION_'))
                            .sort((a, b) => parseInt(a.split('_')[1] ?? '0') - parseInt(b.split('_')[1] ?? '0'))
                            .map((sec) => (
                                <div key={sec} className='rounded-lg border-[1px] border-[#ffffff12] bg-[#ffffff05] p-5 flex flex-col gap-3'>
                                    <div className='flex items-center justify-between'>
                                        <span className='text-sm font-bold text-white'>{get(sec, 'NAME') || sec}</span>
                                        <ActionButton size='sm' variant='danger' onClick={() => setConfig((prev) => prev ? renumberSections(prev, 'SESSION_', sec) : prev)}>Remove</ActionButton>
                                    </div>
                                    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                                        <Field label='Name' value={get(sec, 'NAME')} onChange={(v) => set(sec, 'NAME', v)} />
                                        <div className='flex flex-col gap-2'>
                                            <label className='text-sm text-[#ffffff77]'>Type</label>
                                            <div className='flex gap-1'>
                                                <ActionButton size='sm' variant={config?.[sec]?.TIME !== undefined && config?.[sec]?.LAPS === undefined ? 'primary' : 'secondary'} onClick={() => setConfig((prev) => { if (!prev) return prev; const s = { ...prev[sec] }; delete s.LAPS; s.TIME = s.TIME || '15'; return { ...prev, [sec]: s }; })}>Timed</ActionButton>
                                                <ActionButton size='sm' variant={config?.[sec]?.LAPS !== undefined ? 'primary' : 'secondary'} onClick={() => setConfig((prev) => { if (!prev) return prev; const s = { ...prev[sec] }; delete s.TIME; s.LAPS = s.LAPS || '5'; return { ...prev, [sec]: s }; })}>Laps</ActionButton>
                                            </div>
                                        </div>
                                        {config?.[sec]?.LAPS !== undefined && <Field label='Laps' type='number' value={get(sec, 'LAPS')} onChange={(v) => set(sec, 'LAPS', v)} />}
                                        {config?.[sec]?.TIME !== undefined && config?.[sec]?.LAPS === undefined && <Field label='Time (min)' type='number' value={get(sec, 'TIME')} onChange={(v) => set(sec, 'TIME', v)} />}
                                        <Field label='Wait Time (s)' type='number' value={get(sec, 'WAIT_TIME')} onChange={(v) => set(sec, 'WAIT_TIME', v)} />
                                        <Toggle label='Open' value={get(sec, 'IS_OPEN')} onChange={(v) => set(sec, 'IS_OPEN', v)} />
                                    </div>
                                </div>
                            ))}
                        <ActionButton variant='secondary' onClick={() => setConfig((prev) => { if (!prev) return prev; const c = Object.keys(prev).filter((k) => k.startsWith('SESSION_')).length; return { ...prev, [`SESSION_${c}`]: { NAME: c === 0 ? 'Practice' : c === 1 ? 'Qualifying' : 'Race', TIME: '15', IS_OPEN: '1', WAIT_TIME: '60' } }; })}>
                            + Add Session
                        </ActionButton>
                    </div>
                </div>
            )}

            {/* ─── Weather Tab ────────────────────────────────────── */}
            {activeTab === 'weather' && config && (
                <div className='rounded-xl shadow-md border-[1px] border-[#ffffff07] bg-[#ffffff08] p-8'>
                    <p className='text-xl font-extrabold tracking-tight mb-4'>Weather</p>
                    <WeatherSection config={config} get={get} set={set} setConfig={setConfig} />
                </div>
            )}

            {/* ─── Race Tab ───────────────────────────────────────── */}
            {activeTab === 'race' && (
                <div className='flex flex-col gap-6'>
                    <div className='rounded-xl shadow-md border-[1px] border-[#ffffff07] bg-[#ffffff08] p-8'>
                        <p className='text-xl font-extrabold tracking-tight mb-4'>Race Settings</p>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4'>
                            <Field label='Damage Multiplier (%)' type='number' value={get('SERVER', 'DAMAGE_MULTIPLIER')} onChange={(v) => set('SERVER', 'DAMAGE_MULTIPLIER', v)} />
                            <Field label='Fuel Rate (%)' type='number' value={get('SERVER', 'FUEL_RATE')} onChange={(v) => set('SERVER', 'FUEL_RATE', v)} />
                            <Field label='Tyre Wear Rate (%)' type='number' value={get('SERVER', 'TYRE_WEAR_RATE')} onChange={(v) => set('SERVER', 'TYRE_WEAR_RATE', v)} />
                            <Field label='Sun Angle' type='number' value={get('SERVER', 'SUN_ANGLE')} onChange={(v) => set('SERVER', 'SUN_ANGLE', v)} hint='-80 (dawn) to 80 (dusk)' />
                        </div>
                    </div>
                    <div className='rounded-xl shadow-md border-[1px] border-[#ffffff07] bg-[#ffffff08] p-8'>
                        <p className='text-xl font-extrabold tracking-tight mb-4'>Driving Aids</p>
                        <div className='grid grid-cols-2 md:grid-cols-3 gap-x-8'>
                            <Toggle label='TC Allowed' value={get('SERVER', 'TC_ALLOWED')} onChange={(v) => set('SERVER', 'TC_ALLOWED', v)} />
                            <Toggle label='ABS Allowed' value={get('SERVER', 'ABS_ALLOWED')} onChange={(v) => set('SERVER', 'ABS_ALLOWED', v)} />
                            <Toggle label='Stability Control' value={get('SERVER', 'STABILITY_ALLOWED')} onChange={(v) => set('SERVER', 'STABILITY_ALLOWED', v)} />
                            <Toggle label='Autoclutch' value={get('SERVER', 'AUTOCLUTCH_ALLOWED')} onChange={(v) => set('SERVER', 'AUTOCLUTCH_ALLOWED', v)} />
                            <Toggle label='Tyre Blankets' value={get('SERVER', 'TYRE_BLANKETS_ALLOWED')} onChange={(v) => set('SERVER', 'TYRE_BLANKETS_ALLOWED', v)} />
                        </div>
                    </div>
                    <div className='rounded-xl shadow-md border-[1px] border-[#ffffff07] bg-[#ffffff08] p-8'>
                        <p className='text-xl font-extrabold tracking-tight mb-4'>Track Surface</p>
                        <div className='grid grid-cols-2 md:grid-cols-3 gap-x-8'>
                            <Toggle label='Pickup Mode' value={get('SERVER', 'PICKUP_MODE_ENABLED')} onChange={(v) => set('SERVER', 'PICKUP_MODE_ENABLED', v)} />
                            <Toggle label='Loop Mode' value={get('SERVER', 'LOOP_MODE')} onChange={(v) => set('SERVER', 'LOOP_MODE', v)} />
                            <Toggle label='Register to Lobby' value={get('SERVER', 'REGISTER_TO_LOBBY')} onChange={(v) => set('SERVER', 'REGISTER_TO_LOBBY', v)} />
                            <Toggle label='Dynamic Track' value={get('SERVER', 'DYNAMIC_TRACK')} onChange={(v) => set('SERVER', 'DYNAMIC_TRACK', v)} />
                        </div>
                        {get('SERVER', 'DYNAMIC_TRACK') === '1' && <DynamicTrackSettings get={get} set={set} />}
                    </div>
                </div>
            )}

            {/* ─── Entry List Tab ─────────────────────────────────── */}
            {activeTab === 'entry' && (
                <div className='rounded-xl shadow-md border-[1px] border-[#ffffff07] bg-[#ffffff08] p-8'>
                    <p className='text-xl font-extrabold tracking-tight mb-4'>Entry List</p>
                    <EntryListEditor slots={entryList} onChange={setEntryList} installedCars={installedCars} />
                </div>
            )}

            {/* ─── Plugins Tab ────────────────────────────────────── */}
            {activeTab === 'plugins' && <PluginsTab uuid={uuid} />}

            {/* ─── Save Button ────────────────────────────────────── */}
            {activeTab !== 'plugins' && (
                <div className='flex justify-end'>
                    <ActionButton variant='primary' size='lg' onClick={save} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </ActionButton>
                </div>
            )}
        </div>
    );
};

export default AssettoCorsaRaceConfig;
