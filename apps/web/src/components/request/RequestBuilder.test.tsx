import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createEmptyRequest } from '../../store/utils';
import type { AppState } from '../../store/types';

vi.mock('../ui/toast', () => ({
  useToast: () => ({ push: vi.fn() })
}));

import RequestBuilder from './RequestBuilder';

const mockState: Partial<AppState> & {
  workingRequest?: any;
} = {
  workingRequest: undefined,
  selectedRequestTab: 'params',
  setSelectedRequestTab: vi.fn(),
  sendRequest: vi.fn(),
  isSending: false,
  unsavedChanges: false,
  revertWorkingRequest: vi.fn(),
  persistWorkingRequest: vi.fn(),
  initialize: vi.fn(),
  initialized: true,
  initializing: false,
  initializationError: null,
  createBlankWorkingRequest: vi.fn(),
  openRequestTabs: [],
  activeRequestTabId: null,
  projects: [],
  environments: [],
  activeEnvironmentId: null,
  setActiveEnvironment: vi.fn(),
  globalVariables: [],
  updateWorkingRequest: vi.fn()
};

vi.mock('../../store', () => ({
  useAppStore: (selector: (state: typeof mockState) => any) => selector(mockState)
}));

// provide getState for UrlBar send button usage
import { useAppStore } from '../../store';
(useAppStore as unknown as { getState: () => typeof mockState }).getState = () => mockState;

describe('RequestBuilder safe rendering', () => {
  beforeEach(() => {
    Object.assign(mockState, {
      workingRequest: undefined,
      selectedRequestTab: 'params',
      isSending: false,
      unsavedChanges: false,
      initializationError: null,
      initializing: false,
      initialized: true,
      openRequestTabs: [],
      activeRequestTabId: null,
      projects: [],
      environments: [],
      globalVariables: []
    });
  });

  it('renders skeleton while workspace is loading', () => {
    mockState.initializing = true;
    mockState.initialized = false;

    const output = renderToString(<RequestBuilder />);

    expect(output).toContain('request-builder-skeleton');
  });

  it('renders error state when initialization fails', () => {
    mockState.initializationError = 'Network issue';

    const output = renderToString(<RequestBuilder />);

    expect(output).toContain('Unable to load request');
    expect(output).toContain('Network issue');
  });

  it('shows onboarding when no workspace data is available', () => {
    const output = renderToString(<RequestBuilder />);

    expect(output).toContain('No requests yet');
    expect(output).toContain('Create your first API request');
  });

  it('renders editors with blank request when request is missing but workspace has data', () => {
    mockState.projects = [
      {
        id: 'p1',
        name: 'Project',
        collections: [
          {
            id: 'c1',
            name: 'Collection',
            description: '',
            folders: [],
            requests: [createEmptyRequest()],
            tags: []
          }
        ]
      }
    ];

    const output = renderToString(<RequestBuilder />);

    expect(output).toContain('Params, headers &amp; body');
    expect(output).toContain('Request URL');
  });

  it('handles undefined body and headers gracefully', () => {
    mockState.projects = [
      {
        id: 'p1',
        name: 'Project',
        collections: [
          { id: 'c1', name: 'Collection', description: '', folders: [], requests: [], tags: [] }
        ]
      }
    ];
    mockState.workingRequest = { ...createEmptyRequest(), body: undefined, headers: undefined } as any;

    const output = renderToString(<RequestBuilder />);

    expect(output).toContain('Params, headers &amp; body');
  });
});
