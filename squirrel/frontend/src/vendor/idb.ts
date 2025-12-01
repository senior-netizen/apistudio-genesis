export type IDBPDatabase<T = unknown> = MemoryDB;
export type DBSchema = Record<string, unknown>;

class MemoryStore {
  private data = new Map<string, any>();

  constructor(private name: string) {}

  getAll() {
    return Promise.resolve(Array.from(this.data.values()));
  }

  get(key: string) {
    return Promise.resolve(this.data.get(String(key)));
  }

  put(value: any, keyOverride?: string) {
    const key = keyOverride ?? value?.id ?? `${Date.now()}-${Math.random()}`;
    this.data.set(String(key), value);
    return Promise.resolve(key);
  }

  clear() {
    this.data.clear();
    return Promise.resolve();
  }
}

class MemoryDB {
  stores = new Map<string, MemoryStore>();

  readonly objectStoreNames = {
    contains: (name: string) => this.stores.has(name)
  };

  createObjectStore(name: string, _options?: { keyPath?: string; autoIncrement?: boolean }) {
    if (!this.stores.has(name)) {
      this.stores.set(name, new MemoryStore(name));
    }
    return this.getStore(name);
  }

  transaction(storeNames: string[], _mode: 'readonly' | 'readwrite') {
    const context = this;
    const store = this.getStore(storeNames[0]);
    return {
      store,
      objectStore(name: string) {
        return context.getStore(name);
      },
      done: Promise.resolve()
    };
  }

  getStore(name: string) {
    if (!this.stores.has(name)) {
      this.stores.set(name, new MemoryStore(name));
    }
    return this.stores.get(name)!;
  }
}

export function openDB<T = unknown>(
  _name: string,
  _version: number,
  options?: {
    upgrade?: (
      db: {
        objectStoreNames: { contains: (name: string) => boolean };
        createObjectStore: (name: string, config?: { keyPath?: string; autoIncrement?: boolean }) => MemoryStore;
      }
    ) => void;
  }
): Promise<MemoryDB> {
  const db = new MemoryDB();
  if (options?.upgrade) {
    options.upgrade({
      objectStoreNames: db.objectStoreNames,
      createObjectStore: (name, config) => db.createObjectStore(name, config)
    });
  }
  return Promise.resolve(db);
}
