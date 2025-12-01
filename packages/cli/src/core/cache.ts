import path from 'node:path';
import os from 'node:os';
import { readJsonFile, writeJsonFile } from '../utils/fs.js';

export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt?: number;
}

interface CacheFile {
  entries: Record<string, CacheEntry>;
}

const CACHE_FILENAME = 'cache.json';

function getCachePath(): string {
  const base = process.env.SQUIRREL_HOME ?? path.join(os.homedir(), '.squirrel');
  return path.join(base, 'cache', CACHE_FILENAME);
}

async function loadCache(): Promise<CacheFile> {
  return (await readJsonFile<CacheFile>(getCachePath())) ?? { entries: {} };
}

export async function getCacheValue<T>(key: string): Promise<T | undefined> {
  const cache = await loadCache();
  const entry = cache.entries[key];
  if (!entry) return undefined;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    delete cache.entries[key];
    await writeJsonFile(getCachePath(), cache);
    return undefined;
  }
  return entry.value as T;
}

export async function setCacheValue<T>(key: string, value: T, ttlMs?: number): Promise<void> {
  const cache = await loadCache();
  cache.entries[key] = {
    value,
    expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
  };
  await writeJsonFile(getCachePath(), cache);
}
