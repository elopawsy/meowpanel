import http from '@/api/http';

export interface ServerTemplate {
    id: number;
    name: string;
    description: string | null;
    egg_id: number;
    docker_image: string;
    startup: string;
    environment: Record<string, string>;
    memory: number;
    disk: number;
    cpu: number;
    created_by: number;
    created_at: string;
    egg?: { id: number; name: string };
}

export const getTemplates = async (): Promise<ServerTemplate[]> => {
    const { data } = await http.get('/api/client/templates');
    return data.data;
};

export const getTemplate = async (id: number): Promise<ServerTemplate> => {
    const { data } = await http.get(`/api/client/templates/${id}`);
    return data.data;
};

export const createTemplateFromServer = async (
    uuid: string,
    payload: { name: string; description?: string },
): Promise<ServerTemplate> => {
    const { data } = await http.post(`/api/client/servers/${uuid}/templates`, payload);
    return data.data;
};

export const deleteTemplate = async (id: number): Promise<void> => {
    await http.delete(`/api/client/templates/${id}`);
};
