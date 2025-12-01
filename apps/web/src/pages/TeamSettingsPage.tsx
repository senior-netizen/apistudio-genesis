import { brand } from '@sdl/language';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card } from '@sdl/ui';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Globe2,
  Link2,
  MapPin,
  Plus,
  RefreshCcw,
  Share2,
  UserMinus,
  UserPlus,
  Users2,
  Video,
  XCircle,
} from 'lucide-react';

import CommentSidebar from '../components/CommentSidebar';
import { useAppStore } from '../store';
import type { CollaborationRole, ShareScope } from '../types/collaboration';
import { NeonTabBar } from '../components/system';

function formatRelativeTime(timestamp: string) {
  const value = new Date(timestamp).getTime();
  if (Number.isNaN(value)) {
    return 'unknown';
  }
  const diffMs = Date.now() - value;
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes <= 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatDateTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Pending';
  }
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

const presenceStyles: Record<string, string> = {
  online: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300',
  idle: 'bg-amber-500/20 text-amber-600 dark:text-amber-300',
  offline: 'bg-slate-500/20 text-slate-600 dark:text-slate-300',
};

const roleLabel: Record<CollaborationRole, string> = {
  admin: 'Admin',
  maintainer: 'Maintainer',
  editor: 'Editor',
  viewer: 'Viewer',
};

