export declare const RoleLevels: Record<string, number>;
export declare function hasRole(userRole: string | null | undefined, requiredRole: string | null | undefined): boolean;
export declare function elevateFounderRole<T extends {
    role?: string | null;
    isFounder?: boolean | null;
}>(user: T): T;
