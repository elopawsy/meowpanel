import { useEffect, useRef, useState } from 'react';

import loadDirectory from '@/api/server/files/loadDirectory';
import { getGlobalDaemonType } from '@/api/server/getServer';
import { ServerContext } from '@/state/server';

interface ModThumbnailProps {
    type: 'cars' | 'tracks';
    name: string;
    className?: string;
}

function getXsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

async function fetchImageBlob(uuid: string, filePath: string): Promise<string> {
    const daemonType = getGlobalDaemonType() ?? 'wings';
    const url = `/api/client/servers/${daemonType}/${uuid}/files/contents?${new URLSearchParams({ file: filePath })}`;

    const response = await fetch(url, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-XSRF-TOKEN': getXsrfToken() },
    });
    if (!response.ok) throw new Error(`${response.status}`);

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) throw new Error('empty');

    const ext = filePath.split('.').pop()?.toLowerCase();
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
    return URL.createObjectURL(new Blob([buffer], { type: mime }));
}

// For tracks: resolve layout subdirectories dynamically.
// AC mods can have ui/preview.png (simple) or ui/{layout}/preview.png (multi-layout).
async function resolveTrackCandidates(uuid: string, name: string): Promise<string[]> {
    const base = `content/tracks/${name}`;
    const direct = [`${base}/ui/preview.png`, `${base}/ui/preview.jpg`];

    try {
        const entries = await loadDirectory(uuid, `${base}/ui`);
        const layoutDirs = entries.filter((e) => !e.isFile).map((e) => e.name);
        const layoutPaths = layoutDirs.flatMap((layout) => [
            `${base}/ui/${layout}/preview.png`,
            `${base}/ui/${layout}/preview.jpg`,
        ]);
        return [...direct, ...layoutPaths];
    } catch {
        return direct;
    }
}

const carCandidates = (name: string) => [
    `content/cars/${name}/ui/badge.png`,
    `content/cars/${name}/ui/badge.jpg`,
    `content/cars/${name}/ui/car.png`,
];

const Placeholder = ({ type, className }: { type: 'cars' | 'tracks'; className: string }) => (
    <div className={`flex items-center justify-center bg-[#ffffff07] text-zinc-600 ${className}`}>
        {type === 'cars' ? (
            <svg width='28' height='28' viewBox='0 0 24 24' fill='none'>
                <path d='M5 13L6.5 8.5H17.5L19 13' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/>
                <rect x='3' y='13' width='18' height='5' rx='2' stroke='currentColor' strokeWidth='1.5'/>
                <circle cx='7.5' cy='18' r='1.5' fill='currentColor'/>
                <circle cx='16.5' cy='18' r='1.5' fill='currentColor'/>
            </svg>
        ) : (
            <svg width='28' height='28' viewBox='0 0 24 24' fill='none'>
                <path d='M3 17L7 7L12 14L16 9L21 17H3Z' stroke='currentColor' strokeWidth='1.5' strokeLinejoin='round'/>
                <path d='M3 17H21' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'/>
            </svg>
        )}
    </div>
);

const ModThumbnail = ({ type, name, className = '' }: ModThumbnailProps) => {
    const uuid = ServerContext.useStoreState((s) => s.server.data!.uuid);
    const [src, setSrc] = useState<string | null>(null);
    const created = useRef<string[]>([]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            setSrc(null);

            const candidates =
                type === 'cars'
                    ? carCandidates(name)
                    : await resolveTrackCandidates(uuid, name);

            for (const path of candidates) {
                if (cancelled) return;
                try {
                    const url = await fetchImageBlob(uuid, path);
                    if (cancelled) { URL.revokeObjectURL(url); return; }
                    created.current.push(url);
                    setSrc(url);
                    return;
                } catch {
                    // try next
                }
            }
        })();

        return () => {
            cancelled = true;
            created.current.forEach(URL.revokeObjectURL);
            created.current = [];
        };
    }, [uuid, type, name]);

    if (src) return <img src={src} alt={name} className={`object-cover ${className}`} />;
    return <Placeholder type={type} className={className} />;
};

export default ModThumbnail;
