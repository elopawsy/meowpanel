import ModThumbnail from '@/components/server/assettocorsa/ModThumbnail';
import SearchableSelect from '@/components/server/assettocorsa/SearchableSelect';
import type { EntrySlot } from '@/components/server/assettocorsa/iniParser';

const EntryListEditor = ({
    slots,
    onChange,
    installedCars,
}: {
    slots: EntrySlot[];
    onChange: (s: EntrySlot[]) => void;
    installedCars: string[];
}) => {
    const update = (i: number, patch: Partial<EntrySlot>) =>
        onChange(slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

    const addSlot = () =>
        onChange([
            ...slots,
            { car: installedCars[0] ?? '', skin: 'default', driverName: '', guid: '', spectator: false },
        ]);

    const removeSlot = (i: number) => onChange(slots.filter((_, idx) => idx !== i));

    return (
        <div className='flex flex-col gap-3'>
            <div className='flex items-center justify-between'>
                <p className='text-xs text-zinc-400'>
                    {slots.length} slot{slots.length !== 1 ? 's' : ''}
                </p>
                <button
                    onClick={addSlot}
                    className='px-3 py-1.5 rounded-lg text-xs font-medium bg-[#ffffff10] border border-[#ffffff18] text-white hover:bg-[#ffffff1a] transition-all duration-150'
                >
                    + Add slot
                </button>
            </div>

            {slots.length === 0 ? (
                <p className='text-xs text-zinc-600 py-4 text-center'>No slots. Add one to build the entry list.</p>
            ) : (
                <div className='flex flex-col gap-2'>
                    {slots.map((slot, i) => (
                        <div
                            key={i}
                            className='flex items-center gap-3 bg-[#ffffff06] border border-[#ffffff0e] rounded-xl px-3 py-2.5'
                        >
                            <ModThumbnail type='cars' name={slot.car} className='w-12 h-12 rounded-lg shrink-0' />

                            <span className='text-xs text-zinc-600 w-5 shrink-0'>#{i}</span>

                            <div className='flex flex-col gap-0.5 min-w-0 flex-1'>
                                <label className='text-[10px] text-zinc-500'>Car</label>
                                {installedCars.length > 0 ? (
                                    <SearchableSelect
                                        options={installedCars}
                                        value={slot.car}
                                        onChange={(v) => update(i, { car: v })}
                                        placeholder='Search cars...'
                                    />
                                ) : (
                                    <input
                                        type='text'
                                        value={slot.car}
                                        onChange={(e) => update(i, { car: e.target.value })}
                                        placeholder='ks_ferrari_488_gt3'
                                        className='bg-[#ffffff08] border border-[#ffffff12] rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-[#ffffff30] w-full font-mono placeholder:text-zinc-600'
                                    />
                                )}
                            </div>

                            <div className='flex flex-col gap-0.5 w-28 shrink-0'>
                                <label className='text-[10px] text-zinc-500'>Skin</label>
                                <input
                                    type='text'
                                    value={slot.skin}
                                    onChange={(e) => update(i, { skin: e.target.value })}
                                    placeholder='default'
                                    className='bg-[#ffffff08] border border-[#ffffff12] rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-[#ffffff30] font-mono placeholder:text-zinc-600'
                                />
                            </div>

                            <div className='flex flex-col gap-0.5 w-32 shrink-0'>
                                <label className='text-[10px] text-zinc-500'>Driver</label>
                                <input
                                    type='text'
                                    value={slot.driverName}
                                    onChange={(e) => update(i, { driverName: e.target.value })}
                                    placeholder='Open'
                                    className='bg-[#ffffff08] border border-[#ffffff12] rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-[#ffffff30] placeholder:text-zinc-600'
                                />
                            </div>

                            <div className='flex flex-col gap-0.5 w-36 shrink-0 hidden lg:flex'>
                                <label className='text-[10px] text-zinc-500'>Steam GUID</label>
                                <input
                                    type='text'
                                    value={slot.guid}
                                    onChange={(e) => update(i, { guid: e.target.value })}
                                    placeholder='76561198...'
                                    className='bg-[#ffffff08] border border-[#ffffff12] rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-[#ffffff30] font-mono placeholder:text-zinc-600'
                                />
                            </div>

                            <div className='flex flex-col items-center gap-0.5 shrink-0'>
                                <label className='text-[10px] text-zinc-500'>Spec</label>
                                <button
                                    onClick={() => update(i, { spectator: !slot.spectator })}
                                    className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${slot.spectator ? 'bg-blue-500' : 'bg-[#ffffff20]'}`}
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200 ${slot.spectator ? 'translate-x-4' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>

                            <button
                                onClick={() => removeSlot(i)}
                                className='shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150'
                            >
                                <svg width='10' height='10' viewBox='0 0 10 10' fill='none'>
                                    <path
                                        d='M1 1L9 9M9 1L1 9'
                                        stroke='currentColor'
                                        strokeWidth='1.5'
                                        strokeLinecap='round'
                                    />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EntryListEditor;
