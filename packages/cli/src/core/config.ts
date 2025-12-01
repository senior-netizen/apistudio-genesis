import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Logger } from './logger.js';
import { ensureDir } from '../utils/fs.js';
import { deepMerge } from '../utils/merge.js';
import { EnvConfig, SquirrelConfig } from '../types/config.js';

const CONFIG_FILENAME = 'config.json';

function getBaseDir(): string {
  const override = process.env.SQUIRREL_HOME;
  if (override) return path.resolve(override);
  return path.join(os.homedir(), '.squirrel');
}

export function getConfigDir(): string {
  return path.join(getBaseDir(), 'config');
}

function getConfigPath(): string {
  return path.join(getConfigDir(), CONFIG_FILENAME);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

const defaultConfig: SquirrelConfig = {
  version: 1,
  currentEnvironment: undefined,
  environments: {},
  collections: {},
  recentRequests: [],
  user: undefined,
};

export async function loadConfig(logger?: Logger): Promise<SquirrelConfig> {
  const configPath = getConfigPath();
  try {
    await ensureDir(path.dirname(configPath));
    if (!fs.existsSync(configPath)) {
      await fs.promises.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      return clone(defaultConfig);
    }

    const raw = await fs.promises.readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw) as SquirrelConfig;
    return deepMerge(clone(defaultConfig), parsed);
  } catch (error) {
    logger?.error('Failed to load configuration');
    throw error;
  }
}

export async function saveConfig(config: SquirrelConfig): Promise<void> {
  const configPath = getConfigPath();
  await ensureDir(path.dirname(configPath));
  await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
}

export async function upsertEnvironment(env: EnvConfig): Promise<SquirrelConfig> {
  const config = await loadConfig();
  config.environments[env.name] = env;
  if (!config.currentEnvironment) {
    config.currentEnvironment = env.name;
  }
  await saveConfig(config);
  return config;
}

export async function deleteEnvironment(name: string): Promise<SquirrelConfig> {
  const config = await loadConfig();
  delete config.environments[name];
  if (config.currentEnvironment === name) {
    config.currentEnvironment = Object.keys(config.environments)[0];
  }
  await saveConfig(config);
  return config;
}

export async function setCurrentEnvironment(name: string): Promise<SquirrelConfig> {
  const config = await loadConfig();
  if (!config.environments[name]) {
    throw new Error(`Environment "${name}" not found`);
  }
  config.currentEnvironment = name;
  await saveConfig(config);
  return config;
}

export async function updateConfig(partial: Partial<SquirrelConfig>): Promise<SquirrelConfig> {
  const config = await loadConfig();
  const merged = deepMerge(config, partial);
  await saveConfig(merged);
  return merged;
}
