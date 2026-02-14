/**
 * @squirrel/vscode - HTTP client service powered by axios.
 * Centralizes network calls triggered by the webview and returns structured results.
 */

import axios, { AxiosError, AxiosRequestConfig } from "axios";
import * as vscode from "vscode";
import { ApiRequestPayload, ApiResponsePayload } from "../types/api";

const requestTimeout = 120000;

const sanitizeHeaders = (headers?: Record<string, string>): Record<string, string> | undefined => {
  if (!headers) {
    return undefined;
  }
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (key && value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

export const makeRequest = async (payload: ApiRequestPayload): Promise<ApiResponsePayload> => {
  const config: AxiosRequestConfig = {
    method: payload.method,
    url: payload.url,
    headers: sanitizeHeaders(payload.headers),
    data: payload.body,
    timeout: requestTimeout,
    maxRedirects: 10,
    validateStatus: () => true,
  };

  const startedAt = Date.now();

  try {
    const response = await axios.request(config);
    const duration = Date.now() - startedAt;
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(Object.entries(response.headers).map(([key, value]) => [key, String(value)])),
      data: response.data,
      duration,
      size: typeof response.data === "string" ? response.data.length : JSON.stringify(response.data ?? {}).length,
    };
  } catch (err) {
    const duration = Date.now() - startedAt;
    let message = "Unexpected error";
    if (axios.isAxiosError(err)) {
      const error = err as AxiosError;
      message = error.message;
      if (error.response) {
        return {
          status: error.response.status,
          statusText: error.response.statusText ?? "Error",
          headers: Object.fromEntries(
            Object.entries(error.response.headers ?? {}).map(([key, value]) => [key, String(value)])
          ),
          data: error.response.data,
          duration,
          size: typeof error.response.data === "string"
            ? error.response.data.length
            : JSON.stringify(error.response.data ?? {}).length,
        };
      }
    } else if (err instanceof Error) {
      message = err.message;
    }
    vscode.window.showErrorMessage(`Squirrel API Studio request failed: ${message}`);
    throw err;
  }
};

export const makeGraphQLRequest = async (
  payload: { url: string; query: string; variables?: string; headers?: Record<string, string> }
): Promise<ApiResponsePayload> => {
  const startedAt = Date.now();
  try {
    const variables = payload.variables ? JSON.parse(payload.variables) : undefined;
    const response = await axios.post(
      payload.url,
      { query: payload.query, variables },
      {
        headers: {
          "Content-Type": "application/json",
          ...(sanitizeHeaders(payload.headers) ?? {}),
        },
        timeout: requestTimeout,
        validateStatus: () => true,
      }
    );
    const duration = Date.now() - startedAt;
    return {
      status: response.status,
      statusText: response.statusText ?? "OK",
      headers: Object.fromEntries(Object.entries(response.headers ?? {}).map(([key, value]) => [key, String(value)])),
      data: response.data,
      duration,
      size: JSON.stringify(response.data ?? {}).length,
    };
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`GraphQL request failed: ${error.message}`);
    }
    throw error;
  }
};
