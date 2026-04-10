export type UserRole = 'admin' | 'agent';

export interface AuthUser {
    id:       number;
    username: string;
    role:     UserRole;
}

export interface AuthContextValue {
    user:      AuthUser | null;
    isLoading: boolean;
    login:     (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
    logout:    () => void;
    isAdmin:   () => boolean;
}