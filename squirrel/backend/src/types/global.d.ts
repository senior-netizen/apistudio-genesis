import type { WorkspaceRole } from '../infra/prisma/enums';

declare module 'compression' {
  const compression: any;
  export default compression;
}

declare module 'passport-jwt' {
  export const ExtractJwt: any;
  export const Strategy: any;
}

declare global {
  namespace Express {
    interface User {
      id: string;
      email?: string;
      role?: WorkspaceRole | 'api_key' | 'founder';
      apiKeyId?: string;
      workspaceId?: string | null;
      developerBypass?: boolean;
    }
    interface Request {
      user?: User;
      marketplace?: {
        apiKey: any;
        plan: any;
        api: any;
      };
    }
  }
}

export {};

