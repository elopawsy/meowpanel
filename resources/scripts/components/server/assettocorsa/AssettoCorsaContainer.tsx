import { useState } from 'react';

import AssettoCorsaMods from '@/components/server/assettocorsa/AssettoCorsaMods';
import AssettoCorsaRaceConfig from '@/components/server/assettocorsa/AssettoCorsaRaceConfig';

type Tab = 'mods' | 'config';

const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: 'mods', label: 'Mod Manager', emoji: '📦' },
    { id: 'config', label: 'Race Config', emoji: '🏁' },
];

const AssettoCorsaContainer = () => {
    const [tab, setTab] = useState<Tab>('mods');

    return (
        <div className='p-6 flex flex-col gap-6'>
            <div className='flex flex-col gap-1'>
                <h1 className='text-xl font-bold text-white'>Assetto Corsa</h1>
                <p className='text-sm text-zinc-400'>Manage mods and configure your race server.</p>
            </div>

            {/* Tab navigation */}
            <div className='flex gap-1 bg-[#ffffff06] border border-[#ffffff0d] rounded-xl p-1 w-fit'>
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                            tab === t.id
                                ? 'bg-[#ffffff14] text-white shadow-sm border border-[#ffffff18]'
                                : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        <span>{t.emoji}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className='bg-[#ffffff05] border border-[#ffffff0d] rounded-2xl p-5'>
                {tab === 'mods' && <AssettoCorsaMods />}
                {tab === 'config' && <AssettoCorsaRaceConfig />}
            </div>
        </div>
    );
};

export default AssettoCorsaContainer;
