import loadDirectory from '@/api/server/files/loadDirectory';

const layoutCache = new Map<string, string[]>();

/**
 * Detect available track layouts by listing subdirectories of /content/tracks/{track}/ui/.
 * Returns layout names (e.g. ['gp', 'sprint', 'drift']) or empty array if no layouts.
 */
export async function detectTrackLayouts(uuid: string, trackName: string): Promise<string[]> {
    if (!trackName) return [];

    const cacheKey = `${uuid}:${trackName}`;
    if (layoutCache.has(cacheKey)) return layoutCache.get(cacheKey)!;

    try {
        const entries = await loadDirectory(uuid, `/content/tracks/${trackName}/ui`);
        const layouts = entries
            .filter((f) => !f.isFile)
            .map((f) => f.name)
            .sort();

        layoutCache.set(cacheKey, layouts);
        return layouts;
    } catch {
        layoutCache.set(cacheKey, []);
        return [];
    }
}

export function clearLayoutCache() {
    layoutCache.clear();
}
