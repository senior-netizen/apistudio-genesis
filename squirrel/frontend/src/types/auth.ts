export interface CurrentUserProfile {
  id: string;
  email: string;
  role: string;
  displayName?: string | null;
}
