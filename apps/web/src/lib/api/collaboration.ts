import type {
  CollaborationComment,
  CollaborationState,
  LiveSession,
} from '../../types/collaboration';
import { apiFetch } from './client';

export async function fetchCollaborationState(): Promise<CollaborationState> {
  const response = await apiFetch('/sessions', { method: 'GET' });
  if (!response.ok) {
    throw new Error('Failed to load collaboration sessions');
  }
  const sessionState: Partial<CollaborationState> = await response.json();
  return {
    members: sessionState.members ?? [],
    invites: sessionState.invites ?? [],
    shareLinks: sessionState.shareLinks ?? [],
    liveSessions: sessionState.liveSessions ?? [],
    residency: sessionState.residency ?? [],
    comments: sessionState.comments ?? [],
    activity: sessionState.activity ?? [],
  } as CollaborationState;
}

export async function createCollaborationSession(session: Partial<LiveSession>): Promise<LiveSession> {
  const response = await apiFetch('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  });
  if (!response.ok) {
    throw new Error('Failed to create collaboration session');
  }
  return response.json();
}

export async function fetchComments(): Promise<CollaborationComment[]> {
  const response = await apiFetch('/comments', { method: 'GET' });
  if (!response.ok) {
    throw new Error('Failed to load comments');
  }
  return response.json();
}

export async function postComment(comment: { message: string }): Promise<CollaborationComment> {
  const response = await apiFetch('/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(comment),
  });
  if (!response.ok) {
    throw new Error('Failed to add comment');
  }
  return response.json();
}
