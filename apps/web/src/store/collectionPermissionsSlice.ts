import type { StateCreator } from '@/vendor/zustand';
import type { AppState } from './types';

export type CollectionRole = 'viewer' | 'editor';

export interface CollectionPermissionsSlice {
  collectionPermissions: Record<string, CollectionRole>;
  setCollectionPermission: (collectionId: string, role: CollectionRole) => void;
  getCollectionPermission: (collectionId: string) => CollectionRole;
}

export const createCollectionPermissionsSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  CollectionPermissionsSlice
> = (set, get) => ({
  collectionPermissions: {},
  setCollectionPermission(collectionId, role) {
    if (!collectionId) return;
    set((draft) => {
      draft.collectionPermissions[collectionId] = role;
    });
  },
  getCollectionPermission(collectionId) {
    if (!collectionId) return 'editor';
    return get().collectionPermissions[collectionId] ?? 'editor';
  },
});