export default function TeamSettingsPage() {
  const {
    initialize,
    initialized,
    collaboration,
    inviteMember,
    updateMemberRole,
    removeMember,
    resendInvite,
    revokeInvite,
    createShareLink,
    revokeShareLink,
    scheduleLiveSession,
    startLiveSession,
    endLiveSession,
    joinLiveSession,
    leaveLiveSession,
    addComment,
    setResidencyPrimary,
    scheduleResidencyCutover,
  } = useAppStore((state) => ({
    initialize: state.initialize,
    initialized: state.initialized,
    collaboration: state.collaboration,
    inviteMember: state.inviteMember,
    updateMemberRole: state.updateMemberRole,
    removeMember: state.removeMember,
    resendInvite: state.resendInvite,
    revokeInvite: state.revokeInvite,
    createShareLink: state.createShareLink,
    revokeShareLink: state.revokeShareLink,
    scheduleLiveSession: state.scheduleLiveSession,
    startLiveSession: state.startLiveSession,
    endLiveSession: state.endLiveSession,
    joinLiveSession: state.joinLiveSession,
    leaveLiveSession: state.leaveLiveSession,
    addComment: state.addComment,
    setResidencyPrimary: state.setResidencyPrimary,
    scheduleResidencyCutover: state.scheduleResidencyCutover,
  }));

  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialized, initialize]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollaborationRole>('viewer');
  const [inviteMessage, setInviteMessage] = useState('');
  const [linkLabel, setLinkLabel] = useState('Guest workspace access');
  const [linkScope, setLinkScope] = useState<ShareScope>('workspace');
  const [linkExpiresIn, setLinkExpiresIn] = useState('72');
  const [linkRequiresApproval, setLinkRequiresApproval] = useState(true);
  const [linkMaxUses, setLinkMaxUses] = useState('10');
  const [lastCreatedLinkId, setLastCreatedLinkId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState('Release retro sync');
  const [sessionAgenda, setSessionAgenda] = useState('Walk through incidents, QA notes, and approvals.');
  const [sessionOffsetHours, setSessionOffsetHours] = useState('4');
  const [activeTab, setActiveTab] = useState<
    'members' | 'invites' | 'links' | 'sessions' | 'residency' | 'activity' | 'comments'
  >('members');

  const adminMember = useMemo(
    () => collaboration.members.find((member) => member.role === 'admin') ?? collaboration.members[0],
    [collaboration.members],
  );
  const currentUserId = adminMember?.id ? String(adminMember.id) : '';

  const pendingInvites = collaboration.invites.filter((invite) => invite.status === 'pending');
  const liveSessions = collaboration.liveSessions;
  const activeMembers = collaboration.members.filter((member) => member.presence !== 'offline');

  const commentFeed = useMemo(
    () =>
      collaboration.comments.map((comment) => ({
        id: String(comment.id),
        user: comment.userName,
        message: comment.message,
        createdAt: comment.createdAt,
      })),
    [collaboration.comments],
  );

  const handleInviteSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteEmail.trim()) {
      return;
    }
    inviteMember({
      email: inviteEmail.trim(),
      role: inviteRole,
      message: inviteMessage.trim() || undefined,
      invitedBy: adminMember?.name,
    });
    setInviteEmail('');
    setInviteMessage('');
  };

  const handleShareLinkSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const expiresIn = Number.parseInt(linkExpiresIn, 10);
    const maxUses = Number.parseInt(linkMaxUses, 10);
    const link = createShareLink({
      label: linkLabel.trim() || 'Workspace link',
      scope: linkScope,
      expiresInHours: Number.isFinite(expiresIn) ? expiresIn : undefined,
      requiresApproval: linkRequiresApproval,
      maxUses: Number.isFinite(maxUses) ? maxUses : undefined,
    });
    setLastCreatedLinkId(String(link.id));
    setLinkLabel('Guest workspace access');
  };

  const handleScheduleSession = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionTitle.trim() || !currentUserId) {
      return;
    }
    const offset = Number.parseInt(sessionOffsetHours, 10);
    const scheduledAt = new Date(Date.now() + (Number.isFinite(offset) ? offset : 1) * 3600 * 1000).toISOString();
    scheduleLiveSession({
      title: sessionTitle.trim(),
      hostId: currentUserId,
      scheduledAt,
      timezone: 'Africa/Johannesburg',
      agenda: sessionAgenda.trim(),
    });
    setSessionTitle('');
    setSessionAgenda('');
  };

  const handleCommentSubmit = (message: string) => {
    if (!currentUserId) {
      return;
    }
    addComment({ userId: currentUserId, message });
  };

  const copyLinkToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch (error) {
      console.warn('Clipboard unavailable', error);
    }
  };

  const recentlyCreatedLink =
    lastCreatedLinkId && collaboration.shareLinks.find((link) => String(link.id) === lastCreatedLinkId);

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-border/60 bg-background/80 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Collaboration</p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">Team Spaces &amp; Live Sessions</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              Coordinate who can build, monitor, and approve API changes. Send secure invites, manage workspace links,
              and orchestrate live review sessions without leaving {brand.productName}.
            </p>
          </div>
          <Badge variant="outline" className="w-fit gap-2 text-xs">
            <Users2 className="h-4 w-4" /> {collaboration.members.length} members
          </Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Card className="border border-border/50 bg-background/80 p-4">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="font-semibold text-foreground">{activeMembers.length} active collaborators</p>
                <p className="text-xs text-muted">Live cursors and comments update in real time.</p>
              </div>
            </div>
          </Card>
          <Card className="border border-border/50 bg-background/80 p-4">
            <div className="flex items-center gap-3 text-sm">
              <Share2 className="h-5 w-5 text-accent" />
              <div>
                <p className="font-semibold text-foreground">{pendingInvites.length} pending invites</p>
                <p className="text-xs text-muted">Track onboarding throughput per release window.</p>
              </div>
            </div>
          </Card>
          <Card className="border border-border/50 bg-background/80 p-4">
            <div className="flex items-center gap-3 text-sm">
              <Video className="h-5 w-5 text-indigo-500" />
              <div>
                <p className="font-semibold text-foreground">{liveSessions.filter((s) => s.status === 'live').length} live sessions</p>
                <p className="text-xs text-muted">Stand-ups, release reviews, and async approvals.</p>
              </div>
            </div>
          </Card>
        </div>
      </header>

      <NeonTabBar
        tabs={[
          { id: 'members', label: 'Workspace members', active: activeTab === 'members', onSelect: () => setActiveTab('members') },
          { id: 'invites', label: 'Invite teammates', active: activeTab === 'invites', onSelect: () => setActiveTab('invites') },
          { id: 'links', label: 'Secure link share', active: activeTab === 'links', onSelect: () => setActiveTab('links') },
          { id: 'sessions', label: 'Live review sessions', active: activeTab === 'sessions', onSelect: () => setActiveTab('sessions') },
          { id: 'residency', label: 'Data residency', active: activeTab === 'residency', onSelect: () => setActiveTab('residency') },
          { id: 'activity', label: 'Activity timeline', active: activeTab === 'activity', onSelect: () => setActiveTab('activity') },
          { id: 'comments', label: 'Comments', active: activeTab === 'comments', onSelect: () => setActiveTab('comments') },
        ]}
      />

      {activeTab === 'members' && (
        <Card className="border border-border/60 bg-background/80 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Workspace members</h2>
              <p className="text-sm text-muted">Assign roles, track presence, and prune access in real time.</p>
            </div>
            <Badge variant="secondary" className="w-fit gap-2 text-xs">
              <Clock3 className="h-4 w-4" /> Presence updates stream every 30s
            </Badge>
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-border/50">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.2em] text-muted">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Presence</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {collaboration.members.map((member) => (
                  <tr key={String(member.id)} className="border-t border-border/40">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{member.name}</span>
                        <span className="text-xs text-muted">{member.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="w-full rounded-md border border-border/60 bg-transparent px-3 py-2 text-sm"
                        value={member.role}
                        onChange={(event) => updateMemberRole(String(member.id), event.target.value as CollaborationRole)}
                      >
                        {Object.keys(roleLabel).map((role) => (
                          <option key={role} value={role}>
                            {roleLabel[role as CollaborationRole]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${presenceStyles[member.presence] ?? ''}`}>
                        <span className="h-2.5 w-2.5 rounded-full bg-current" aria-hidden />
                        {member.presence} · {formatRelativeTime(member.lastActiveAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="h-4 w-4 text-muted" />
                        {member.location ?? '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {collaboration.members.length > 1 ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeMember(String(member.id))}
                          className="inline-flex items-center gap-2 text-xs text-red-500 hover:text-red-600"
                        >
                          <UserMinus className="h-4 w-4" /> Remove
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'invites' && (
        <Card className="border border-border/60 bg-background/80 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Invite teammates</h2>
              <p className="text-sm text-muted">Send role-aware invites with an optional onboarding note.</p>
            </div>
            <Badge variant="outline" className="w-fit gap-2 text-xs">
              <UserPlus className="h-4 w-4" /> Rolling 7-day acceptance rate: 82%
            </Badge>
          </div>
          <form className="mt-4 grid gap-3 md:grid-cols-[1.5fr_1fr]" onSubmit={handleInviteSubmit}>
            <label className="flex flex-col gap-1 text-sm">
              Email address
              <input
                type="email"
                className="rounded-md border border-border/60 bg-transparent px-3 py-2"
                placeholder="teammate@squirrellabs.dev"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Role
              <select
                className="rounded-md border border-border/60 bg-transparent px-3 py-2"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as CollaborationRole)}
              >
                {Object.keys(roleLabel).map((role) => (
                  <option key={role} value={role}>
                    {roleLabel[role as CollaborationRole]}
                  </option>
                ))}
              </select>
            </label>
            <label className="md:col-span-2 flex flex-col gap-1 text-sm">
              Message (optional)
              <textarea
                className="min-h-[96px] rounded-md border border-border/60 bg-transparent px-3 py-2"
                placeholder="Context about the workspace or launch milestone"
                value={inviteMessage}
                onChange={(event) => setInviteMessage(event.target.value)}
              />
            </label>
            <div className="md:col-span-2 flex items-center justify-end gap-3">
              <Button type="submit" size="sm" variant="primary" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" /> Send invite
              </Button>
            </div>
          </form>

          <div className="mt-6 overflow-hidden rounded-lg border border-border/50">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.2em] text-muted">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {collaboration.invites.map((invite) => (
                  <tr key={String(invite.id)} className="border-t border-border/40">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{invite.email}</span>
                        {invite.message ? <span className="text-xs text-muted">{invite.message}</span> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">{roleLabel[invite.role]}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={invite.status === 'pending' ? 'outline' : invite.status === 'accepted' ? 'success' : 'destructive'}
                        className="capitalize"
                      >
                        {invite.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">{formatDateTime(invite.expiresAt)}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {invite.status === 'pending' ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => resendInvite(String(invite.id))}
                          className="inline-flex items-center gap-1 text-xs"
                        >
                          <RefreshCcw className="h-3.5 w-3.5" /> Resend
                        </Button>
                      ) : null}
                      {invite.status !== 'revoked' ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => revokeInvite(String(invite.id))}
                          className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Revoke
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'links' && (
        <Card className="border border-border/60 bg-background/80 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Secure share links</h2>
              <p className="text-sm text-muted">Generate scoped workspace links with expirations and approval flows.</p>
            </div>
            {recentlyCreatedLink ? (
              <Badge variant="success" className="w-fit gap-2 text-xs">
                <Link2 className="h-4 w-4" /> Created {recentlyCreatedLink.label}
              </Badge>
            ) : null}
          </div>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleShareLinkSubmit}>
            <label className="flex flex-col gap-1 text-sm">
              Label
              <input
                className="rounded-md border border-border/60 bg-transparent px-3 py-2"
                value={linkLabel}
                onChange={(event) => setLinkLabel(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Scope
              <select
                className="rounded-md border border-border/60 bg-transparent px-3 py-2"
                value={linkScope}
                onChange={(event) => setLinkScope(event.target.value as ShareScope)}
              >
                <option value="workspace">Workspace</option>
                <option value="collection">Collection</option>
                <option value="environment">Environment</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Expires in (hours)
              <input
                className="rounded-md border border-border/60 bg-transparent px-3 py-2"
                value={linkExpiresIn}
                onChange={(event) => setLinkExpiresIn(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Max uses
              <input
                className="rounded-md border border-border/60 bg-transparent px-3 py-2"
                value={linkMaxUses}
                onChange={(event) => setLinkMaxUses(event.target.value)}
              />
            </label>
            <label className="md:col-span-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border border-border/60"
                checked={linkRequiresApproval}
                onChange={(event) => setLinkRequiresApproval(event.target.checked)}
              />
              Require admin approval before joining
            </label>
            <div className="md:col-span-2 flex items-center justify-end">
              <Button type="submit" size="sm" variant="primary" className="inline-flex items-center gap-2">
                <Link2 className="h-4 w-4" /> Create link
              </Button>
            </div>
          </form>

          <div className="mt-6 overflow-hidden rounded-lg border border-border/50">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.2em] text-muted">
                <tr>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Usage</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {collaboration.shareLinks.map((link) => (
                  <tr key={String(link.id)} className="border-t border-border/40">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{link.label}</span>
                        <button
                          type="button"
                          className="mt-1 text-left text-xs text-accent underline-offset-4 hover:underline"
                          onClick={() => copyLinkToClipboard(link.url)}
                        >
                          {link.url}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted text-sm">{link.scope}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={link.status === 'active' ? 'success' : link.status === 'revoked' ? 'destructive' : 'outline'}
                        className="capitalize"
                      >
                        {link.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {link.usageCount} / {link.maxUses ?? '∞'}
                      {link.expiresAt ? <span className="ml-2 text-xs">Expires {formatDateTime(link.expiresAt)}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {link.status === 'active' ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => revokeShareLink(String(link.id))}
                          className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Revoke
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'sessions' && (
        <Card className="border border-border/60 bg-background/80 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Live review sessions</h2>
              <p className="text-sm text-muted">Run approval meetings directly from the studio, no extra tooling needed.</p>
            </div>
            <Badge variant="outline" className="w-fit gap-2 text-xs">
              <Video className="h-4 w-4" /> Copilot transcripts synced to /watchtower
            </Badge>
          </div>
          <form className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr]" onSubmit={handleScheduleSession}>
            <label className="flex flex-col gap-1 text-sm">
              Session title
              <input
                className="rounded-md border border-border/60 bg-transparent px-3 py-2"
                value={sessionTitle}
                onChange={(event) => setSessionTitle(event.target.value)}
                placeholder="Weekly launch readiness"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Starts in (hours)
              <input
                className="rounded-md border border-border/60 bg-transparent px-3 py-2"
                value={sessionOffsetHours}
                onChange={(event) => setSessionOffsetHours(event.target.value)}
              />
            </label>
            <label className="md:col-span-2 flex flex-col gap-1 text-sm">
              Agenda
              <textarea
                className="min-h-[96px] rounded-md border border-border/60 bg-transparent px-3 py-2"
                value={sessionAgenda}
                onChange={(event) => setSessionAgenda(event.target.value)}
                placeholder="Key decisions, approvals, owners"
              />
            </label>
            <div className="md:col-span-2 flex items-center justify-end">
              <Button type="submit" size="sm" variant="primary" className="inline-flex items-center gap-2">
                <CalendarClock className="h-4 w-4" /> Schedule session
              </Button>
            </div>
          </form>

          <div className="mt-6 space-y-4">
            {collaboration.liveSessions.map((session) => {
              const host = collaboration.members.find((member) => member.id === session.hostId);
              const isParticipant = currentUserId ? session.participants.includes(currentUserId) : false;
              return (
                <div
                  key={String(session.id)}
                  className="rounded-lg border border-border/50 bg-muted/10 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
                        <Video className="h-4 w-4" /> {session.status}
                      </div>
                      <h3 className="mt-1 text-lg font-semibold text-foreground">{session.title}</h3>
                      <p className="mt-1 text-sm text-muted">{session.agenda}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-4 w-4" />
                          {session.status === 'scheduled' ? `Scheduled ${formatDateTime(session.startedAt)}` : `Started ${formatRelativeTime(session.startedAt)}`}
                        </span>
                        {host ? (
                          <span className="inline-flex items-center gap-1">
                            <Users2 className="h-4 w-4" /> Hosted by {host.name}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1">
                          <Share2 className="h-4 w-4" /> {session.participants.length} participants
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {session.status === 'scheduled' ? (
                        <Button size="sm" variant="primary" onClick={() => startLiveSession(String(session.id))}>
                          Start session
                        </Button>
                      ) : null}
                      {session.status === 'live' ? (
                        <Button size="sm" variant="primary" onClick={() => endLiveSession(String(session.id))}>
                          End session
                        </Button>
                      ) : null}
                      {session.status !== 'ended' && currentUserId ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            isParticipant
                              ? leaveLiveSession(String(session.id), currentUserId)
                              : joinLiveSession(String(session.id), currentUserId)
                          }
                        >
                          {isParticipant ? 'Leave session' : 'Join as me'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                    {session.participants.map((participantId) => {
                      const participant = collaboration.members.find((member) => member.id === participantId);
                      if (!participant) {
                        return null;
                      }
                      return (
                        <span key={String(participantId)} className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
                          {participant.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {activeTab === 'residency' && (
        <Card className="border border-border/60 bg-background/80 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Data residency &amp; compliance</h2>
              <p className="text-sm text-muted">Control where workspace assets live and schedule upcoming cutovers.</p>
            </div>
            <Badge variant="outline" className="w-fit gap-2 text-xs">
              <Globe2 className="h-4 w-4" /> Multi-region replication
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {collaboration.residency.map((entry) => (
              <div key={entry.region} className="rounded-lg border border-border/50 bg-muted/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{entry.region}</p>
                    <p className="text-xs text-muted">Cluster {entry.dataCenter}</p>
                  </div>
                  <Badge variant={entry.primary ? 'success' : entry.status === 'planned' ? 'outline' : 'secondary'} className="text-xs">
                    {entry.primary ? 'Primary' : entry.status === 'planned' ? 'Planned' : 'Replica'}
                  </Badge>
                </div>
                {entry.cutoverAt ? (
                  <p className="mt-2 text-xs text-muted">Cutover scheduled {formatDateTime(entry.cutoverAt)}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {!entry.primary ? (
                    <Button size="xs" variant="outline" onClick={() => setResidencyPrimary(entry.region)}>
                      Make primary
                    </Button>
                  ) : null}
                  {entry.status !== 'planned' ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => scheduleResidencyCutover(entry.region, new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString())}
                    >
                      Schedule cutover
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'activity' && (
        <Card className="border border-border/60 bg-background/80 p-6">
          <h2 className="text-lg font-semibold text-foreground">Activity timeline</h2>
          <p className="text-sm text-muted">Every invite, link, and session is captured for audit readiness.</p>
          <div className="mt-4 space-y-3">
            {collaboration.activity.map((entry) => (
              <div key={String(entry.id)} className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/10 p-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-accent" aria-hidden />
                <div>
                  <p className="text-sm text-foreground">{entry.message}</p>
                  <p className="text-xs text-muted">{entry.actor} · {formatRelativeTime(entry.createdAt)}</p>
                </div>
                <Badge variant="outline" className="ml-auto text-xs capitalize">
                  {entry.type.replace('-', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'comments' && (
        <Card className="border border-border/60 bg-background/80 p-4">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Comments</h2>
          <CommentSidebar comments={commentFeed} onSubmit={handleCommentSubmit} />
        </Card>
      )}
    </div>
  );
}
