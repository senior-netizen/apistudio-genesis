import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { logger } from '../utils/logger';

export interface ConfigProfile {
  name: string;
  baseUrl: string;
  accessToken?: string;
  activeWorkspaceId?: string;
  activeEnvironmentId?: string;
  telemetryEnabled?: boolean;
}

export interface ConfigData {
  activeProfile: string;
  profiles: Record<string, ConfigProfile>;
}

const CONFIG_DIR = path.join(os.homedir(), '.squirrel');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

let cachedConfig: ConfigData | null = null;

const defaultProfile = (): ConfigProfile => ({
  name: 'default',
  baseUrl: process.env.SQUIRREL_BASE_URL ?? 'http://localhost:4000'
});

const defaultConfig = (): ConfigData => ({
  activeProfile: 'default',
  profiles: {
    default: defaultProfile()
  }
});

export const getConfigPath = (): string => CONFIG_FILE;

export const loadConfig = async (): Promise<ConfigData> => {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const exists = await fs.pathExists(CONFIG_FILE);
    if (!exists) {
      await fs.ensureDir(CONFIG_DIR);
      const config = defaultConfig();
      await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
      cachedConfig = config;
      return config;
    }

    const data = await fs.readJson(CONFIG_FILE);
    cachedConfig = normalizeConfig(data as ConfigData);
    return cachedConfig;
  } catch (error) {
    logger.error('Failed to load configuration file. Using defaults.');
    const config = defaultConfig();
    cachedConfig = config;
    return config;
  }
};

export const saveConfig = async (config: ConfigData): Promise<void> => {
  await fs.ensureDir(CONFIG_DIR);
  await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
  cachedConfig = config;
};

export const getActiveProfile = (config: ConfigData): ConfigProfile => {
  const profile = config.profiles[config.activeProfile];
  if (!profile) {
    const fallback = defaultProfile();
    config.profiles[fallback.name] = fallback;
    config.activeProfile = fallback.name;
    return fallback;
  }
  return profile;
};

export const setActiveProfile = async (profileName: string): Promise<ConfigProfile> => {
  const config = await loadConfig();
  if (!config.profiles[profileName]) {
    throw new Error(`Profile "${profileName}" does not exist.`);
  }
  config.activeProfile = profileName;
  await saveConfig(config);
  return config.profiles[profileName];
};

export const upsertProfile = async (profile: ConfigProfile): Promise<ConfigProfile> => {
  const config = await loadConfig();
  config.profiles[profile.name] = { ...config.profiles[profile.name], ...profile };
  if (!config.activeProfile) {
    config.activeProfile = profile.name;
  }
  await saveConfig(config);
  return config.profiles[profile.name];
};

export const clearActiveToken = async (): Promise<void> => {
  const config = await loadConfig();
  const profile = getActiveProfile(config);
  profile.accessToken = undefined;
  await saveConfig(config);
};

const normalizeConfig = (config: ConfigData): ConfigData => {
  const normalized = { ...defaultConfig(), ...config };
  normalized.profiles = {
    ...defaultConfig().profiles,
    ...config.profiles
  };
  if (!normalized.profiles[normalized.activeProfile]) {
    normalized.activeProfile = 'default';
  }
  return normalized;
};
