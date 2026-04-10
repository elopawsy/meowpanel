import { type ReactNode, useState } from 'react';

interface CollapsibleSectionProps {
    title: string;
    defaultOpen?: boolean;
    children: ReactNode;
}

const CollapsibleSection = ({ title, defaultOpen = false, children }: CollapsibleSectionProps) => {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className='rounded-xl overflow-hidden shadow-md border-[1px] border-[#ffffff07] bg-[#ffffff08]'>
            <button
                type='button'
                onClick={() => setOpen(!open)}
                className='w-full flex items-center justify-between px-6 py-4 hover:bg-[#ffffff04] transition-colors'
            >
                <span className='text-sm font-medium text-[#ffffff77]'>{title}</span>
                <svg
                    className={`w-4 h-4 text-[#ffffff44] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    strokeWidth={2}
                >
                    <path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
                </svg>
            </button>
            {open && <div className='px-6 pb-6 flex flex-col gap-3'>{children}</div>}
        </div>
    );
};

export default CollapsibleSection;
