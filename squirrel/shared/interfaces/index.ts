export interface RequestUser {
  id: string;
  email: string;
  roles: string[];
  plan?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}
