import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import getFileUploadUrl from '@/api/server/files/getFileUploadUrl';
import decompressFiles from '@/api/server/files/decompressFiles';
import deleteFiles from '@/api/server/files/deleteFiles';
import loadDirectory from '@/api/server/files/loadDirectory';
import ModThumbnail from '@/components/server/assettocorsa/ModThumbnail';
import { ServerContext } from '@/state/server';

type ModType = 'cars' | 'tracks';

interface ModEntry {
    name: string;
}

const MOD_DIRS: Record<ModType, string> = {
    cars: '/content/cars',
    tracks: '/content/tracks',
};

const AssettoCorsaMods = () => {
    const uuid = ServerContext.useStoreState((s) => s.server.data!.uuid);
    const [tab, setTab] = useState<ModType>('cars');
    const [mods, setMods] = useState<ModEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    const fetchMods = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const files = await loadDirectory(uuid, MOD_DIRS[tab]);
            setMods(files.filter((f) => !f.isFile).map((f) => ({ name: f.name })));
        } catch {
            setMods([]);
        } finally {
            setLoading(false);
        }
    }, [uuid, tab]);

    useEffect(() => {
        fetchMods();
    }, [fetchMods]);

    const flash = (msg: string, isError = false) => {
        if (isError) {
            setError(msg);
            setTimeout(() => setError(null), 4000);
        } else {
            setSuccess(msg);
            setTimeout(() => setSuccess(null), 3000);
        }
    };

    const onUpload = async (files: FileList) => {
        const file = files[0];
        if (!file) return;
        if (!file.name.endsWith('.zip')) {
            flash('Only .zip files are supported.', true);
            return;
        }
        setUploading(true);
        try {
            const dir = MOD_DIRS[tab];
            const url = await getFileUploadUrl(uuid);
            await axios.post(url, { files: file }, {
                headers: { 'Content-Type': 'multipart/form-data' },
                params: { directory: dir },
            });
            await decompressFiles(uuid, dir, file.name);
            await deleteFiles(uuid, dir, [file.name]);
            flash(`Installed ${file.name.replace('.zip', '')}.`);
            await fetchMods();
        } catch {
            flash('Failed to install mod. Check the file and try again.', true);
        } finally {
            setUploading(false);
            if (fileInput.current) fileInput.current.value = '';
        }
    };

    const onDelete = async (name: string) => {
        if (!confirm(`Delete ${name}?`)) return;
        try {
            await deleteFiles(uuid, MOD_DIRS[tab], [name]);
            flash(`Deleted ${name}.`);
            setMods((prev) => prev.filter((m) => m.name !== name));
        } catch {
            flash(`Failed to delete ${name}.`, true);
        }
    };

    return (
        <div className='flex flex-col gap-4'>
            {/* Tab bar */}
            <div className='flex gap-1 bg-[#ffffff08] rounded-lg p-1 w-fit'>
                {(['cars', 'tracks'] as ModType[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                            tab === t
                                ? 'bg-[#ffffff18] text-white shadow-sm'
                                : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        {t === 'cars' ? 'Cars' : 'Tracks'}
                    </button>
                ))}
            </div>

            {error && (
                <p className='text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2'>
                    {error}
                </p>
            )}
            {success && (
                <p className='text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2'>
                    {success}
                </p>
            )}

            {/* Upload */}
            <div className='flex items-center gap-3'>
                <input
                    ref={fileInput}
                    type='file'
                    accept='.zip'
                    className='hidden'
                    onChange={(e) => e.currentTarget.files && onUpload(e.currentTarget.files)}
                />
                <button
                    onClick={() => fileInput.current?.click()}
                    disabled={uploading}
                    className='px-4 py-2 rounded-lg text-sm font-medium bg-[#ffffff14] border border-[#ffffff18] text-white hover:bg-[#ffffff20] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150'
                >
                    {uploading ? 'Installing...' : `+ Install ${tab === 'cars' ? 'car' : 'track'} mod`}
                </button>
                <span className='text-xs text-zinc-500'>Upload a .zip archive</span>
            </div>

            {/* Mod grid */}
            {loading ? (
                <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className='rounded-xl overflow-hidden bg-[#ffffff07] border border-[#ffffff0d] animate-pulse'>
                            <div className='h-32 bg-[#ffffff08]' />
                            <div className='px-3 py-2.5'>
                                <div className='h-3 bg-[#ffffff10] rounded w-3/4' />
                            </div>
                        </div>
                    ))}
                </div>
            ) : mods.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                    <p className='text-sm text-zinc-500'>
                        No {tab} found in <code className='text-zinc-400 text-xs'>{MOD_DIRS[tab]}</code>
                    </p>
                    <p className='text-xs text-zinc-600 mt-1'>Install a mod to get started.</p>
                </div>
            ) : (
                <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'>
                    {mods.map((mod) => (
                        <div
                            key={mod.name}
                            className='group relative rounded-xl overflow-hidden bg-[#ffffff07] border border-[#ffffff0d] hover:border-[#ffffff20] transition-all duration-150'
                        >
                            <ModThumbnail
                                type={tab}
                                name={mod.name}
                                className='w-full h-32'
                            />
                            <div className='px-3 py-2.5'>
                                <p className='text-xs text-zinc-200 truncate font-mono leading-tight'>{mod.name}</p>
                            </div>
                            <button
                                onClick={() => onDelete(mod.name)}
                                className='absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-md bg-black/60 text-zinc-400 hover:text-red-400 hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-150 text-xs'
                                title='Delete'
                            >
                                <svg width='10' height='10' viewBox='0 0 10 10' fill='none' xmlns='http://www.w3.org/2000/svg'>
                                    <path d='M1 1L9 9M9 1L1 9' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'/>
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AssettoCorsaMods;
