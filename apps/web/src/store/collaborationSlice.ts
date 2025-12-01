import type { StateCreator } from 'zustand';
import {
  fetchCollaborationState,
  fetchComments,
  postComment,
  createCollaborationSession,
} from '../lib/api/collaboration';
import { API_BASE_URL } from '../lib/config/api';
import type {
  CollaborationActivity,
  CollaborationComment,
  CollaborationMember,
  CollaborationRole,
  CollaborationState,
  LiveSession,
  ShareLink,
  ShareScope,
} from '../types/collaboration';
import { createId } from './utils';
import type { AppState } from './types';

const MAX_ACTIVITY = 50;
let collaborationSocket: WebSocket | null = null;

function addDays(base: Date, days: number) {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addHours(base: Date, hours: number) {
  const copy = new Date(base);
  copy.setHours(copy.getHours() + hours);
  return copy;
}

function addMinutes(base: Date, minutes: number) {
  const copy = new Date(base);
  copy.setMinutes(copy.getMinutes() + minutes);
  return copy;
}

function pushActivity(state: CollaborationState, activity: Omit<CollaborationActivity, 'id' | 'createdAt'> & { id?: string }) {
  state.activity.unshift({
    id: activity.id ?? createId(),
    createdAt: new Date().toISOString(),
    severity: activity.severity,
    actor: activity.actor,
    type: activity.type,
    message: activity.message,
  });
  if (state.activity.length > MAX_ACTIVITY) {
    state.activity.length = MAX_ACTIVITY;
  }
}

function resolveCollabSocketUrl(): string | null {
  if (API_BASE_URL) {
    const ws = API_BASE_URL.replace(/^http/i, 'ws');
    return `${ws.replace(/\/$/, '')}/collab`; // TODO: confirm backend websocket path
  }
  if (typeof window !== 'undefined') {
    const ws = window.location.origin.replace(/^http/i, 'ws');
    return `${ws}/collab`;
  }
  return null;
}

export function createInitialCollaborationState(): CollaborationState {
  return {
    members: [],
    invites: [],
    shareLinks: [],
    liveSessions: [],
    residency: [],
    comments: [],
    activity: [],
  };
}

export interface CollaborationSlice {
  collaboration: CollaborationState;
  syncCollaboration: () => Promise<void>;
  connectCollaborationSocket: () => void;
  inviteMember: (payload: { email: string; role: CollaborationRole; message?: string; invitedBy?: string }) => void;
  updateMemberRole: (memberId: string, role: CollaborationRole) => void;
  removeMember: (memberId: string) => void;
  updateMemberPresence: (memberId: string, presence: CollaborationMember['presence']) => void;
  resendInvite: (inviteId: string) => void;
  revokeInvite: (inviteId: string) => void;
  createShareLink: (payload: { label: string; scope: ShareScope; expiresInHours?: number; requiresApproval?: boolean; maxUses?: number }) => ShareLink;
  revokeShareLink: (linkId: string) => void;
  scheduleLiveSession: (payload: { title: string; hostId: string; scheduledAt: string; timezone: string; agenda: string }) => Promise<void>;
  startLiveSession: (sessionId: string) => void;
  endLiveSession: (sessionId: string) => void;
  joinLiveSession: (sessionId: string, memberId: string) => void;
  leaveLiveSession: (sessionId: string, memberId: string) => void;
  addComment: (payload: { userId?: string; message: string }) => Promise<void>;
  setResidencyPrimary: (region: string) => void;
  scheduleResidencyCutover: (region: string, cutoverAt: string) => void;
}

export const createCollaborationSlice: StateCreator<AppState, [['zustand/immer', never]], [], CollaborationSlice> = (
  set,
  get,
) => ({
  collaboration: createInitialCollaborationState(),
  async syncCollaboration() {
    try {
      const [state, comments] = await Promise.all([fetchCollaborationState(), fetchComments()]);
      set((draft) => {
        draft.collaboration = {
          ...createInitialCollaborationState(),
          ...state,
          comments,
        };
      });
    } catch (error) {
      console.error('[collaboration] Failed to sync state', error);
    }
  },
  connectCollaborationSocket() {
    const url = resolveCollabSocketUrl();
    if (!url || collaborationSocket) return;
    try {
      collaborationSocket = new WebSocket(url);
      const closeSocket = () => {
        collaborationSocket?.close();
        collaborationSocket = null;
      };
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', closeSocket, { once: true });
      }
      collaborationSocket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === 'presence') {
            const { memberId, presence } = payload;
            set((draft) => {
              const member = draft.collaboration.members.find((item) => item.id === memberId);
              if (member) {
                member.presence = presence;
                member.lastActiveAt = new Date().toISOString();
              }
            });
          }
          if (payload?.type === 'typing') {
            pushActivity(get().collaboration, {
              actor: payload.actor ?? 'Collaborator',
              message: payload.message ?? 'is typing…',
              severity: 'info',
              type: 'typing',
            });
          }
          if (payload?.type === 'comment') {
            set((draft) => {
              draft.collaboration.comments.unshift(payload.comment as CollaborationComment);
            });
          }
        } catch (err) {
          console.warn('[collaboration] Failed to parse websocket payload', err);
        }
      };
      collaborationSocket.onclose = () => {
        collaborationSocket = null;
      };
    } catch (error) {
      console.warn('[collaboration] Failed to establish websocket', error);
    }
  },
  inviteMember({ email, role, message, invitedBy }) {
    const now = new Date();
    set((draft) => {
      draft.collaboration.invites.unshift({
        id: createId(),
        email,
        role,
        invitedBy: invitedBy ?? draft.collaboration.members[0]?.name ?? 'System',
        status: 'pending',
        createdAt: now.toISOString(),
        expiresAt: addDays(now, 7).toISOString(),
        message,
      });
      pushActivity(draft.collaboration, {
        actor: invitedBy ?? draft.collaboration.members[0]?.name ?? 'System',
        message: `Sent ${role} invite to ${email}.`,
        severity: 'info',
        type: 'invite-sent',
      });
    });
  },
  updateMemberRole(memberId, role) {
    set((draft) => {
      const member = draft.collaboration.members.find((item) => item.id === memberId);
      if (!member) return;
      member.role = role;
      pushActivity(draft.collaboration, {
        actor: member.name,
        message: `${member.name} is now a ${role}.`,
        severity: 'info',
        type: 'role-change',
      });
    });
  },
  removeMember(memberId) {
    set((draft) => {
      const member = draft.collaboration.members.find((item) => item.id === memberId);
      draft.collaboration.members = draft.collaboration.members.filter((item) => item.id !== memberId);
      if (member) {
        pushActivity(draft.collaboration, {
          actor: member.name,
          message: `${member.name} was removed from the workspace.`,
          severity: 'warning',
          type: 'member-removed',
        });
        draft.collaboration.liveSessions.forEach((session) => {
          session.participants = session.participants.filter((participant) => participant !== memberId);
        });
      }
    });
  },
  updateMemberPresence(memberId, presence) {
    set((draft) => {
      const member = draft.collaboration.members.find((item) => item.id === memberId);
      if (!member) return;
      member.presence = presence;
      member.lastActiveAt = new Date().toISOString();
    });
  },
  resendInvite(inviteId) {
    set((draft) => {
      const invite = draft.collaboration.invites.find((item) => item.id === inviteId);
      if (!invite) return;
      const now = new Date();
      invite.createdAt = now.toISOString();
      invite.expiresAt = addDays(now, 7).toISOString();
      invite.status = 'pending';
    });
  },
  revokeInvite(inviteId) {
    set((draft) => {
      const invite = draft.collaboration.invites.find((item) => item.id === inviteId);
      if (!invite) return;
      invite.status = 'revoked';
      pushActivity(draft.collaboration, {
        actor: draft.collaboration.members[0]?.name ?? 'System',
        message: `Revoked invite for ${invite.email}.`,
        severity: 'warning',
        type: 'invite-revoked',
      });
    });
  },
  createShareLink({ label, scope, expiresInHours, requiresApproval = false, maxUses }) {
    const now = new Date();
    const link: ShareLink = {
      id: createId(),
      label,
      scope,
      createdAt: now.toISOString(),
      expiresAt: expiresInHours ? addHours(now, expiresInHours).toISOString() : undefined,
      status: 'active',
      requiresApproval,
      url: `${API_BASE_URL || window.location.origin}/share/${createId()}`,
      maxUses,
      usageCount: 0,
    };
    set((draft) => {
      draft.collaboration.shareLinks.unshift(link);
      pushActivity(draft.collaboration, {
        actor: draft.collaboration.members[0]?.name ?? 'System',
        message: `Created ${scope} link “${label}”.`,
        severity: 'info',
        type: 'link-created',
      });
    });
    return link;
  },
  revokeShareLink(linkId) {
    set((draft) => {
      const link = draft.collaboration.shareLinks.find((item) => item.id === linkId);
      if (!link) return;
      link.status = 'revoked';
      pushActivity(draft.collaboration, {
        actor: draft.collaboration.members[0]?.name ?? 'System',
        message: `Revoked link “${link.label}”.`,
        severity: 'warning',
        type: 'link-revoked',
      });
    });
  },
  async scheduleLiveSession({ title, hostId, scheduledAt, timezone, agenda }) {
    const session: LiveSession = {
      id: createId(),
      title,
      hostId,
      status: 'scheduled',
      startedAt: scheduledAt,
      timezone,
      participants: [hostId],
      agenda,
    };
    set((draft) => {
      draft.collaboration.liveSessions.unshift(session);
    });
    pushActivity(get().collaboration, {
      actor: get().collaboration.members.find((member) => member.id === hostId)?.name ?? 'System',
      message: `Scheduled live session “${title}”`,
      severity: 'info',
      type: 'session-scheduled',
    });
    try {
      await createCollaborationSession(session);
    } catch (error) {
      console.warn('[collaboration] Failed to persist live session', error);
    }
  },
  startLiveSession(sessionId) {
    set((draft) => {
      const session = draft.collaboration.liveSessions.find((item) => item.id === sessionId);
      if (!session) return;
      session.status = 'live';
      session.startedAt = new Date().toISOString();
      const host = draft.collaboration.members.find((member) => member.id === session.hostId);
      pushActivity(draft.collaboration, {
        actor: host?.name ?? 'System',
        message: `Started live session “${session.title}”.`,
        severity: 'info',
        type: 'session-started',
      });
    });
  },
  endLiveSession(sessionId) {
    set((draft) => {
      const session = draft.collaboration.liveSessions.find((item) => item.id === sessionId);
      if (!session) return;
      session.status = 'ended';
      const host = draft.collaboration.members.find((member) => member.id === session.hostId);
      pushActivity(draft.collaboration, {
        actor: host?.name ?? 'System',
        message: `Ended live session “${session.title}”.`,
        severity: 'info',
        type: 'session-ended',
      });
    });
  },
  joinLiveSession(sessionId, memberId) {
    set((draft) => {
      const session = draft.collaboration.liveSessions.find((item) => item.id === sessionId);
      if (!session) return;
      if (!session.participants.includes(memberId)) {
        session.participants.push(memberId);
      }
    });
  },
  leaveLiveSession(sessionId, memberId) {
    set((draft) => {
      const session = draft.collaboration.liveSessions.find((item) => item.id === sessionId);
      if (!session) return;
      session.participants = session.participants.filter((participant) => participant !== memberId);
    });
  },
  async addComment({ userId, message }) {
    const optimistic: CollaborationComment = {
      id: createId(),
      userId: userId ?? 'anonymous',
      userName: get().collaboration.members.find((member) => member.id === userId)?.name ?? 'Unknown teammate',
      message,
      createdAt: new Date().toISOString(),
    };
    set((draft) => {
      draft.collaboration.comments.unshift(optimistic);
    });
    pushActivity(get().collaboration, {
      actor: optimistic.userName,
      message: `Commented: ${message.slice(0, 80)}${message.length > 80 ? '…' : ''}`,
      severity: 'info',
      type: 'comment',
    });
    try {
      const saved = await postComment({ message });
      set((draft) => {
        const index = draft.collaboration.comments.findIndex((item) => item.id === optimistic.id);
        if (index !== -1) {
          draft.collaboration.comments[index] = saved;
        } else {
          draft.collaboration.comments.unshift(saved);
        }
      });
    } catch (error) {
      console.warn('[collaboration] Failed to persist comment', error);
    }
  },
  setResidencyPrimary(region) {
    set((draft) => {
      draft.collaboration.residency.forEach((entry) => {
        entry.primary = entry.region === region;
      });
    });
  },
  scheduleResidencyCutover(region, cutoverAt) {
    set((draft) => {
      const entry = draft.collaboration.residency.find((item) => item.region === region);
      if (!entry) return;
      entry.status = 'planned';
      entry.cutoverAt = cutoverAt;
    });
  },
});
