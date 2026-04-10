import { type ReactNode, useState } from 'react';

interface CollapsibleSectionProps {
    title: string;
    defaultOpen?: boolean;
    children: ReactNode;
}

const CollapsibleSection = ({ title, defaultOpen = false, children }: CollapsibleSectionProps) => {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className='border border-[#ffffff0d] rounded-xl overflow-hidden'>
            <button
                type='button'
                onClick={() => setOpen(!open)}
                className='w-full flex items-center justify-between px-3 py-2 bg-[#ffffff05] hover:bg-[#ffffff08] transition-colors'
            >
                <span className='text-[11px] font-medium uppercase tracking-wider text-zinc-500'>{title}</span>
                <svg
                    className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    strokeWidth={2}
                >
                    <path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
                </svg>
            </button>
            {open && <div className='p-3 flex flex-col gap-2'>{children}</div>}
        </div>
    );
};

export default CollapsibleSection;
