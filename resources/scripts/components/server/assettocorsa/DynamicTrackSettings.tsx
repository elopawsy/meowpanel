import { Field } from '@/components/server/assettocorsa/FormControls';

interface DynamicTrackSettingsProps {
    get: (section: string, key: string, fallback?: string) => string;
    set: (section: string, key: string, value: string) => void;
}

const DynamicTrackSettings = ({ get, set }: DynamicTrackSettingsProps) => (
    <div className='bg-[#ffffff05] border border-[#ffffff0d] rounded-xl p-3 mt-2'>
        <span className='text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-2 block'>Track Grip Evolution</span>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
            <Field
                label='Session Start'
                type='number'
                value={get('DYNAMIC_TRACK', 'SESSION_START', '96')}
                onChange={(v) => set('DYNAMIC_TRACK', 'SESSION_START', v)}
                hint='Grip at start (0-100)'
            />
            <Field
                label='Randomness'
                type='number'
                value={get('DYNAMIC_TRACK', 'RANDOMNESS', '2')}
                onChange={(v) => set('DYNAMIC_TRACK', 'RANDOMNESS', v)}
                hint='Grip randomness (0-5)'
            />
            <Field
                label='Lap Gain'
                type='number'
                value={get('DYNAMIC_TRACK', 'LAP_GAIN', '30')}
                onChange={(v) => set('DYNAMIC_TRACK', 'LAP_GAIN', v)}
                hint='Grip per lap'
            />
            <Field
                label='Session Transfer'
                type='number'
                value={get('DYNAMIC_TRACK', 'SESSION_TRANSFER', '80')}
                onChange={(v) => set('DYNAMIC_TRACK', 'SESSION_TRANSFER', v)}
                hint='Grip carry-over (%)'
            />
        </div>
    </div>
);

export default DynamicTrackSettings;
