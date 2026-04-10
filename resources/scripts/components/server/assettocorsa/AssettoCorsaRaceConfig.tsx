import { useCallback, useEffect, useState } from 'react';

import createDirectory from '@/api/server/files/createDirectory';
import getFileContents from '@/api/server/files/getFileContents';
import loadDirectory from '@/api/server/files/loadDirectory';
import saveFileContents from '@/api/server/files/saveFileContents';
import { httpErrorToHuman } from '@/api/http';
import EntryListEditor from '@/components/server/assettocorsa/EntryListEditor';
import { Field, SectionTitle, Toggle } from '@/components/server/assettocorsa/FormControls';
import ModThumbnail from '@/components/server/assettocorsa/ModThumbnail';
import {
    DEFAULT_SERVER_CFG,
    parseEntryList,
    parseIni,
    serializeEntryList,
    serializeIni,
    type EntrySlot,
    type IniData,
} from '@/components/server/assettocorsa/iniParser';
import { ServerContext } from '@/state/server';

type ConfigTab = 'server' | 'entry';

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
        setInstalledTracks(
            tracks.status === 'fulfilled' ? tracks.value.filter((f) => !f.isFile).map((f) => f.name) : [],
        );
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

    if (loading) {
        return <p className='text-xs text-zinc-500 animate-pulse'>Loading configuration...</p>;
    }

    const carsValue = get('SERVER', 'CARS');
    const currentTrack = get('SERVER', 'TRACK');

    return (
        <div className='flex flex-col gap-2'>
            {msg && (
                <p
                    className={`text-xs px-3 py-2 rounded-lg border ${msg.ok ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'}`}
                >
                    {msg.text}
                </p>
            )}

            {/* Sub-tab bar */}
            <div className='flex gap-1 bg-[#ffffff06] border border-[#ffffff0d] rounded-xl p-1 w-fit mb-2'>
                {(
                    [
                        { id: 'server', label: 'Server & Race' },
                        { id: 'entry', label: `Entry List (${entryList.length})` },
                    ] as const
                ).map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                            activeTab === t.id
                                ? 'bg-[#ffffff14] text-white border border-[#ffffff18]'
                                : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {activeTab === 'server' && (
                <>
                    {/* Server */}
                    <SectionTitle>Server</SectionTitle>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2'>
                        <Field label='Server Name' value={get('SERVER', 'NAME')} onChange={(v) => set('SERVER', 'NAME', v)} />
                        <Field label='Max Clients' type='number' value={get('SERVER', 'MAX_CLIENTS')} onChange={(v) => set('SERVER', 'MAX_CLIENTS', v)} />
                        <Field label='Password' type='password' value={get('SERVER', 'PASSWORD')} onChange={(v) => set('SERVER', 'PASSWORD', v)} hint='Leave empty for public' />
                        <Field label='Admin Password' type='password' value={get('SERVER', 'ADMIN_PASSWORD')} onChange={(v) => set('SERVER', 'ADMIN_PASSWORD', v)} />
                        <Field label='Welcome Message' value={get('SERVER', 'WELCOME_MESSAGE')} onChange={(v) => set('SERVER', 'WELCOME_MESSAGE', v)} />
                    </div>

                    {/* Track */}
                    <SectionTitle>Track</SectionTitle>
                    <div className='flex gap-4 items-start'>
                        {currentTrack && (
                            <ModThumbnail type='tracks' name={currentTrack} className='w-48 h-28 rounded-xl shrink-0' />
                        )}
                        <div className='flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2'>
                            <div className='flex flex-col gap-1'>
                                <label className='text-xs text-zinc-400'>Track</label>
                                {installedTracks.length > 0 ? (
                                    <select
                                        value={currentTrack}
                                        onChange={(e) => set('SERVER', 'TRACK', e.target.value)}
                                        className='bg-[#ffffff08] border border-[#ffffff12] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#ffffff30]'
                                    >
                                        {installedTracks.map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type='text'
                                        value={currentTrack}
                                        onChange={(e) => set('SERVER', 'TRACK', e.target.value)}
                                        placeholder='ks_nurburgring'
                                        className='bg-[#ffffff08] border border-[#ffffff12] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#ffffff30] font-mono placeholder:text-zinc-600'
                                    />
                                )}
                                <span className='text-[10px] text-zinc-600'>Install tracks via the Mod Manager to unlock the dropdown</span>
                            </div>
                            <Field label='Layout' value={get('SERVER', 'CONFIG_TRACK')} onChange={(v) => set('SERVER', 'CONFIG_TRACK', v)} hint='Leave empty for default' placeholder='optional' />
                        </div>
                    </div>

                    {/* Cars */}
                    <SectionTitle>Allowed Cars</SectionTitle>
                    {installedCars.length > 0 ? (
                        <div>
                            <div className='flex flex-wrap gap-2'>
                                {installedCars.map((car) => {
                                    const active = carsValue.split(';').filter(Boolean).includes(car);
                                    return (
                                        <button
                                            key={car}
                                            onClick={() => {
                                                const list = carsValue ? carsValue.split(';').filter(Boolean) : [];
                                                const next = active ? list.filter((c) => c !== car) : [...list, car];
                                                set('SERVER', 'CARS', next.join(';'));
                                            }}
                                            className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-lg border text-xs transition-all duration-150 ${
                                                active
                                                    ? 'bg-green-500/10 border-green-500/30 text-green-300'
                                                    : 'bg-[#ffffff06] border-[#ffffff10] text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            <ModThumbnail type='cars' name={car} className='w-7 h-7 rounded' />
                                            <span className='font-mono'>{car}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <span className='text-[10px] text-zinc-600 mt-1.5 block'>Install car mods to see them here</span>
                        </div>
                    ) : (
                        <Field label='Cars (semicolon-separated)' value={carsValue} onChange={(v) => set('SERVER', 'CARS', v)} hint='e.g. ks_ferrari_488_gt3;ks_porsche_911_gt3_r' />
                    )}

                    {/* Race settings */}
                    <SectionTitle>Race Settings</SectionTitle>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2'>
                        <Field label='Damage Multiplier (%)' type='number' value={get('SERVER', 'DAMAGE_MULTIPLIER')} onChange={(v) => set('SERVER', 'DAMAGE_MULTIPLIER', v)} />
                        <Field label='Fuel Rate (%)' type='number' value={get('SERVER', 'FUEL_RATE')} onChange={(v) => set('SERVER', 'FUEL_RATE', v)} />
                        <Field label='Tyre Wear Rate (%)' type='number' value={get('SERVER', 'TYRE_WEAR_RATE')} onChange={(v) => set('SERVER', 'TYRE_WEAR_RATE', v)} />
                        <Field label='Sun Angle' type='number' value={get('SERVER', 'SUN_ANGLE')} onChange={(v) => set('SERVER', 'SUN_ANGLE', v)} hint='-80 (dawn) to 80 (dusk)' />
                    </div>
                    <div className='grid grid-cols-2 md:grid-cols-3 gap-x-8 mt-1'>
                        <Toggle label='Pickup Mode' value={get('SERVER', 'PICKUP_MODE_ENABLED')} onChange={(v) => set('SERVER', 'PICKUP_MODE_ENABLED', v)} />
                        <Toggle label='Loop Mode' value={get('SERVER', 'LOOP_MODE')} onChange={(v) => set('SERVER', 'LOOP_MODE', v)} />
                        <Toggle label='Register to Lobby' value={get('SERVER', 'REGISTER_TO_LOBBY')} onChange={(v) => set('SERVER', 'REGISTER_TO_LOBBY', v)} />
                        <Toggle label='TC Allowed' value={get('SERVER', 'TC_ALLOWED')} onChange={(v) => set('SERVER', 'TC_ALLOWED', v)} />
                        <Toggle label='ABS Allowed' value={get('SERVER', 'ABS_ALLOWED')} onChange={(v) => set('SERVER', 'ABS_ALLOWED', v)} />
                        <Toggle label='Stability Control' value={get('SERVER', 'STABILITY_ALLOWED')} onChange={(v) => set('SERVER', 'STABILITY_ALLOWED', v)} />
                        <Toggle label='Autoclutch' value={get('SERVER', 'AUTOCLUTCH_ALLOWED')} onChange={(v) => set('SERVER', 'AUTOCLUTCH_ALLOWED', v)} />
                        <Toggle label='Tyre Blankets' value={get('SERVER', 'TYRE_BLANKETS_ALLOWED')} onChange={(v) => set('SERVER', 'TYRE_BLANKETS_ALLOWED', v)} />
                        <Toggle label='Dynamic Track' value={get('SERVER', 'DYNAMIC_TRACK')} onChange={(v) => set('SERVER', 'DYNAMIC_TRACK', v)} />
                    </div>

                    {/* Sessions */}
                    <SectionTitle>Sessions</SectionTitle>
                    <div className='flex flex-col gap-2'>
                        {['SESSION_0', 'SESSION_1', 'SESSION_2'].map((sec) => {
                            if (!config?.[sec]) return null;
                            return (
                                <div key={sec} className='bg-[#ffffff05] border border-[#ffffff0d] rounded-xl p-3 flex flex-col gap-2'>
                                    <span className='text-xs font-semibold text-zinc-300'>{get(sec, 'NAME') || sec}</span>
                                    <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
                                        <Field label='Name' value={get(sec, 'NAME')} onChange={(v) => set(sec, 'NAME', v)} />
                                        {config[sec].LAPS !== undefined && (
                                            <Field label='Laps' type='number' value={get(sec, 'LAPS')} onChange={(v) => set(sec, 'LAPS', v)} />
                                        )}
                                        {config[sec].TIME !== undefined && (
                                            <Field label='Time (min)' type='number' value={get(sec, 'TIME')} onChange={(v) => set(sec, 'TIME', v)} />
                                        )}
                                        <Field label='Wait Time (s)' type='number' value={get(sec, 'WAIT_TIME')} onChange={(v) => set(sec, 'WAIT_TIME', v)} />
                                        <Toggle label='Open' value={get(sec, 'IS_OPEN')} onChange={(v) => set(sec, 'IS_OPEN', v)} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Weather */}
                    <SectionTitle>Weather</SectionTitle>
                    <div className='flex flex-col gap-2'>
                        {Object.keys(config ?? {})
                            .filter((k) => k.startsWith('WEATHER_'))
                            .map((sec) => (
                                <div key={sec} className='bg-[#ffffff05] border border-[#ffffff0d] rounded-xl p-3 flex flex-col gap-2'>
                                    <span className='text-xs font-semibold text-zinc-300'>[{sec}]</span>
                                    <div className='grid grid-cols-2 md:grid-cols-3 gap-2'>
                                        <Field label='Graphics preset' value={get(sec, 'GRAPHICS')} onChange={(v) => set(sec, 'GRAPHICS', v)} hint='e.g. 3_clear, 7_heavy_fog' />
                                        <Field label='Ambient Temp' type='number' value={get(sec, 'BASE_TEMPERATURE_AMBIENT')} onChange={(v) => set(sec, 'BASE_TEMPERATURE_AMBIENT', v)} />
                                        <Field label='Road Temp +offset' type='number' value={get(sec, 'BASE_TEMPERATURE_ROAD')} onChange={(v) => set(sec, 'BASE_TEMPERATURE_ROAD', v)} />
                                    </div>
                                </div>
                            ))}
                    </div>
                </>
            )}

            {activeTab === 'entry' && (
                <EntryListEditor slots={entryList} onChange={setEntryList} installedCars={installedCars} />
            )}

            {/* Save */}
            <div className='flex justify-end pt-3'>
                <button
                    onClick={save}
                    disabled={saving}
                    className='px-5 py-2 rounded-lg text-sm font-semibold bg-green-600/80 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all duration-150 border border-green-500/30'
                >
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    );
};

export default AssettoCorsaRaceConfig;
