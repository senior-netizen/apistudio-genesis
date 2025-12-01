export interface TokenStorage {
  read(): Promise<string | null>;
  write(value: string | null): Promise<void>;
}

export interface TokenUpdate {
  accessToken?: string | null;
  refreshToken?: string | null;
}

export type RefreshHandler = (refreshToken: string) => Promise<TokenUpdate | null>;
