import axios, { AxiosHeaders, AxiosInstance, AxiosRequestConfig } from 'axios';
import { loadConfig, getActiveProfile } from '../config/config';
import { logger } from '../utils/logger';

let client: AxiosInstance | null = null;

const createClient = async (): Promise<AxiosInstance> => {
  const config = await loadConfig();
  const profile = getActiveProfile(config);

  const instance = axios.create({
    baseURL: profile.baseUrl,
    timeout: 30000
  });

  instance.interceptors.request.use((request) => {
    const headers = new AxiosHeaders(request.headers ?? {});
    headers.set('x-squirrel-cli-version', '0.1.0');

    if (profile.accessToken) {
      headers.set('Authorization', `Bearer ${profile.accessToken}`);
    }

    request.headers = headers;
    return request;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      logger.handleAxiosError(error);
      throw error;
    }
  );

  return instance;
};

export const getClient = async (): Promise<AxiosInstance> => {
  if (!client) {
    client = await createClient();
  }
  return client;
};

export const request = async <T = unknown>(config: AxiosRequestConfig): Promise<T> => {
  const axiosClient = await getClient();
  const response = await axiosClient.request<T>(config);
  return response.data;
};

export const resetClient = (): void => {
  client = null;
};
