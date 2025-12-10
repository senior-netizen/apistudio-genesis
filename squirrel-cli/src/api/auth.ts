import { request } from './client';

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    name?: string;
    email: string;
    roles?: string[];
  };
  csrfToken?: string;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  return request<LoginResponse>({
    url: '/api/auth/login',
    method: 'POST',
    data: { email, password }
  });
};

export interface WhoAmIResponse {
  id: string;
  name?: string;
  email: string;
  roles: string[];
  plan?: string;
}

export const whoAmI = async (): Promise<WhoAmIResponse> => {
  return request<WhoAmIResponse>({
    url: '/api/auth/me',
    method: 'GET'
  });
};
