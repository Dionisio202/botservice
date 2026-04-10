import { createContext, useState, useCallback, useContext, type ReactNode } from 'react';
import { authService } from '@/services/authService';
import type { AuthUser, AuthContextValue } from '@/types/auth.types';

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(() => authService.me());

    const login = useCallback(async (username: string, password: string) => {
        const result = await authService.login(username, password);
        if (result.ok) setUser(result.user);
        return result;
    }, []);

    const logout = useCallback(() => {
        authService.logout();
        setUser(null);
    }, []);

    const isAdmin = useCallback(() => user?.role === 'admin', [user]);

    return (
        <AuthContext.Provider value={{ user, isLoading: false, login, logout, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}