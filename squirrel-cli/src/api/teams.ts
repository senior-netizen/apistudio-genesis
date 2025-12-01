import { request } from './client';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface TeamMember {
  id: string;
  email: string;
  name?: string;
  role: WorkspaceRole;
  joinedAt?: string;
  lastActiveAt?: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  invitedBy?: string;
  expiresAt?: string;
}

export const listTeamMembers = async (workspaceId: string): Promise<TeamMember[]> => {
  return request<TeamMember[]>({
    url: `/api/workspaces/${workspaceId}/members`,
    method: 'GET'
  });
};

export const listInvitations = async (workspaceId: string): Promise<TeamInvitation[]> => {
  return request<TeamInvitation[]>({
    url: `/api/workspaces/${workspaceId}/invitations`,
    method: 'GET'
  });
};

export const inviteTeamMember = async (
  workspaceId: string,
  email: string,
  role: WorkspaceRole
): Promise<TeamInvitation> => {
  return request<TeamInvitation>({
    url: `/api/workspaces/${workspaceId}/invitations`,
    method: 'POST',
    data: { email, role }
  });
};

export const updateMemberRole = async (
  workspaceId: string,
  memberId: string,
  role: WorkspaceRole
): Promise<TeamMember> => {
  return request<TeamMember>({
    url: `/api/workspaces/${workspaceId}/members/${memberId}`,
    method: 'PATCH',
    data: { role }
  });
};

export const removeMember = async (workspaceId: string, memberId: string): Promise<void> => {
  await request<void>({
    url: `/api/workspaces/${workspaceId}/members/${memberId}`,
    method: 'DELETE'
  });
};

export const cancelInvitation = async (workspaceId: string, invitationId: string): Promise<void> => {
  await request<void>({
    url: `/api/workspaces/${workspaceId}/invitations/${invitationId}`,
    method: 'DELETE'
  });
};
