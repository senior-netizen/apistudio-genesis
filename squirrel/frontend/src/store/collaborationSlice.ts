import type { StateCreator } from 'zustand';
import {
  type CollaborationActivity,
  type CollaborationComment,
  type CollaborationInvite,
  type CollaborationMember,
  type CollaborationRole,
  type CollaborationState,
  type LiveSession,
  type ResidencyPreference,
  type ShareLink,
  type ShareScope,
} from '../types/collaboration';
import { createId } from './utils';
import type { AppState } from './types';
import { CollabApi } from '../lib/api/collab';

function pushActivity(state: CollaborationState, activity: Omit<CollaborationActivity, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: string;
}) {
  state.activity.unshift({
    id: activity.id ?? createId(),
    createdAt: activity.createdAt ?? new Date().toISOString(),
    severity: activity.severity,
    actor: activity.actor,
    type: activity.type,
    message: activity.message,
  });
  if (state.activity.length > 50) {
    state.activity.length = 50;
  }
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
  inviteMember: (payload: { email: string; role: CollaborationRole; message?: string; invitedBy?: string }) => Promise<void>;
  updateMemberRole: (memberId: string, role: CollaborationRole) => void;
  removeMember: (memberId: string) => void;
  updateMemberPresence: (memberId: string, presence: CollaborationMember['presence']) => void;
  resendInvite: (inviteId: string) => Promise<void>;
  revokeInvite: (inviteId: string) => Promise<void>;
  createShareLink: (payload: {
    label: string;
    scope: ShareScope;
    expiresInHours?: number;
    requiresApproval?: boolean;
    maxUses?: number;
  }) => Promise<ShareLink | undefined>;
  revokeShareLink: (linkId: string) => Promise<void>;
  scheduleLiveSession: (payload: { title: string; hostId: string; scheduledAt: string; timezone: string; agenda: string }) => Promise<void>;
  startLiveSession: (sessionId: string) => Promise<void>;
  endLiveSession: (sessionId: string) => Promise<void>;
  joinLiveSession: (sessionId: string, memberId: string) => void;
  leaveLiveSession: (sessionId: string, memberId: string) => void;
  addComment: (payload: { userId: string; message: string }) => Promise<void>;
  setResidencyPrimary: (region: string) => void;
  scheduleResidencyCutover: (region: string, cutoverAt: string) => void;
}

export const createCollaborationSlice: StateCreator<AppState, [['zustand/immer', never]], [], CollaborationSlice> = (
  set,
  get,
  _api,
) => ({
  collaboration: createInitialCollaborationState(),
  async syncCollaboration() {
    const workspaceId = get().activeWorkspaceId ?? 'default-workspace';
    try {
      const state = await CollabApi.fetchState(workspaceId);
      set((draft) => {
        draft.collaboration = state;
      });
    } catch (error) {
      console.warn('[collab] failed to sync collaboration state', error);
    }
  },
  async inviteMember({ email, role, message, invitedBy }) {
    try {
      const state = await CollabApi.createInvite(get().activeWorkspaceId ?? 'default-workspace', {
        email,
        role,
        message,
        invitedBy,
      });
      set((draft) => {
        draft.collaboration = state;
      });
    } catch (error) {
      console.warn('[collab] failed to invite member', error);
    }
  },
  updateMemberRole(memberId, role) {
    set((draft) => {
      const member = draft.collaboration.members.find((item) => item.id === memberId);
      if (!member) {
        return;
      }
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
      if (!member) {
        return;
      }
      member.presence = presence;
      member.lastActiveAt = new Date().toISOString();
    });
  },
  async resendInvite(_inviteId) {
    // Backend does not yet support a dedicated resend; re-sync to pick up latest server state.
    await get().syncCollaboration();
  },
  async revokeInvite(inviteId) {
    try {
      const state = await CollabApi.revokeInvite(get().activeWorkspaceId ?? 'default-workspace', inviteId);
      set((draft) => {
        draft.collaboration = state;
      });
    } catch (error) {
      console.warn('[collab] failed to revoke invite', error);
    }
  },
  async createShareLink({ label, scope, expiresInHours, requiresApproval = false, maxUses }) {
    try {
      const state = await CollabApi.createShareLink(get().activeWorkspaceId ?? 'default-workspace', {
        label,
        scope,
        expiresInHours,
        requiresApproval,
        maxUses,
      });
      set((draft) => {
        draft.collaboration = state;
      });
      return state.shareLinks[0];
    } catch (error) {
      console.warn('[collab] failed to create share link', error);
      return undefined;
    }
  },
  async revokeShareLink(linkId) {
    try {
      const state = await CollabApi.revokeShareLink(get().activeWorkspaceId ?? 'default-workspace', linkId);
      set((draft) => {
        draft.collaboration = state;
      });
    } catch (error) {
      console.warn('[collab] failed to revoke share link', error);
    }
  },
  async scheduleLiveSession({ title, hostId, scheduledAt, timezone, agenda }) {
    try {
      const state = await CollabApi.scheduleSession(get().activeWorkspaceId ?? 'default-workspace', {
        title,
        hostId,
        scheduledAt,
        timezone,
        agenda,
      });
      set((draft) => {
        draft.collaboration = state;
      });
    } catch (error) {
      console.warn('[collab] failed to schedule session', error);
    }
  },
  async startLiveSession(sessionId) {
    try {
      const state = await CollabApi.startSession(get().activeWorkspaceId ?? 'default-workspace', sessionId);
      set((draft) => {
        draft.collaboration = state;
      });
    } catch (error) {
      console.warn('[collab] failed to start session', error);
    }
  },
  async endLiveSession(sessionId) {
    try {
      const state = await CollabApi.endSession(get().activeWorkspaceId ?? 'default-workspace', sessionId);
      set((draft) => {
        draft.collaboration = state;
      });
    } catch (error) {
      console.warn('[collab] failed to end session', error);
    }
  },
  joinLiveSession(sessionId, memberId) {
    set((draft) => {
      const session = draft.collaboration.liveSessions.find((item) => item.id === sessionId);
      const member = draft.collaboration.members.find((item) => item.id === memberId);
      if (!session || !member) {
        return;
      }
      if (!session.participants.includes(memberId)) {
        session.participants.push(memberId);
      }
    });
  },
  leaveLiveSession(sessionId, memberId) {
    set((draft) => {
      const session = draft.collaboration.liveSessions.find((item) => item.id === sessionId);
      if (!session) {
        return;
      }
      session.participants = session.participants.filter((participant) => participant !== memberId);
    });
  },
  async addComment({ userId, message }) {
    try {
      const user = get().collaboration.members.find((member) => member.id === userId);
      const state = await CollabApi.addComment(get().activeWorkspaceId ?? 'default-workspace', {
        userId,
        userName: user?.name,
        message,
      });
      set((draft) => {
        draft.collaboration = state;
      });
    } catch (error) {
      console.warn('[collab] failed to add comment', error);
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
      if (!entry) {
        return;
      }
      entry.status = 'planned';
      entry.cutoverAt = cutoverAt;
    });
  },
});
