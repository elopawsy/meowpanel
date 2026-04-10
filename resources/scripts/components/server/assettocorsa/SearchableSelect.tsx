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
                className='w-full bg-[#ffffff08] border border-[#ffffff12] rounded-lg px-3 py-1.5 text-sm text-left focus:outline-none focus:border-[#ffffff30] transition-colors flex items-center justify-between gap-2'
            >
                <span className={`truncate font-mono ${value ? 'text-white' : 'text-zinc-600'}`}>
                    {displayValue}
                </span>
                <svg
                    className={`w-3 h-3 text-zinc-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    strokeWidth={2}
                >
                    <path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
                </svg>
            </button>

            {open && (
                <div className='absolute z-50 mt-1 w-full bg-[#1a1a1a] border border-[#ffffff18] rounded-lg shadow-xl overflow-hidden'>
                    <div className='p-1.5'>
                        <input
                            ref={inputRef}
                            type='text'
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={placeholder}
                            className='w-full px-2.5 py-1.5 rounded-md bg-[#ffffff0a] border border-[#ffffff12] text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-blue-500'
                        />
                    </div>
                    <div className='max-h-48 overflow-y-auto'>
                        {filtered.length === 0 ? (
                            <p className='px-3 py-2 text-xs text-zinc-600'>No results</p>
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
                                    className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors ${
                                        option === value
                                            ? 'bg-blue-600/20 text-blue-300'
                                            : 'text-zinc-300 hover:bg-[#ffffff0a]'
                                    }`}
                                >
                                    {option}
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
