import { request } from './client';

export interface EnvironmentVariable {
  key: string;
  value: string;
}

export interface Environment {
  id: string;
  name: string;
  workspaceId: string;
  variables: EnvironmentVariable[];
  updatedAt?: string;
}

export const listEnvironments = async (workspaceId?: string): Promise<Environment[]> => {
  return request<Environment[]>({
    url: '/api/workspaces/environments',
    method: 'GET',
    params: workspaceId ? { workspaceId } : undefined
  });
};

export const updateEnvironmentVariable = async (
  environmentId: string,
  key: string,
  value: string
): Promise<Environment> => {
  return request<Environment>({
    url: `/api/workspaces/environments/${environmentId}/variables`,
    method: 'PUT',
    data: { key, value }
  });
};

export const getEnvironment = async (environmentId: string): Promise<Environment> => {
  return request<Environment>({
    url: `/api/workspaces/environments/${environmentId}`,
    method: 'GET'
  });
};
