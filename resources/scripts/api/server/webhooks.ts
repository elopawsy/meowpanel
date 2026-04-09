import http from '@/api/http';

export interface WebhookConfiguration {
    id: number;
    name: string;
    url: string;
    events: string[];
    enabled: boolean;
    server_id: number;
    created_at: string;
    updated_at: string;
}

export const WEBHOOK_EVENTS = [
    { value: 'server.started', label: 'Server Started' },
    { value: 'server.stopped', label: 'Server Stopped' },
    { value: 'server.crashed', label: 'Server Crashed' },
    { value: 'server.installed', label: 'Server Installed' },
    { value: 'server.backup.completed', label: 'Backup Completed' },
    { value: 'server.backup.failed', label: 'Backup Failed' },
] as const;

export const getWebhooks = async (uuid: string): Promise<WebhookConfiguration[]> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/webhooks`);
    return data.data;
};

export const createWebhook = async (
    uuid: string,
    payload: { name: string; url: string; events: string[] },
): Promise<WebhookConfiguration> => {
    const { data } = await http.post(`/api/client/servers/${uuid}/webhooks`, payload);
    return data.data;
};

export const updateWebhook = async (
    uuid: string,
    webhookId: number,
    payload: Partial<{ name: string; url: string; events: string[]; enabled: boolean }>,
): Promise<WebhookConfiguration> => {
    const { data } = await http.put(`/api/client/servers/${uuid}/webhooks/${webhookId}`, payload);
    return data.data;
};

export const deleteWebhook = async (uuid: string, webhookId: number): Promise<void> => {
    await http.delete(`/api/client/servers/${uuid}/webhooks/${webhookId}`);
};

export const testWebhook = async (uuid: string, webhookId: number): Promise<boolean> => {
    const { data } = await http.post(`/api/client/servers/${uuid}/webhooks/${webhookId}/test`);
    return data.success;
};
