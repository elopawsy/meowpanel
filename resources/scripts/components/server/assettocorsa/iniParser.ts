// ─── INI parser / serializer for Assetto Corsa config files ─────────────────

export type IniData = Record<string, Record<string, string>>;

export function parseIni(raw: string): IniData {
    const result: IniData = {};
    let section = '';
    for (const line of raw.split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith(';') || t.startsWith('#')) continue;
        const m = t.match(/^\[(.+)\]$/);
        if (m && m[1]) {
            section = m[1];
            if (!result[section]) result[section] = {};
        } else if (section) {
            const sectionData = result[section];
            if (sectionData) {
                const eq = t.indexOf('=');
                if (eq !== -1) {
                    sectionData[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
                }
            }
        }
    }
    return result;
}

export function serializeIni(data: IniData): string {
    return Object.entries(data)
        .map(([sec, vals]) => [`[${sec}]`, ...Object.entries(vals).map(([k, v]) => `${k}=${v}`)].join('\n'))
        .join('\n\n');
}

// ─── Entry list types & parser ──────────────────────────────────────────────

export interface EntrySlot {
    car: string;
    skin: string;
    driverName: string;
    guid: string;
    spectator: boolean;
}

export function parseEntryList(raw: string): EntrySlot[] {
    const ini = parseIni(raw);
    const slots: EntrySlot[] = [];
    let i = 0;
    let s = ini[`CAR_${i}`];
    while (s) {
        slots.push({
            car: s.MODEL ?? '',
            skin: s.SKIN ?? '',
            driverName: s.DRIVERNAME ?? '',
            guid: s.GUID ?? '',
            spectator: s.SPECTATOR_MODE === '1',
        });
        i++;
        s = ini[`CAR_${i}`];
    }
    return slots;
}

export function serializeEntryList(slots: EntrySlot[]): string {
    return slots
        .map((s, i) =>
            [
                `[CAR_${i}]`,
                `MODEL=${s.car}`,
                `SKIN=${s.skin}`,
                `SPECTATOR_MODE=${s.spectator ? '1' : '0'}`,
                `DRIVERNAME=${s.driverName}`,
                `TEAM=`,
                `GUID=${s.guid}`,
                `BALLAST=0`,
                `RESTRICTOR=0`,
            ].join('\n'),
        )
        .join('\n\n');
}

// ─── Default server config ──────────────────────────────────────────────────

export const DEFAULT_SERVER_CFG: IniData = {
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
