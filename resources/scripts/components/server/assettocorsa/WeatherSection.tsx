import ActionButton from '@/components/elements/ActionButton';
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
        <div className='flex flex-col gap-4'>
            {weatherKeys.map((sec) => (
                <div key={sec} className='rounded-lg border-[1px] border-[#ffffff12] bg-[#ffffff05] p-5 flex flex-col gap-4'>
                    <div className='flex items-center justify-between'>
                        <span className='text-sm font-bold text-white'>Weather Slot {sec.split('_')[1]}</span>
                        {weatherKeys.length > 1 && (
                            <ActionButton size='sm' variant='danger' onClick={() => removeWeather(sec)}>Remove</ActionButton>
                        )}
                    </div>

                    <WeatherPresetSelector value={get(sec, 'GRAPHICS')} onChange={(v) => set(sec, 'GRAPHICS', v)} />

                    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                        <Field label='Ambient Temp (C)' type='number' value={get(sec, 'BASE_TEMPERATURE_AMBIENT')} onChange={(v) => set(sec, 'BASE_TEMPERATURE_AMBIENT', v)} />
                        <Field label='Temp Variation' type='number' value={get(sec, 'VARIATION_AMBIENT', '0')} onChange={(v) => set(sec, 'VARIATION_AMBIENT', v)} />
                        <Field label='Road Temp (C)' type='number' value={get(sec, 'BASE_TEMPERATURE_ROAD')} onChange={(v) => set(sec, 'BASE_TEMPERATURE_ROAD', v)} />
                        <Field label='Road Variation' type='number' value={get(sec, 'VARIATION_ROAD', '0')} onChange={(v) => set(sec, 'VARIATION_ROAD', v)} />
                    </div>

                    <CollapsibleSection title='Wind Settings'>
                        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                            <Field label='Min Speed (km/h)' type='number' value={get(sec, 'WIND_BASE_SPEED_MIN', '0')} onChange={(v) => set(sec, 'WIND_BASE_SPEED_MIN', v)} />
                            <Field label='Max Speed (km/h)' type='number' value={get(sec, 'WIND_BASE_SPEED_MAX', '0')} onChange={(v) => set(sec, 'WIND_BASE_SPEED_MAX', v)} />
                            <Field label='Direction (deg)' type='number' value={get(sec, 'WIND_BASE_DIRECTION', '0')} onChange={(v) => set(sec, 'WIND_BASE_DIRECTION', v)} />
                            <Field label='Direction Variation' type='number' value={get(sec, 'WIND_VARIATION_DIRECTION', '0')} onChange={(v) => set(sec, 'WIND_VARIATION_DIRECTION', v)} />
                        </div>
                    </CollapsibleSection>
                </div>
            ))}

            <ActionButton variant='secondary' onClick={addWeather}>
                + Add Weather Slot
            </ActionButton>
        </div>
    );
};

export default WeatherSection;
