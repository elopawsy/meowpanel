import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import getFileUploadUrl from '@/api/server/files/getFileUploadUrl';
import decompressFiles from '@/api/server/files/decompressFiles';
import deleteFiles from '@/api/server/files/deleteFiles';
import loadDirectory from '@/api/server/files/loadDirectory';
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
            const dir = MOD_DIRS[tab];
            const files = await loadDirectory(uuid, dir);
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
        setError(null);
        try {
            const dir = MOD_DIRS[tab];
            const url = await getFileUploadUrl(uuid);
            await axios.post(url, { files: file }, {
                headers: { 'Content-Type': 'multipart/form-data' },
                params: { directory: dir },
            });
            await decompressFiles(uuid, dir, file.name);
            // delete the zip after extraction
            await deleteFiles(uuid, dir, [file.name]);
            flash(`Installed ${file.name.replace('.zip', '')} successfully.`);
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

            {/* Flash messages */}
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
                    {uploading ? 'Installing...' : `+ Install ${tab === 'cars' ? 'Car' : 'Track'} Mod`}
                </button>
                <span className='text-xs text-zinc-500'>Upload a .zip archive</span>
            </div>

            {/* Mod list */}
            {loading ? (
                <p className='text-xs text-zinc-500 animate-pulse'>Loading {tab}...</p>
            ) : mods.length === 0 ? (
                <p className='text-xs text-zinc-500'>
                    No {tab} found in <code className='text-zinc-400'>{MOD_DIRS[tab]}</code>. Install a mod to get started.
                </p>
            ) : (
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'>
                    {mods.map((mod) => (
                        <div
                            key={mod.name}
                            className='flex items-center justify-between gap-2 px-3 py-2.5 bg-[#ffffff07] border border-[#ffffff10] rounded-lg hover:border-[#ffffff1a] transition-all duration-150'
                        >
                            <div className='flex items-center gap-2 min-w-0'>
                                <span className='text-lg select-none'>
                                    {tab === 'cars' ? '🚗' : '🏁'}
                                </span>
                                <span className='text-sm text-zinc-200 truncate font-mono'>{mod.name}</span>
                            </div>
                            <button
                                onClick={() => onDelete(mod.name)}
                                className='shrink-0 text-xs text-zinc-500 hover:text-red-400 transition-colors duration-150 px-1.5 py-0.5 rounded'
                                title='Delete'
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AssettoCorsaMods;
