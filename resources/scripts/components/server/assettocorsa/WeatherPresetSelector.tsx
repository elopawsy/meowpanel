import { AC_WEATHER_PRESETS } from '@/components/server/assettocorsa/iniParser';

interface WeatherPresetSelectorProps {
    value: string;
    onChange: (v: string) => void;
}

const WeatherPresetSelector = ({ value, onChange }: WeatherPresetSelectorProps) => {
    const isCustom = value && !AC_WEATHER_PRESETS.some((p) => p.id === value);

    return (
        <div className='flex flex-col gap-2'>
            <div className='grid grid-cols-4 gap-1.5'>
                {AC_WEATHER_PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        type='button'
                        onClick={() => onChange(preset.id)}
                        className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-center transition-all duration-150 ${
                            value === preset.id
                                ? 'bg-blue-600/20 border-blue-500/30 text-blue-300'
                                : 'bg-[#ffffff06] border-[#ffffff10] text-zinc-400 hover:text-white hover:bg-[#ffffff0a]'
                        }`}
                    >
                        <span className='text-lg leading-none'>{preset.icon}</span>
                        <span className='text-[10px] font-medium leading-tight'>{preset.label}</span>
                    </button>
                ))}
            </div>
            <div className='flex flex-col gap-0.5'>
                <label className='text-[10px] text-zinc-600'>Custom preset (CSP/Sol weather)</label>
                <input
                    type='text'
                    value={isCustom ? value : ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder='e.g. sol_01_cloudy_rain'
                    className='bg-[#ffffff08] border border-[#ffffff12] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ffffff30] font-mono placeholder:text-zinc-700'
                />
            </div>
        </div>
    );
};

export default WeatherPresetSelector;
