import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppStore } from '../store';
import { createInitialCollaborationState } from '../store/collaborationSlice';
import { CollabApi } from '../lib/api/collab';

vi.mock('../lib/api/collab', () => ({
  CollabApi: {
    fetchState: vi.fn(),
    createInvite: vi.fn(),
    createShareLink: vi.fn(),
    scheduleSession: vi.fn(),
    startSession: vi.fn(),
    endSession: vi.fn(),
    addComment: vi.fn(),
    revokeInvite: vi.fn(),
    revokeShareLink: vi.fn(),
  },
}));

const baseState = {
  members: [],
  invites: [],
  shareLinks: [],
  liveSessions: [],
  residency: [],
  comments: [],
  activity: [],
};

describe('collaboration slice', () => {
  beforeEach(() => {
    useAppStore.setState((state) => {
      state.collaboration = createInitialCollaborationState();
    });
  });

  it('hydrates collaboration state from backend', async () => {
    (CollabApi.fetchState as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseState,
      members: [{ id: 'u1', name: 'Test', email: 'test@example.com', role: 'admin', presence: 'online', lastActiveAt: '' }],
    });
    await useAppStore.getState().syncCollaboration();
    expect(useAppStore.getState().collaboration.members[0]?.id).toBe('u1');
  });

  it('stores server response when sending invite', async () => {
    (CollabApi.createInvite as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseState,
      invites: [{ id: 'i1', email: 'new@example.com', role: 'editor', status: 'pending', createdAt: new Date().toISOString() }],
    });
    await useAppStore.getState().inviteMember({ email: 'new@example.com', role: 'editor' });
    expect(useAppStore.getState().collaboration.invites[0]?.id).toBe('i1');
  });

  it('uses backend when creating share links', async () => {
    (CollabApi.createShareLink as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseState,
      shareLinks: [{ id: 'l1', label: 'Workspace access', scope: 'workspace', status: 'active' }],
    });
    const link = await useAppStore.getState().createShareLink({ label: 'Workspace access', scope: 'workspace' });
    expect(link?.id).toBe('l1');
    expect(useAppStore.getState().collaboration.shareLinks[0]?.label).toBe('Workspace access');
  });

  it('records comments returned from API', async () => {
    (CollabApi.addComment as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseState,
      comments: [{ id: 'c1', userId: 'u1', userName: 'tester', message: 'hello', createdAt: new Date().toISOString() }],
    });
    await useAppStore.getState().addComment({ userId: 'u1', message: 'hello' });
    expect(useAppStore.getState().collaboration.comments[0]?.id).toBe('c1');
  });
});
