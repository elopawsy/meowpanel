import { useCallback, useEffect, useState } from 'react';

import getFileContents from '@/api/server/files/getFileContents';
import saveFileContents from '@/api/server/files/saveFileContents';
import loadDirectory from '@/api/server/files/loadDirectory';
import { ServerContext } from '@/state/server';

// ─── INI parser ───────────────────────────────────────────────────────────────

type IniData = Record<string, Record<string, string>>;

function parseIni(raw: string): IniData {
    const result: IniData = {};
    let section = '';
    for (const line of raw.split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith(';') || t.startsWith('#')) continue;
        const m = t.match(/^\[(.+)\]$/);
        if (m) {
            section = m[1];
            result[section] = result[section] ?? {};
        } else if (section) {
            const eq = t.indexOf('=');
            if (eq !== -1) {
                result[section][t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
            }
        }
    }
    return result;
}

function serializeIni(data: IniData): string {
    return Object.entries(data)
        .map(([sec, vals]) => {
            const lines = [`[${sec}]`];
            for (const [k, v] of Object.entries(vals)) lines.push(`${k}=${v}`);
            return lines.join('\n');
        })
        .join('\n\n');
}

// ─── Default config ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG: IniData = {
    SERVER: {
        NAME: 'Assetto Corsa Server',
        CARS: 'ks_ferrari_488_gt3',
        CONFIG_TRACK: '',
        TRACK: 'ks_nurburgring',
        SUN_ANGLE: '0',
        PASSWORD: '',
        ADMIN_PASSWORD: 'changeme',
        UDP_PORT: '9600',
        TCP_PORT: '9600',
        HTTP_PORT: '8081',
        PICKUP_MODE_ENABLED: '1',
        LOOP_MODE: '1',
        SLEEP_TIME: '1',
        CLIENT_SEND_INTERVAL_HZ: '18',
        SEND_BUFFER_SIZE: '0',
        RECV_BUFFER_SIZE: '0',
        RACE_OVER_TIME: '60',
        MAX_BALLAST_KG: '0',
        QUALIFY_MAX_WAIT_PERC: '120',
        RACE_PIT_WINDOW_START: '0',
        RACE_PIT_WINDOW_END: '0',
        REVERSED_GRID_RACE_POSITIONS: '0',
        LOCKED_ENTRY_LIST: '0',
        RACE_EXTRA_LAP: '0',
        MAX_CLIENTS: '16',
        VOTING_QUORUM: '80',
        VOTE_DURATION: '20',
        BLACKLIST_MODE: '0',
        TC_ALLOWED: '1',
        ABS_ALLOWED: '1',
        STABILITY_ALLOWED: '0',
        AUTOCLUTCH_ALLOWED: '1',
        TYRE_BLANKETS_ALLOWED: '1',
        FORCE_VIRTUAL_MIRROR: '0',
        REGISTER_TO_LOBBY: '1',
        MAX_CONTACTS_PER_KM: '25',
        RESULT_SCREEN_TIME: '60',
        WELCOME_MESSAGE: '',
        DAMAGE_MULTIPLIER: '100',
        FUEL_RATE: '100',
        TYRE_WEAR_RATE: '100',
        ALLOWED_TYRES_OUT: '2',
        DYNAMIC_TRACK: '0',
        TIME_OF_DAY_MULT: '0',
    },
    DYNAMIC_TRACK: {
        SESSION_START: '96',
        RANDOMNESS: '2',
        LAP_GAIN: '30',
        SESSION_TRANSFER: '80',
    },
    WEATHER_0: {
        GRAPHICS: '3_clear',
        BASE_TEMPERATURE_AMBIENT: '18',
        VARIATION_AMBIENT: '0',
        BASE_TEMPERATURE_ROAD: '10',
        VARIATION_ROAD: '0',
        WIND_BASE_SPEED_MIN: '0',
        WIND_BASE_SPEED_MAX: '0',
        WIND_BASE_DIRECTION: '0',
        WIND_VARIATION_DIRECTION: '0',
    },
    SESSION_0: {
        NAME: 'Qualifying',
        TIME: '15',
        IS_OPEN: '1',
        WAIT_TIME: '60',
    },
    SESSION_1: {
        NAME: 'Race',
        LAPS: '5',
        WAIT_TIME: '120',
        IS_OPEN: '1',
    },
};

