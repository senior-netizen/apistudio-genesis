/**
 * @squirrel/vscode - Environment manager orchestrating environment CRUD and
 * variable interpolation for requests.
 */

import { randomUUID } from "crypto";
import { ApiRequestPayload, EnvironmentDefinition } from "../types/api";
import {
  deleteEnvironment as deleteEnvironmentSecret,
  getEnvironments as storageGetEnvironments,
  saveEnvironments as storageSaveEnvironments,
} from "../utils/storage";

const interpolationPattern = /\{\{(.*?)\}\}/g;

export const getEnvironments = async (): Promise<EnvironmentDefinition[]> => {
  const environments = await storageGetEnvironments();
  return environments.map((env) => ({ ...env, variables: env.variables ?? {} }));
};

export const saveEnvironments = async (environments: EnvironmentDefinition[]): Promise<EnvironmentDefinition[]> => {
  const normalized = environments.map((env) => ({
    ...env,
    id: env.id ?? randomUUID(),
    variables: env.variables ?? {},
  }));
  await storageSaveEnvironments(normalized);
  return getEnvironments();
};

export const deleteEnvironment = async (id: string): Promise<EnvironmentDefinition[]> => {
  await deleteEnvironmentSecret(id);
  return getEnvironments();
};

const interpolateValue = (value: string | undefined, variables: Record<string, string>): string | undefined => {
  if (!value) {
    return value;
  }
  return value.replace(interpolationPattern, (_, key: string) => variables[key.trim()] ?? "");
};

export const applyEnvironmentToRequest = async (
  request: ApiRequestPayload
): Promise<{ request: ApiRequestPayload; environment?: EnvironmentDefinition }> => {
  if (!request.environmentId) {
    return { request };
  }

  const environments = await getEnvironments();
  const environment = environments.find((env) => env.id === request.environmentId);
  if (!environment) {
    return { request };
  }

  const variables = environment.variables ?? {};
  const headers = request.headers
    ? Object.fromEntries(
        Object.entries(request.headers).map(([key, value]) => [key, interpolateValue(value, variables) ?? ""])
      )
    : undefined;

  let url = interpolateValue(request.url, variables) ?? request.url;
  const baseURL = variables.baseURL || variables.baseUrl;
  if (baseURL && !/^https?:/i.test(url)) {
    url = `${baseURL.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
  }

  const body = interpolateValue(request.body, variables);

  return {
    request: {
      ...request,
      url,
      headers,
      body,
    },
    environment,
  };
};
