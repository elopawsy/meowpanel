import type React from 'react';

export const Field = ({
    label,
    value,
    onChange,
    type = 'text',
    hint,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: 'text' | 'number' | 'password';
    hint?: string;
    placeholder?: string;
}) => (
    <div className='flex flex-col gap-1'>
        <label className='text-xs text-zinc-400'>{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className='bg-[#ffffff08] border border-[#ffffff12] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#ffffff30] transition-colors placeholder:text-zinc-600'
        />
        {hint && <span className='text-[10px] text-zinc-600'>{hint}</span>}
    </div>
);

export const Toggle = ({
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
            className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${value === '1' ? 'bg-green-500' : 'bg-[#ffffff20]'}`}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${value === '1' ? 'translate-x-5' : 'translate-x-0'}`}
            />
        </button>
    </div>
);

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className='text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-5 mb-2 border-b border-[#ffffff10] pb-1'>
        {children}
    </h3>
);
