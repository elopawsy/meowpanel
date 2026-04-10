import { useEffect, useState } from 'react';

import SearchableSelect from '@/components/server/assettocorsa/SearchableSelect';
import { detectTrackLayouts } from '@/components/server/assettocorsa/trackUtils';

interface TrackLayoutSelectorProps {
    uuid: string;
    track: string;
    value: string;
    onChange: (v: string) => void;
}

const TrackLayoutSelector = ({ uuid, track, value, onChange }: TrackLayoutSelectorProps) => {
    const [layouts, setLayouts] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!track) {
            setLayouts([]);
            return;
        }
        setLoading(true);
        detectTrackLayouts(uuid, track)
            .then(setLayouts)
            .finally(() => setLoading(false));
    }, [uuid, track]);

    if (loading) {
        return (
            <div className='flex flex-col gap-1'>
                <label className='text-xs text-zinc-400'>Layout</label>
                <p className='text-xs text-zinc-600 animate-pulse py-1.5'>Detecting layouts...</p>
            </div>
        );
    }

    if (layouts.length === 0) {
        return (
            <div className='flex flex-col gap-1'>
                <label className='text-xs text-zinc-400'>Layout</label>
                <input
                    type='text'
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder='Default (no layouts detected)'
                    className='bg-[#ffffff08] border border-[#ffffff12] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#ffffff30] font-mono placeholder:text-zinc-600'
                />
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-1'>
            <label className='text-xs text-zinc-400'>Layout</label>
            <SearchableSelect
                options={['', ...layouts]}
                value={value}
                onChange={onChange}
                placeholder='Default layout'
            />
            <span className='text-[10px] text-zinc-600'>{layouts.length} layout(s) detected</span>
        </div>
    );
};

export default TrackLayoutSelector;
