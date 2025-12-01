import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { ensureDir, readJsonFile, writeJsonFile } from '../utils/fs.js';

interface VaultRecord {
  payload: string;
}

interface VaultFile {
  records: Record<string, VaultRecord>;
}

const VAULT_FILENAME = 'vault.json';

function getVaultDir(): string {
  return path.join(process.env.SQUIRREL_HOME ?? path.join(os.homedir(), '.squirrel'), 'secrets');
}

function getVaultPath(): string {
  return path.join(getVaultDir(), VAULT_FILENAME);
}

function deriveKey(): Buffer {
  const secret = process.env.SQUIRREL_VAULT_SECRET ?? `${os.userInfo().username}:${os.hostname()}`;
  return crypto.pbkdf2Sync(secret, 'squirrel-salt', 100000, 32, 'sha256');
}

async function loadVault(): Promise<VaultFile> {
  return (await readJsonFile<VaultFile>(getVaultPath())) ?? { records: {} };
}

async function saveVault(vault: VaultFile): Promise<void> {
  await ensureDir(getVaultDir());
  await writeJsonFile(getVaultPath(), vault);
}

export async function storeSecret(key: string, value: string): Promise<void> {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const vault = await loadVault();
  vault.records[key] = {
    payload: Buffer.concat([iv, authTag, encrypted]).toString('base64'),
  };
  await saveVault(vault);
}

export async function readSecret(key: string): Promise<string | undefined> {
  const vault = await loadVault();
  const record = vault.records[key];
  if (!record) return undefined;
  const raw = Buffer.from(record.payload, 'base64');
  const iv = raw.subarray(0, 16);
  const authTag = raw.subarray(16, 32);
  const encrypted = raw.subarray(32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export async function deleteSecret(key: string): Promise<void> {
  const vault = await loadVault();
  delete vault.records[key];
  await saveVault(vault);
}
