import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../store';
import { createInitialCollaborationState } from '../store/collaborationSlice';
import type { CollaborationState } from '../types/collaboration';

const mockState: CollaborationState = {
  members: [
    {
      id: 'm-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
      presence: 'online',
      lastActiveAt: new Date().toISOString(),
    },
  ],
  invites: [],
  shareLinks: [],
  liveSessions: [],
  residency: [],
  comments: [],
  activity: [],
};

vi.mock('../lib/api/collaboration', () => ({
  fetchCollaborationState: vi.fn().mockResolvedValue(mockState),
  fetchComments: vi.fn().mockResolvedValue([]),
  postComment: vi.fn().mockResolvedValue({
    id: 'c-1',
    userId: 'm-1',
    userName: 'Test User',
    message: 'hello world',
    createdAt: new Date().toISOString(),
  }),
  createCollaborationSession: vi.fn().mockResolvedValue({
    id: 's-1',
    title: 'session',
    hostId: 'm-1',
    status: 'scheduled',
    startedAt: new Date().toISOString(),
    timezone: 'UTC',
    participants: ['m-1'],
    agenda: 'agenda',
  }),
}));

function resetCollaborationState() {
  useAppStore.setState((state) => {
    state.collaboration = createInitialCollaborationState();
  });
}

describe('collaboration slice', () => {
  beforeEach(() => {
    resetCollaborationState();
  });

  it('does not seed members locally', () => {
    expect(useAppStore.getState().collaboration.members).toHaveLength(0);
  });

  it('hydrates from collaboration service', async () => {
    await useAppStore.getState().syncCollaboration();
    const state = useAppStore.getState().collaboration;
    expect(state.members[0]?.email).toBe('test@example.com');
    expect(state.comments).toHaveLength(0);
  });

  it('posts comments through the API', async () => {
    await useAppStore.getState().syncCollaboration();
    await useAppStore.getState().addComment({ userId: 'm-1', message: 'hello world' });
    const saved = useAppStore.getState().collaboration.comments[0];
    expect(saved?.id).toBe('c-1');
  });
});
