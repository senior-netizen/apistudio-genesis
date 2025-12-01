import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { WorkspaceBundle } from '../../types/api';

type WorkspaceSchema = DBSchema & {
  meta: {
    key: string;
    value: { version: number };
  };
  preferences: {
    key: string;
    value: Record<string, unknown>;
  };
};

const DB_NAME = 'squirrel-api-studio';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<WorkspaceSchema>> | undefined;

async function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<WorkspaceSchema>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('meta')) {
          database.createObjectStore('meta');
        }
        if (database.objectStoreNames.contains('projects')) {
          database.deleteObjectStore('projects');
        }
        if (database.objectStoreNames.contains('environments')) {
          database.deleteObjectStore('environments');
        }
        if (database.objectStoreNames.contains('history')) {
          database.deleteObjectStore('history');
        }
        if (database.objectStoreNames.contains('mocks')) {
          database.deleteObjectStore('mocks');
        }
        if (database.objectStoreNames.contains('collaboration')) {
          database.deleteObjectStore('collaboration');
        }
        if (!database.objectStoreNames.contains('preferences')) {
          database.createObjectStore('preferences');
        }
      }
    });
  }

  return dbPromise;
}

export async function loadWorkspace(): Promise<WorkspaceBundle | undefined> {
  // Workspace data now comes from the backend; legacy data is ignored.
  await getDb();
  return undefined;
}

export async function persistWorkspace(bundle: WorkspaceBundle) {
  // Workspace persistence is disabled; only UI preferences should use IndexedDB.
  await getDb();
  await (await getDb()).objectStoreNames; // touch DB to ensure migration runs; intentionally no-op
  void bundle;
}

export async function exportWorkspace(): Promise<WorkspaceBundle> {
  const bundle = await loadWorkspace();
  if (!bundle) {
    return { version: 1, projects: [], environments: [], history: [], mocks: [], collaboration: undefined };
  }
  return bundle;
}

export async function importWorkspace(bundle: WorkspaceBundle) {
  await persistWorkspace(bundle);
}
