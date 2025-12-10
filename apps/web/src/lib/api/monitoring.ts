import { apiFetch } from './client';

export interface Monitor {
    id: string;
    workspaceId: string;
    requestId: string;
    name: string;
    schedule: string;
    enabled: boolean;
    regions: string[];
    alertOnFailure: boolean;
    alertChannels?: any;
    request: {
        name: string;
        method: string;
        url: string;
    };
    runs?: MonitorRun[];
    stats?: {
        uptime: number;
        totalRuns: number;
        successfulRuns: number;
        failedRuns: number;
        avgResponseTime: number;
    };
}

export interface MonitorRun {
    id: string;
    monitorId: string;
    status: string;
    statusCode?: number;
    responseTime: number;
    errorMessage?: string;
    region: string;
    executedAt: string;
}

export const monitoringApi = {
    async createMonitor(
        workspaceId: string,
        data: {
            requestId: string;
            name: string;
            schedule: string;
            regions?: string[];
            alertOnFailure?: boolean;
            alertChannels?: any;
        }
    ) {
        const response = await apiFetch(
            `/workspaces/${workspaceId}/monitors`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            }
        );
        return response.json();
    },

    async listMonitors(workspaceId: string) {
        const response = await apiFetch(`/workspaces/${workspaceId}/monitors`);
        return response.json();
    },

    async getMonitor(id: string) {
        const response = await apiFetch(`/monitors/${id}`);
        return response.json();
    },

    async updateMonitor(
        id: string,
        data: {
            name?: string;
            schedule?: string;
            enabled?: boolean;
            alertOnFailure?: boolean;
            alertChannels?: any;
        }
    ) {
        const response = await apiFetch(
            `/monitors/${id}`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            }
        );
        return response.json();
    },

    async deleteMonitor(id: string) {
        const response = await apiFetch(`/monitors/${id}`, { method: 'DELETE' });
        return response.json();
    },

    async triggerRun(id: string) {
        const response = await apiFetch(`/monitors/${id}/run`, { method: 'POST' });
        return response.json();
    },

    async getRunHistory(id: string, page = 1, pageSize = 50) {
        const response = await apiFetch(
            `/monitors/${id}/runs?page=${page}&pageSize=${pageSize}`
        );
        return response.json();
    },
};
