import { request } from './client';

export interface Workspace {
  id: string;
  name: string;
  slug?: string;
  role?: string;
}

export const listWorkspaces = async (): Promise<Workspace[]> => {
  return request<Workspace[]>({
    url: '/api/workspaces',
    method: 'GET'
  });
};

export const getWorkspace = async (workspaceId: string): Promise<Workspace> => {
  return request<Workspace>({
    url: `/api/workspaces/${workspaceId}`,
    method: 'GET'
  });
};
