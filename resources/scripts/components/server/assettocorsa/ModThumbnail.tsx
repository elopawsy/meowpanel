import { useEffect, useState } from 'react';

import getFileDownloadUrl from '@/api/server/files/getFileDownloadUrl';
import { ServerContext } from '@/state/server';

interface ModThumbnailProps {
    type: 'cars' | 'tracks';
    name: string;
    className?: string;
}

// AC standard image paths per content type
const imageCandidates = (type: 'cars' | 'tracks', name: string): string[] =>
    type === 'cars'
        ? [`content/cars/${name}/ui/badge.png`, `content/cars/${name}/ui/car.png`]
        : [`content/tracks/${name}/ui/preview.png`, `content/tracks/${name}/preview.png`];

const ModThumbnail = ({ type, name, className = '' }: ModThumbnailProps) => {
    const uuid = ServerContext.useStoreState((s) => s.server.data!.uuid);
    const [src, setSrc] = useState<string | null>(null);
    const [tried, setTried] = useState(0);

    const candidates = imageCandidates(type, name);

    useEffect(() => {
        let cancelled = false;
        const tryNext = async (index: number) => {
            if (index >= candidates.length) {
                if (!cancelled) setSrc(null);
                return;
            }
            try {
                const url = await getFileDownloadUrl(uuid, candidates[index]);
                if (!cancelled) setSrc(url);
            } catch {
                if (!cancelled) tryNext(index + 1);
            }
        };
        setSrc(null);
        setTried(0);
        tryNext(0);
        return () => { cancelled = true; };
    }, [uuid, type, name]);

    const placeholder = (
        <div
            className={`flex items-center justify-center bg-[#ffffff07] text-zinc-600 ${className}`}
            aria-label={name}
        >
            {type === 'cars' ? (
                <svg width='32' height='32' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                    <path d='M5 13L6.5 8.5H17.5L19 13' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/>
                    <rect x='3' y='13' width='18' height='5' rx='2' stroke='currentColor' strokeWidth='1.5'/>
                    <circle cx='7.5' cy='18' r='1.5' fill='currentColor'/>
                    <circle cx='16.5' cy='18' r='1.5' fill='currentColor'/>
                </svg>
            ) : (
                <svg width='32' height='32' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                    <path d='M3 17L7 7L12 14L16 9L21 17H3Z' stroke='currentColor' strokeWidth='1.5' strokeLinejoin='round'/>
                    <path d='M3 17H21' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'/>
                </svg>
            )}
        </div>
    );

    if (!src) return placeholder;

    return (
        <img
            src={src}
            alt={name}
            className={`object-cover ${className}`}
            onError={() => {
                const next = tried + 1;
                setTried(next);
                if (next < candidates.length) {
                    getFileDownloadUrl(uuid, candidates[next]).then(setSrc).catch(() => setSrc(null));
                } else {
                    setSrc(null);
                }
            }}
        />
    );
};

export default ModThumbnail;
