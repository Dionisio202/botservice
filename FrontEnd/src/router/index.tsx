import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ConversationsPage } from '@/pages/ConversationsPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { SettingsPage } from '@/pages/SettingsPage';
import type { ReactNode } from 'react';

function PrivateRoute({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={
                <PublicRoute>
                    <LoginPage />
                </PublicRoute>
            } />

            <Route element={
                <PrivateRoute>
                    <DashboardLayout />
                </PrivateRoute>
            }>
                <Route path="/dashboard"     element={<DashboardPage />} />
                <Route path="/conversations" element={<ConversationsPage />} />
                <Route path="/customers"     element={<CustomersPage />} />
                <Route path="/settings"      element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

export function AppRouter() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}