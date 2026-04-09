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
