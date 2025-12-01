import { api } from '../../services/api';
import type { CollaborationState } from '../../types/collaboration';

const base = (workspaceId: string) => `/collab/workspaces/${workspaceId}`;

export const CollabApi = {
  fetchState(workspaceId: string) {
    return api.get<CollaborationState>(`${base(workspaceId)}/state`).then((res) => res.data);
  },
  createInvite(
    workspaceId: string,
    payload: { email: string; role: string; message?: string; invitedBy?: string },
  ) {
    return api.post<CollaborationState>(`${base(workspaceId)}/invites`, payload).then((res) => res.data);
  },
  revokeInvite(workspaceId: string, inviteId: string) {
    return api.patch<CollaborationState>(`${base(workspaceId)}/invites/${inviteId}/revoke`, {}).then((res) => res.data);
  },
  createShareLink(
    workspaceId: string,
    payload: { label: string; scope: 'workspace' | 'collection'; expiresInHours?: number; requiresApproval?: boolean; maxUses?: number },
  ) {
    return api.post<CollaborationState>(`${base(workspaceId)}/share-links`, payload).then((res) => res.data);
  },
  revokeShareLink(workspaceId: string, linkId: string) {
    return api.patch<CollaborationState>(`${base(workspaceId)}/share-links/${linkId}/revoke`, {}).then((res) => res.data);
  },
  scheduleSession(
    workspaceId: string,
    payload: { title: string; hostId: string; scheduledAt: string; timezone: string; agenda: string },
  ) {
    return api.post<CollaborationState>(`${base(workspaceId)}/sessions`, payload).then((res) => res.data);
  },
  startSession(workspaceId: string, sessionId: string) {
    return api.patch<CollaborationState>(`${base(workspaceId)}/sessions/${sessionId}/start`, {}).then((res) => res.data);
  },
  endSession(workspaceId: string, sessionId: string) {
    return api.patch<CollaborationState>(`${base(workspaceId)}/sessions/${sessionId}/end`, {}).then((res) => res.data);
  },
  addComment(workspaceId: string, payload: { userId: string; userName?: string; message: string }) {
    return api.post<CollaborationState>(`${base(workspaceId)}/comments`, payload).then((res) => res.data);
  },
};
