import http from '@/api/http';
import { getGlobalDaemonType } from '@/api/server/getServer';

export const getPublicStatus = async (uuid: string): Promise<boolean> => {
    const { data } = await http.get(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/settings/public-status`);
    return data.public_status_enabled;
};

export const togglePublicStatus = async (uuid: string): Promise<boolean> => {
    const { data } = await http.post(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/settings/public-status`);
    return data.public_status_enabled;
};
