import { useEffect, useRef, useState } from 'react';

interface SearchableSelectProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const SearchableSelect = ({ options, value, onChange, placeholder = 'Search...', className = '' }: SearchableSelectProps) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const filtered = search
        ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
        : options;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus();
        }
    }, [open]);

    const displayValue = value || placeholder;

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                type='button'
                onClick={() => { setOpen(!open); setSearch(''); }}
                className='w-full px-4 py-2 rounded-lg bg-[#ffffff17] text-sm text-left outline-hidden flex items-center justify-between gap-2'
            >
                <span className={`truncate font-mono ${value ? 'text-white' : 'text-[#ffffff44]'}`}>
                    {displayValue}
                </span>
                <svg
                    className={`w-3.5 h-3.5 text-[#ffffff44] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    strokeWidth={2}
                >
                    <path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
                </svg>
            </button>

            {open && (
                <div className='absolute z-50 mt-1 w-full rounded-xl overflow-hidden shadow-xl border-[1px] border-[#ffffff12] bg-[#ffffff08]'>
                    <div className='p-2'>
                        <input
                            ref={inputRef}
                            type='text'
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={placeholder}
                            className='w-full px-4 py-2 rounded-lg bg-[#ffffff17] text-sm outline-hidden font-mono'
                        />
                    </div>
                    <div className='max-h-48 overflow-y-auto'>
                        {filtered.length === 0 ? (
                            <p className='px-4 py-3 text-sm text-[#ffffff44]'>No results</p>
                        ) : (
                            filtered.map((option) => (
                                <button
                                    key={option}
                                    type='button'
                                    onClick={() => {
                                        onChange(option);
                                        setOpen(false);
                                        setSearch('');
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm font-mono transition-colors ${
                                        option === value
                                            ? 'bg-brand/20 text-white'
                                            : 'text-[#ffffff88] hover:bg-[#ffffff11]'
                                    }`}
                                >
                                    {option || '(Default)'}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
