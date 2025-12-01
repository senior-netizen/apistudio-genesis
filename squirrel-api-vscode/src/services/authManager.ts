/**
 * @squirrel/vscode - Authentication manager handling secure credential storage and flows.
 */

import * as vscode from "vscode";
import axios from "axios";
import { createHash, randomBytes } from "crypto";
import {
  AuthCredentials,
  AuthType,
  OAuthConfig,
  OAuthToken,
  ApiRequestPayload,
} from "../types/api";
import { authSecretId, deleteSecret, getAuthMetadata, getSecret, saveAuthMetadata, storeSecret } from "../utils/storage";

interface AuthMetadataItem {
  id: string;
  name: string;
  type: AuthType;
}

const codeVerifiers = new Map<string, string>();

const toMetadata = ({ id, name, type }: AuthCredentials): AuthMetadataItem => ({ id, name, type });

export const getAuthCredentials = async (): Promise<AuthCredentials[]> => {
  const meta = await getAuthMetadata<AuthMetadataItem>();
  const resolved = await Promise.all(
    meta.map(async (item) => {
      if (item.type === "none") {
        return { ...item } satisfies AuthCredentials;
      }
      const secret = await getSecret(authSecretId(item.id));
      if (!secret) {
        return { ...item } satisfies AuthCredentials;
      }
      try {
        const parsed = JSON.parse(secret) as AuthCredentials;
        return { ...parsed, name: item.name } as AuthCredentials;
      } catch (error) {
        console.error("Failed to parse auth secret", error);
        return { ...item } satisfies AuthCredentials;
      }
    })
  );
  return resolved;
};

export const saveAuthCredentials = async (auth: AuthCredentials[]): Promise<AuthCredentials[]> => {
  const metadata = auth.map(toMetadata);
  await saveAuthMetadata(metadata);
  await Promise.all(
    auth.map(async (item) => {
      if (item.type === "none") {
        await deleteSecret(authSecretId(item.id));
        return;
      }
      await storeSecret(authSecretId(item.id), JSON.stringify(item));
    })
  );
  return getAuthCredentials();
};

const buildAuthorizeUrl = (config: OAuthConfig, state: string, codeChallenge?: string): string => {
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  if (config.redirectUri) {
    url.searchParams.set("redirect_uri", config.redirectUri);
  }
  if (config.scopes?.length) {
    url.searchParams.set("scope", config.scopes.join(" "));
  }
  url.searchParams.set("state", state);
  if (codeChallenge) {
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  }
  return url.toString();
};

const exchangeCodeForToken = async (
  config: OAuthConfig,
  code: string,
  verifier?: string
): Promise<OAuthToken> => {
  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  if (config.redirectUri) {
    body.set("redirect_uri", config.redirectUri);
  }
  body.set("client_id", config.clientId);
  if (config.clientSecret) {
    body.set("client_secret", config.clientSecret);
  }
  if (verifier) {
    body.set("code_verifier", verifier);
  }
  const response = await axios.post(config.tokenUrl, body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const expiresIn = response.data.expires_in ? Date.now() + response.data.expires_in * 1000 : undefined;
  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    tokenType: response.data.token_type,
    scope: response.data.scope,
    expiresAt: expiresIn,
  } satisfies OAuthToken;
};

const refreshToken = async (config: OAuthConfig, token: OAuthToken): Promise<OAuthToken> => {
  if (!token.refreshToken) {
    throw new Error("No refresh token available");
  }
  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", token.refreshToken);
  body.set("client_id", config.clientId);
  if (config.clientSecret) {
    body.set("client_secret", config.clientSecret);
  }
  const response = await axios.post(config.tokenUrl, body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const expiresIn = response.data.expires_in ? Date.now() + response.data.expires_in * 1000 : undefined;
  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token ?? token.refreshToken,
    tokenType: response.data.token_type,
    scope: response.data.scope ?? token.scope,
    expiresAt: expiresIn,
  } satisfies OAuthToken;
};

const generateCodeChallenge = (): { verifier: string; challenge: string } => {
  const verifier = randomBytes(32).toString("hex");
  const challenge = createHash("sha256").update(verifier).digest().toString("base64url");
  return { verifier, challenge };
};

const mergeAuth = (existing: AuthCredentials | undefined, updated: AuthCredentials): AuthCredentials => {
  if (!existing) {
    return updated;
  }
  return { ...existing, ...updated } as AuthCredentials;
};

