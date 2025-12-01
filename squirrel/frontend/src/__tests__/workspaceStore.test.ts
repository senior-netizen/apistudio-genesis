import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useAppStore } from '../store';
import type { WorkspaceBundle } from '../types/api';

vi.mock('../lib/data/loadWorkspaceBundle', () => ({
  loadWorkspaceBundle: vi.fn(),
}));

const { loadWorkspaceBundle } = await import('../lib/data/loadWorkspaceBundle');

const bundle: WorkspaceBundle = {
  version: 1,
  workspaceId: 'w1',
  projects: [
    {
      id: 'p1',
      name: 'Backend',
      collections: [
        {
          id: 'c1',
          name: 'Users',
          description: '',
          folders: [],
          tags: [],
          requests: [
            {
              id: 'r1',
              name: 'List users',
              method: 'GET',
              url: '/users',
              headers: [],
              params: [],
              auth: { type: 'none' },
              scripts: { preRequest: '', test: '' },
              tags: [],
              examples: [],
            },
          ],
        },
      ],
    },
  ],
  environments: [],
  history: [],
  mocks: [],
};

describe('workspace store initialization', () => {
  beforeEach(() => {
    useAppStore.setState({ initialized: false, initializing: false, projects: [], environments: [], history: [], mocks: [] } as any);
  });

  it('loads workspace data from backend bundle', async () => {
    (loadWorkspaceBundle as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(bundle);
    await useAppStore.getState().initialize();
    const state = useAppStore.getState();
    expect(state.projects[0]?.id).toBe('p1');
    expect(state.activeWorkspaceId).toBe('w1');
    expect(state.initialized).toBe(true);
  });

  it('handles empty backend bundle without seeds', async () => {
    (loadWorkspaceBundle as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...bundle,
      workspaceId: undefined,
      projects: [],
    });
    await useAppStore.getState().initialize();
    const state = useAppStore.getState();
    expect(state.projects).toHaveLength(0);
    expect(state.activeProjectId).toBeNull();
    expect(state.activeCollectionId).toBeNull();
  });
});
