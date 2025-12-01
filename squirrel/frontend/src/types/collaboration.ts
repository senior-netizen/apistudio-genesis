import type { Ulid } from './api';

export type CollaborationRole = 'admin' | 'maintainer' | 'editor' | 'viewer';

export type CollaborationPresence = 'online' | 'idle' | 'offline';

export interface CollaborationMember {
  id: Ulid;
  name: string;
  email: string;
  role: CollaborationRole;
  presence: CollaborationPresence;
  lastActiveAt: string;
  location?: string;
  avatarColor?: string;
}

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface CollaborationInvite {
  id: Ulid;
  email: string;
  role: CollaborationRole;
  invitedBy: string;
  status: InviteStatus;
  createdAt: string;
  expiresAt: string;
  message?: string;
}

export type ShareScope = 'workspace' | 'collection' | 'environment';

export type ShareStatus = 'active' | 'revoked' | 'expired';

export interface ShareLink {
  id: Ulid;
  label: string;
  url: string;
  scope: ShareScope;
  createdAt: string;
  expiresAt?: string;
  status: ShareStatus;
  requiresApproval: boolean;
  maxUses?: number;
  usageCount: number;
}

export type SessionStatus = 'scheduled' | 'live' | 'ended';

export interface LiveSession {
  id: Ulid;
  title: string;
  hostId: Ulid;
  status: SessionStatus;
  startedAt: string;
  timezone: string;
  participants: Ulid[];
  agenda: string;
}

export interface CollaborationComment {
  id: Ulid;
  userId: Ulid;
  userName: string;
  message: string;
  createdAt: string;
}

export type ResidencyStatus = 'active' | 'planned';

export interface ResidencyPreference {
  region: string;
  dataCenter: string;
  primary: boolean;
  status: ResidencyStatus;
  cutoverAt?: string;
}

export type ActivitySeverity = 'info' | 'warning' | 'critical';

export type ActivityType =
  | 'role-change'
  | 'invite-sent'
  | 'invite-revoked'
  | 'link-created'
  | 'link-revoked'
  | 'session-scheduled'
  | 'session-started'
  | 'session-ended'
  | 'comment'
  | 'member-added'
  | 'member-removed';

export interface CollaborationActivity {
  id: Ulid;
  type: ActivityType;
  message: string;
  createdAt: string;
  actor: string;
  severity: ActivitySeverity;
}

export interface CollaborationState {
  members: CollaborationMember[];
  invites: CollaborationInvite[];
  shareLinks: ShareLink[];
  liveSessions: LiveSession[];
  comments: CollaborationComment[];
  residency: ResidencyPreference[];
  activity: CollaborationActivity[];
}
