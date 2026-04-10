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
            <div className='flex flex-col gap-2'>
                <label className='text-sm text-[#ffffff77]'>Layout</label>
                <p className='text-sm text-[#ffffff44] animate-pulse py-2'>Detecting layouts...</p>
            </div>
        );
    }

    if (layouts.length === 0) {
        return (
            <div className='flex flex-col gap-2'>
                <label className='text-sm text-[#ffffff77]'>Layout</label>
                <input
                    type='text'
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder='Default (no layouts detected)'
                    className='px-4 py-2 rounded-lg bg-[#1e1e1e] text-sm outline-hidden font-mono'
                />
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-2'>
            <label className='text-sm text-[#ffffff77]'>Layout</label>
            <SearchableSelect
                options={['', ...layouts]}
                value={value}
                onChange={onChange}
                placeholder='Default layout'
            />
            <span className='text-xs text-[#ffffff44]'>{layouts.length} layout(s) detected</span>
        </div>
    );
};

export default TrackLayoutSelector;
