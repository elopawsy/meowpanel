import http from '@/api/http';

export interface Player {
    name: string;
    uuid: string | null;
}

export interface PlayerListData {
    online: number;
    max: number;
    players: Player[];
    version: string;
    motd: string;
}

export default async (uuid: string): Promise<PlayerListData> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/players`);
    return data;
};

export interface PlayerStats {
    health: number | null;
    max_health: number;
    food_level: number | null;
    xp_level: number | null;
    game_mode: string | null;
    position: { x: number; y: number; z: number } | null;
    dimension: string | null;
}

export interface PlayerDataResponse {
    data?: PlayerStats;
    rcon_enabled: boolean;
    error?: string;
}

export const getPlayerData = async (uuid: string, playerName: string): Promise<PlayerDataResponse> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/players/${playerName}/data`);
    return data;
};
