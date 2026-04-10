import CollapsibleSection from '@/components/server/assettocorsa/CollapsibleSection';
import { Field } from '@/components/server/assettocorsa/FormControls';
import WeatherPresetSelector from '@/components/server/assettocorsa/WeatherPresetSelector';
import { type IniData, renumberSections } from '@/components/server/assettocorsa/iniParser';

interface WeatherSectionProps {
    config: IniData;
    get: (section: string, key: string, fallback?: string) => string;
    set: (section: string, key: string, value: string) => void;
    setConfig: React.Dispatch<React.SetStateAction<IniData | null>>;
}

const WeatherSection = ({ config, get, set, setConfig }: WeatherSectionProps) => {
    const weatherKeys = Object.keys(config)
        .filter((k) => k.startsWith('WEATHER_'))
        .sort((a, b) => parseInt(a.split('_')[1] ?? '0') - parseInt(b.split('_')[1] ?? '0'));

    const addWeather = () => {
        setConfig((prev) => {
            if (!prev) return prev;
            const count = Object.keys(prev).filter((k) => k.startsWith('WEATHER_')).length;
            return {
                ...prev,
                [`WEATHER_${count}`]: {
                    GRAPHICS: '3_clear',
                    BASE_TEMPERATURE_AMBIENT: '18',
                    VARIATION_AMBIENT: '2',
                    BASE_TEMPERATURE_ROAD: '10',
                    VARIATION_ROAD: '2',
                    WIND_BASE_SPEED_MIN: '0',
                    WIND_BASE_SPEED_MAX: '5',
                    WIND_BASE_DIRECTION: '0',
                    WIND_VARIATION_DIRECTION: '15',
                },
            };
        });
    };

    const removeWeather = (key: string) => {
        setConfig((prev) => (prev ? renumberSections(prev, 'WEATHER_', key) : prev));
    };

    return (
        <div className='flex flex-col gap-3'>
            {weatherKeys.map((sec) => (
                <div key={sec} className='bg-[#ffffff05] border border-[#ffffff0d] rounded-xl p-3 flex flex-col gap-3'>
                    <div className='flex items-center justify-between'>
                        <span className='text-xs font-semibold text-zinc-300'>Weather Slot {sec.split('_')[1]}</span>
                        {weatherKeys.length > 1 && (
                            <button
                                type='button'
                                onClick={() => removeWeather(sec)}
                                className='text-[10px] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors'
                            >
                                Remove
                            </button>
                        )}
                    </div>

                    <WeatherPresetSelector value={get(sec, 'GRAPHICS')} onChange={(v) => set(sec, 'GRAPHICS', v)} />

                    <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
                        <Field label='Ambient Temp (C)' type='number' value={get(sec, 'BASE_TEMPERATURE_AMBIENT')} onChange={(v) => set(sec, 'BASE_TEMPERATURE_AMBIENT', v)} />
                        <Field label='Temp Variation' type='number' value={get(sec, 'VARIATION_AMBIENT', '0')} onChange={(v) => set(sec, 'VARIATION_AMBIENT', v)} />
                        <Field label='Road Temp (C)' type='number' value={get(sec, 'BASE_TEMPERATURE_ROAD')} onChange={(v) => set(sec, 'BASE_TEMPERATURE_ROAD', v)} />
                        <Field label='Road Variation' type='number' value={get(sec, 'VARIATION_ROAD', '0')} onChange={(v) => set(sec, 'VARIATION_ROAD', v)} />
                    </div>

                    <CollapsibleSection title='Wind Settings'>
                        <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
                            <Field label='Min Speed (km/h)' type='number' value={get(sec, 'WIND_BASE_SPEED_MIN', '0')} onChange={(v) => set(sec, 'WIND_BASE_SPEED_MIN', v)} />
                            <Field label='Max Speed (km/h)' type='number' value={get(sec, 'WIND_BASE_SPEED_MAX', '0')} onChange={(v) => set(sec, 'WIND_BASE_SPEED_MAX', v)} />
                            <Field label='Direction (deg)' type='number' value={get(sec, 'WIND_BASE_DIRECTION', '0')} onChange={(v) => set(sec, 'WIND_BASE_DIRECTION', v)} />
                            <Field label='Direction Variation' type='number' value={get(sec, 'WIND_VARIATION_DIRECTION', '0')} onChange={(v) => set(sec, 'WIND_VARIATION_DIRECTION', v)} />
                        </div>
                    </CollapsibleSection>
                </div>
            ))}

            <button
                type='button'
                onClick={addWeather}
                className='px-3 py-1.5 rounded-lg text-xs font-medium bg-[#ffffff10] border border-[#ffffff18] text-white hover:bg-[#ffffff1a] transition-all duration-150 w-fit'
            >
                + Add Weather Slot
            </button>
        </div>
    );
};

export default WeatherSection;