// ─── Field component ──────────────────────────────────────────────────────────

const Field = ({
    label,
    value,
    onChange,
    type = 'text',
    hint,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: 'text' | 'number' | 'password';
    hint?: string;
}) => (
    <div className='flex flex-col gap-1'>
        <label className='text-xs text-zinc-400'>{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className='bg-[#ffffff08] border border-[#ffffff12] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#ffffff30] transition-colors'
        />
        {hint && <span className='text-[10px] text-zinc-600'>{hint}</span>}
    </div>
);

const Toggle = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) => (
    <div className='flex items-center justify-between gap-4 py-1'>
        <span className='text-xs text-zinc-300'>{label}</span>
        <button
            onClick={() => onChange(value === '1' ? '0' : '1')}
            className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                value === '1' ? 'bg-green-500' : 'bg-[#ffffff20]'
            }`}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                    value === '1' ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
        </button>
    </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className='text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-4 mb-2 border-b border-[#ffffff10] pb-1'>
        {children}
    </h3>
);

// ─── Main component ───────────────────────────────────────────────────────────

const AssettoCorsaRaceConfig = () => {
    const uuid = ServerContext.useStoreState((s) => s.server.data!.uuid);
    const [config, setConfig] = useState<IniData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
    const [installedCars, setInstalledCars] = useState<string[]>([]);
    const [installedTracks, setInstalledTracks] = useState<string[]>([]);

    const flash = (text: string, ok = true) => {
        setMsg({ text, ok });
        setTimeout(() => setMsg(null), 3000);
    };

    const loadConfig = useCallback(async () => {
        setLoading(true);
        try {
            const raw = await getFileContents(uuid, 'cfg/server_cfg.ini');
            setConfig(parseIni(raw));
        } catch {
            setConfig({ ...DEFAULT_CONFIG });
        }
        // Load installed content for selectors
        try {
            const cars = await loadDirectory(uuid, '/content/cars');
            setInstalledCars(cars.filter((f) => !f.isFile).map((f) => f.name));
        } catch { /* empty dir */ }
        try {
            const tracks = await loadDirectory(uuid, '/content/tracks');
            setInstalledTracks(tracks.filter((f) => !f.isFile).map((f) => f.name));
        } catch { /* empty dir */ }
        setLoading(false);
    }, [uuid]);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    const set = (section: string, key: string, value: string) => {
        setConfig((prev) => {
            if (!prev) return prev;
            return { ...prev, [section]: { ...prev[section], [key]: value } };
        });
    };

    const get = (section: string, key: string, fallback = ''): string =>
        config?.[section]?.[key] ?? fallback;

    const save = async () => {
        if (!config) return;
        setSaving(true);
        try {
            await saveFileContents(uuid, 'cfg/server_cfg.ini', serializeIni(config));
            flash('Configuration saved.');
        } catch {
            flash('Failed to save.', false);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <p className='text-xs text-zinc-500 animate-pulse'>Loading configuration...</p>;
    }

    // Cars field is semicolon-separated
    const carsValue = get('SERVER', 'CARS');

    return (
        <div className='flex flex-col gap-2'>
            {msg && (
                <p
                    className={`text-xs px-3 py-2 rounded-lg border ${
                        msg.ok
                            ? 'text-green-400 bg-green-400/10 border-green-400/20'
                            : 'text-red-400 bg-red-400/10 border-red-400/20'
                    }`}
                >
                    {msg.text}
                </p>
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1'>
                <SectionTitle>Server</SectionTitle>
                <div className='md:col-span-2' />
                <Field label='Server Name' value={get('SERVER', 'NAME')} onChange={(v) => set('SERVER', 'NAME', v)} />
                <Field label='Max Clients' type='number' value={get('SERVER', 'MAX_CLIENTS')} onChange={(v) => set('SERVER', 'MAX_CLIENTS', v)} />
                <Field label='Password' type='password' value={get('SERVER', 'PASSWORD')} onChange={(v) => set('SERVER', 'PASSWORD', v)} hint='Leave empty for public' />
                <Field label='Admin Password' type='password' value={get('SERVER', 'ADMIN_PASSWORD')} onChange={(v) => set('SERVER', 'ADMIN_PASSWORD', v)} />
                <Field label='Welcome Message' value={get('SERVER', 'WELCOME_MESSAGE')} onChange={(v) => set('SERVER', 'WELCOME_MESSAGE', v)} />
            </div>

            {/* Track */}
            <SectionTitle>Track</SectionTitle>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1'>
                <div className='flex flex-col gap-1'>
                    <label className='text-xs text-zinc-400'>Track</label>
                    {installedTracks.length > 0 ? (
                        <select
                            value={get('SERVER', 'TRACK')}
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
                            value={get('SERVER', 'TRACK')}
                            onChange={(e) => set('SERVER', 'TRACK', e.target.value)}
                            className='bg-[#ffffff08] border border-[#ffffff12] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#ffffff30]'
                            placeholder='ks_nurburgring'
                        />
                    )}
                    <span className='text-[10px] text-zinc-600'>Install tracks in the Mods tab to unlock the dropdown</span>
                </div>
                <Field label='Track Config (layout)' value={get('SERVER', 'CONFIG_TRACK')} onChange={(v) => set('SERVER', 'CONFIG_TRACK', v)} hint='Leave empty for default layout' />
            </div>

            {/* Cars */}
            <SectionTitle>Cars</SectionTitle>
            {installedCars.length > 0 ? (
                <div>
                    <label className='text-xs text-zinc-400 mb-2 block'>Select allowed cars (multi-select)</label>
                    <div className='flex flex-wrap gap-2'>
                        {installedCars.map((car) => {
                            const active = carsValue.split(';').includes(car);
                            return (
                                <button
                                    key={car}
                                    onClick={() => {
                                        const list = carsValue ? carsValue.split(';').filter(Boolean) : [];
                                        const next = active ? list.filter((c) => c !== car) : [...list, car];
                                        set('SERVER', 'CARS', next.join(';'));
                                    }}
                                    className={`px-2.5 py-1 rounded-md text-xs border transition-all duration-150 font-mono ${
                                        active
                                            ? 'bg-green-500/15 border-green-500/40 text-green-300'
                                            : 'bg-[#ffffff07] border-[#ffffff12] text-zinc-400 hover:text-white'
                                    }`}
                                >
                                    {car}
                                </button>
                            );
                        })}
                    </div>
                    <span className='text-[10px] text-zinc-600 mt-1 block'>Install car mods in the Mods tab to see them here</span>
                </div>
            ) : (
                <Field
                    label='Cars (semicolon-separated)'
                    value={carsValue}
                    onChange={(v) => set('SERVER', 'CARS', v)}
                    hint='e.g. ks_ferrari_488_gt3;ks_porsche_911_gt3_r — install car mods to get a selector'
                />
            )}

            {/* Race settings */}
            <SectionTitle>Race Settings</SectionTitle>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1'>
                <Field label='Damage Multiplier (%)' type='number' value={get('SERVER', 'DAMAGE_MULTIPLIER')} onChange={(v) => set('SERVER', 'DAMAGE_MULTIPLIER', v)} />
                <Field label='Fuel Rate (%)' type='number' value={get('SERVER', 'FUEL_RATE')} onChange={(v) => set('SERVER', 'FUEL_RATE', v)} />
                <Field label='Tyre Wear Rate (%)' type='number' value={get('SERVER', 'TYRE_WEAR_RATE')} onChange={(v) => set('SERVER', 'TYRE_WEAR_RATE', v)} />
                <Field label='Sun Angle' type='number' value={get('SERVER', 'SUN_ANGLE')} onChange={(v) => set('SERVER', 'SUN_ANGLE', v)} hint='-80 (dawn) to 80 (dusk)' />
            </div>
            <div className='grid grid-cols-2 md:grid-cols-3 gap-x-6 mt-1'>
                <Toggle label='Pickup Mode' value={get('SERVER', 'PICKUP_MODE_ENABLED')} onChange={(v) => set('SERVER', 'PICKUP_MODE_ENABLED', v)} />
                <Toggle label='Loop Mode' value={get('SERVER', 'LOOP_MODE')} onChange={(v) => set('SERVER', 'LOOP_MODE', v)} />
                <Toggle label='Register to Lobby' value={get('SERVER', 'REGISTER_TO_LOBBY')} onChange={(v) => set('SERVER', 'REGISTER_TO_LOBBY', v)} />
                <Toggle label='TC Allowed' value={get('SERVER', 'TC_ALLOWED')} onChange={(v) => set('SERVER', 'TC_ALLOWED', v)} />
                <Toggle label='ABS Allowed' value={get('SERVER', 'ABS_ALLOWED')} onChange={(v) => set('SERVER', 'ABS_ALLOWED', v)} />
                <Toggle label='Stability Allowed' value={get('SERVER', 'STABILITY_ALLOWED')} onChange={(v) => set('SERVER', 'STABILITY_ALLOWED', v)} />
                <Toggle label='Autoclutch Allowed' value={get('SERVER', 'AUTOCLUTCH_ALLOWED')} onChange={(v) => set('SERVER', 'AUTOCLUTCH_ALLOWED', v)} />
                <Toggle label='Tyre Blankets' value={get('SERVER', 'TYRE_BLANKETS_ALLOWED')} onChange={(v) => set('SERVER', 'TYRE_BLANKETS_ALLOWED', v)} />
                <Toggle label='Dynamic Track' value={get('SERVER', 'DYNAMIC_TRACK')} onChange={(v) => set('SERVER', 'DYNAMIC_TRACK', v)} />
            </div>

            {/* Sessions */}
            <SectionTitle>Sessions</SectionTitle>
            {['SESSION_0', 'SESSION_1', 'SESSION_2'].map((sec) => {
                if (!config?.[sec]) return null;
                return (
                    <div key={sec} className='bg-[#ffffff05] border border-[#ffffff0d] rounded-xl p-3 flex flex-col gap-2'>
                        <div className='flex items-center gap-2'>
                            <span className='text-xs font-semibold text-zinc-300'>{get(sec, 'NAME') || sec}</span>
                            <span className='text-[10px] text-zinc-600'>[{sec}]</span>
                        </div>
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

            {/* Weather */}
            <SectionTitle>Weather</SectionTitle>
            {Object.keys(config ?? {}).filter((k) => k.startsWith('WEATHER_')).map((sec) => (
                <div key={sec} className='bg-[#ffffff05] border border-[#ffffff0d] rounded-xl p-3 flex flex-col gap-2'>
                    <span className='text-xs font-semibold text-zinc-300'>[{sec}]</span>
                    <div className='grid grid-cols-2 md:grid-cols-3 gap-2'>
                        <Field label='Graphics preset' value={get(sec, 'GRAPHICS')} onChange={(v) => set(sec, 'GRAPHICS', v)} hint='e.g. 3_clear, 7_heavy_fog' />
                        <Field label='Ambient Temp (°C)' type='number' value={get(sec, 'BASE_TEMPERATURE_AMBIENT')} onChange={(v) => set(sec, 'BASE_TEMPERATURE_AMBIENT', v)} />
                        <Field label='Road Temp +offset' type='number' value={get(sec, 'BASE_TEMPERATURE_ROAD')} onChange={(v) => set(sec, 'BASE_TEMPERATURE_ROAD', v)} />
                    </div>
                </div>
            ))}

            {/* Save */}
            <div className='flex justify-end pt-2'>
                <button
                    onClick={save}
                    disabled={saving}
                    className='px-5 py-2 rounded-lg text-sm font-semibold bg-green-600/80 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all duration-150 border border-green-500/30'
                >
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
        </div>
    );
};

export default AssettoCorsaRaceConfig;
