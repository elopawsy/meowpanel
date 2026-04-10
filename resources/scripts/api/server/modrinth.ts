import http from '@/api/http';

export interface ServerDetection {
    game_version: string | null;
    loader: string | null;
    loader_type: 'mod' | 'plugin';
    directory: 'mods' | 'plugins';
    egg_name: string;
}

export interface ModrinthVersion {
    id: string;
    project_id: string;
    name: string;
    version_number: string;
    date_published: string;
    downloads: number;
    version_type: string;
    loaders: string[];
    game_versions: string[];
    files: {
        url: string;
        filename: string;
        primary: boolean;
        size: number;
        hashes: { sha512: string; sha1: string };
    }[];
}

export interface IdentifiedMod {
    name: string;
    size: number;
    modified_at: string | null;
    modrinth: {
        project_id: string;
        version_id: string;
        version_number: string;
        name: string;
    } | null;
    update_available: {
        version_id: string;
        version_number: string;
        name: string;
        file_url: string;
        file_name: string;
    } | null;
}

export const detectServer = async (uuid: string): Promise<ServerDetection> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/modrinth/detect`);
    return data;
};

export const getModVersions = async (
    uuid: string,
    projectId: string,
    loaders?: string[],
    gameVersions?: string[],
): Promise<ModrinthVersion[]> => {
    const params: Record<string, string> = {};
    if (loaders?.length) params.loaders = JSON.stringify(loaders);
    if (gameVersions?.length) params.game_versions = JSON.stringify(gameVersions);

    const { data } = await http.get(`/api/client/servers/${uuid}/modrinth/versions/${projectId}`, { params });
    return data.data;
};

export const installMod = async (
    uuid: string,
    url: string,
    filename: string,
    directory: string = 'mods',
): Promise<{ success: boolean; filename: string; size: number }> => {
    const { data } = await http.post(`/api/client/servers/${uuid}/modrinth/install`, {
        url,
        filename,
        directory,
    });
    return data;
};

export interface InstalledFile {
    name: string;
    size: number;
    modified_at: string | null;
}

/** Fast listing of .jar files — always works. */
export const getInstalledMods = async (uuid: string, directory: string = 'mods'): Promise<InstalledFile[]> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/modrinth/installed`, {
        params: { directory },
    });
    return data.data;
};

/** Slower: hashes files and looks them up on Modrinth. Can fail gracefully. */
export const identifyInstalledMods = async (
    uuid: string,
    directory: string = 'mods',
    loaders?: string[],
    gameVersions?: string[],
): Promise<IdentifiedMod[]> => {
    const params: Record<string, string> = { directory };
    if (loaders?.length) params.loaders = JSON.stringify(loaders);
    if (gameVersions?.length) params.game_versions = JSON.stringify(gameVersions);

    const { data } = await http.get(`/api/client/servers/${uuid}/modrinth/identify`, { params });
    return data.data;
};

export const uninstallMod = async (uuid: string, filename: string, directory: string = 'mods'): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/modrinth/uninstall`, { filename, directory });
};
