import type { Variable } from '../types/api';
import type { CollectionsSlice } from './collectionsSlice';
import type { RequestSlice } from './requestSlice';
import type { ResponseSlice } from './responseSlice';
import type { EnvironmentsSlice } from './environmentsSlice';
import type { HistorySlice } from './historySlice';
import type { MocksSlice } from './mocksSlice';
import type { SubscriptionSlice } from './subscriptionSlice';
import type { CollaborationSlice } from './collaborationSlice';
import type { CollectionPermissionsSlice } from './collectionPermissionsSlice';

export type AppState = CollectionsSlice &
  RequestSlice &
  ResponseSlice &
  EnvironmentsSlice &
  HistorySlice &
  MocksSlice &
  SubscriptionSlice &
  CollaborationSlice &
  CollectionPermissionsSlice & {
    globalVariables: Variable[];
    initialized: boolean;
    initializing: boolean;
    initializationError: string | null;
    initialize: () => Promise<void>;
  };
