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
    <div className='flex flex-col gap-2'>
        {label && <label className='text-sm text-[#ffffff77]'>{label}</label>}
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className='px-4 py-2 rounded-lg outline-hidden bg-[#ffffff17] text-sm'
        />
        {hint && <span className='text-xs text-[#ffffff44]'>{hint}</span>}
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
    <div className='flex items-center justify-between gap-4 py-2'>
        <span className='text-sm text-[#ffffff77]'>{label}</span>
        <button
            type='button'
            onClick={() => onChange(value === '1' ? '0' : '1')}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${value === '1' ? 'bg-brand' : 'bg-[#ffffff20]'}`}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${value === '1' ? 'translate-x-5' : 'translate-x-0'}`}
            />
        </button>
    </div>
);

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <p className='text-xl font-extrabold tracking-tight mt-6 mb-3'>{children}</p>
);