export const beginOAuthFlow = async (authId: string): Promise<AuthCredentials[] | undefined> => {
  const authList = await getAuthCredentials();
  const auth = authList.find((item) => item.id === authId && item.type === "oauth2");
  if (!auth || auth.type !== "oauth2") {
    vscode.window.showErrorMessage("OAuth configuration not found for the selected credential.");
    return undefined;
  }
  const state = randomBytes(8).toString("hex");
  let challenge: string | undefined;
  let verifier: string | undefined;
  if (auth.data.usePKCE) {
    const result = generateCodeChallenge();
    challenge = result.challenge;
    verifier = result.verifier;
    codeVerifiers.set(auth.id, verifier);
  }
  const authorizeUrl = buildAuthorizeUrl(auth.data, state, challenge);
  await vscode.env.openExternal(vscode.Uri.parse(authorizeUrl));
  const code = await vscode.window.showInputBox({
    title: "Complete OAuth Authorization",
    prompt: "Paste the authorization code provided after granting access.",
  });
  if (!code) {
    vscode.window.showWarningMessage("OAuth authorization cancelled.");
    return undefined;
  }
  try {
    const token = await exchangeCodeForToken(auth.data, code, verifier ?? codeVerifiers.get(auth.id));
    const updated = mergeAuth(auth, { ...auth, token });
    const saved = await saveAuthCredentials(
      authList.map((item) => (item.id === authId ? updated : item))
    );
    vscode.window.showInformationMessage("OAuth token acquired successfully.");
    return saved;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    vscode.window.showErrorMessage(`OAuth exchange failed: ${message}`);
    return undefined;
  }
};

export const refreshOAuthToken = async (authId: string): Promise<AuthCredentials[] | undefined> => {
  const authList = await getAuthCredentials();
  const auth = authList.find((item) => item.id === authId && item.type === "oauth2");
  if (!auth || auth.type !== "oauth2" || !auth.token) {
    vscode.window.showErrorMessage("OAuth token unavailable for refresh.");
    return undefined;
  }
  try {
    const token = await refreshToken(auth.data, auth.token);
    const updated = mergeAuth(auth, { ...auth, token });
    const saved = await saveAuthCredentials(
      authList.map((item) => (item.id === authId ? updated : item))
    );
    vscode.window.showInformationMessage("OAuth token refreshed.");
    return saved;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    vscode.window.showErrorMessage(`Token refresh failed: ${message}`);
    return undefined;
  }
};

export const applyAuthToRequest = async (request: ApiRequestPayload): Promise<ApiRequestPayload> => {
  if (!request.authId) {
    return request;
  }
  const authList = await getAuthCredentials();
  const credential = authList.find((item) => item.id === request.authId);
  if (!credential) {
    return request;
  }

  switch (credential.type) {
    case "basic": {
      const header = Buffer.from(`${credential.data.username}:${credential.data.password}`).toString("base64");
      return {
        ...request,
        headers: { ...request.headers, Authorization: `Basic ${header}` },
      };
    }
    case "bearer": {
      return {
        ...request,
        headers: { ...request.headers, Authorization: `Bearer ${credential.data.token}` },
      };
    }
    case "apiKey": {
      if (credential.data.placement === "header") {
        return {
          ...request,
          headers: { ...request.headers, [credential.data.target]: credential.data.key },
        };
      }
      try {
        const url = new URL(request.url);
        url.searchParams.set(credential.data.target, credential.data.key);
        return { ...request, url: url.toString() };
      } catch {
        return request;
      }
    }
    case "oauth2": {
      if (!credential.token) {
        vscode.window.showWarningMessage("OAuth credential missing token; authorize before sending.");
        return request;
      }
      if (credential.token.expiresAt && credential.token.expiresAt < Date.now()) {
        const refreshed = await refreshOAuthToken(credential.id);
        const updated = refreshed?.find((item) => item.id === credential.id && item.type === "oauth2");
        if (updated && updated.token) {
          return {
            ...request,
            headers: {
              ...request.headers,
              Authorization: `${updated.token.tokenType ?? "Bearer"} ${updated.token.accessToken}`,
            },
          };
        }
      }
      return {
        ...request,
        headers: {
          ...request.headers,
          Authorization: `${credential.token.tokenType ?? "Bearer"} ${credential.token.accessToken}`,
        },
      };
    }
    default:
      return request;
  }
};

export const removeAuthCredential = async (id: string): Promise<AuthCredentials[]> => {
  const auth = await getAuthCredentials();
  const filtered = auth.filter((item) => item.id !== id);
  await deleteSecret(authSecretId(id));
  return saveAuthCredentials(filtered);
};
