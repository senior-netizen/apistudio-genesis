export interface DBSchema {
  [name: string]: {
    key: IDBValidKey;
    value: unknown;
    indexes?: Record<string, IDBValidKey>;
  };
}

export type StoreNames<T extends DBSchema> = keyof T & string;

export interface IDBPDatabase<T extends DBSchema = DBSchema> {
  objectStoreNames: { contains: (name: string) => boolean };
  createObjectStore(name: StoreNames<T>, options?: { keyPath?: string | string[]; autoIncrement?: boolean }): MemoryStore;
  transaction(storeNames: readonly StoreNames<T>[] | StoreNames<T>, mode: 'readonly' | 'readwrite'): {
    store: MemoryStore;
    objectStore(name: string): MemoryStore;
    done: Promise<void>;
  };
  get<K extends StoreNames<T>, Key extends T[K]['key']>(storeName: K, key: Key): Promise<T[K]['value'] | undefined>;
  put<K extends StoreNames<T>, Value extends T[K]['value']>(storeName: K, value: Value): Promise<KeyOf<Value>>;
  getAllFromIndex<K extends StoreNames<T>>(storeName: K, _index: string): Promise<Array<T[K]['value']>>;
  delete<K extends StoreNames<T>, Key extends T[K]['key']>(storeName: K, key: Key): Promise<void>;
}

type KeyOf<Value> = Value extends { id: infer K } ? K : IDBValidKey;

class MemoryStore {
  private data = new Map<string, any>();
  private indexes = new Map<string, string>();

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

  createIndex(name: string, keyPath: string) {
    this.indexes.set(name, keyPath);
  }

  getAllFromIndex(indexName: string) {
    const keyPath = this.indexes.get(indexName);
    if (!keyPath) return this.getAll();
    return Promise.resolve(
      Array.from(this.data.values()).sort((a, b) => {
        const aVal = a?.[keyPath];
        const bVal = b?.[keyPath];
        if (aVal === bVal) return 0;
        return aVal > bVal ? 1 : -1;
      })
    );
  }

  clear() {
    this.data.clear();
    return Promise.resolve();
  }

  delete(key: IDBValidKey) {
    this.data.delete(String(key));
    return Promise.resolve();
  }
}

class MemoryDB implements IDBPDatabase {
  stores = new Map<string, MemoryStore>();

  get objectStoreNames() {
    return { contains: (name: string) => this.stores.has(name) };
  }

  createObjectStore(name: string, _options?: { keyPath?: string | string[]; autoIncrement?: boolean }) {
    return this.getStore(name);
  }

  transaction(storeNames: string | readonly string[], _mode: 'readonly' | 'readwrite') {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const context = this;
    const store = this.getStore(names[0]);
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

  get(storeName: string, key: IDBValidKey) {
    return this.getStore(storeName).get(String(key));
  }

  put(storeName: string, value: any) {
    return this.getStore(storeName).put(value);
  }

  getAllFromIndex(storeName: string, indexName: string) {
    return this.getStore(storeName).getAllFromIndex(indexName);
  }

  delete(storeName: string, key: IDBValidKey) {
    return this.getStore(storeName).delete(key);
  }
}

export function openDB<T extends DBSchema = DBSchema>(
  _name: string,
  _version: number,
  options?: { upgrade?: (db: IDBPDatabase<T>) => void }
): Promise<IDBPDatabase<T>> {
  const db = new MemoryDB();
  options?.upgrade?.(db);
  return Promise.resolve(db);
}
