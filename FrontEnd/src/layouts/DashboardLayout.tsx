import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, MessageSquare, Users, Settings,
    ChevronLeft, ChevronRight, Sun, Moon,
    LogOut, User, Menu, X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hook/useTheme';

const BASE_NAV_ITEMS = [
    { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard'      },
    { to: '/conversations', icon: MessageSquare,   label: 'Conversaciones' },
    { to: '/customers',     icon: Users,           label: 'Clientes'       },
];

export function DashboardLayout() {
    const [collapsed,  setCollapsed]  = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { user, logout, isAdmin }   = useAuth();
    const { isDark, toggle }          = useTheme();
    const navigate                    = useNavigate();

    const navItems = [
        ...BASE_NAV_ITEMS,
        ...(isAdmin() ? [{ to: '/settings', icon: Settings, label: 'Configuración' }] : []),
    ];

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="flex h-screen overflow-hidden bg-bg">
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-30 flex flex-col bg-bg-sidebar border-r border-border
                transition-all duration-300 ease-in-out
                ${collapsed ? 'w-16' : 'w-64'}
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:relative lg:translate-x-0
            `}>
                <div className={`flex items-center border-b border-border h-16 px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
                    {!collapsed && (
                        <div className="flex items-center gap-2">
                            <img src="/icons/icon-192.png" alt="EcuEntrega" className="w-8 h-8 rounded-lg" />
                            <span className="font-semibold text-text-sidebar text-sm">EcuEntrega</span>
                        </div>
                    )}
                    <button
                        onClick={() => setCollapsed(c => !c)}
                        className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-text-muted hover:bg-surface hover:text-text-sidebar transition-colors"
                    >
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                                transition-colors duration-150
                                ${isActive
                                    ? 'bg-primary text-white'
                                    : 'text-text-sidebar hover:bg-surface hover:text-text'
                                }
                                ${collapsed ? 'justify-center' : ''}
                            `}
                        >
                            <Icon size={18} className="shrink-0" />
                            {!collapsed && <span>{label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="border-t border-border p-2 space-y-1">
                    <button
                        onClick={toggle}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-text-sidebar hover:bg-surface transition-colors ${collapsed ? 'justify-center' : ''}`}
                    >
                        {isDark ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
                        {!collapsed && <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>}
                    </button>

                    <div className={`flex items-center gap-3 px-3 py-2.5 ${collapsed ? 'justify-center' : ''}`}>
                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <User size={14} className="text-white" />
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-text-sidebar truncate">{user?.username}</p>
                                <p className="text-xs text-text-muted">{isAdmin() ? 'Admin' : 'Agente'}</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-danger hover:bg-surface transition-colors ${collapsed ? 'justify-center' : ''}`}
                    >
                        <LogOut size={18} className="shrink-0" />
                        {!collapsed && <span>Cerrar sesión</span>}
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 border-b border-border flex items-center px-4 gap-3 bg-bg shrink-0 lg:hidden">
                    <button
                        onClick={() => setMobileOpen(o => !o)}
                        className="text-text-muted hover:text-text transition-colors"
                    >
                        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <img src="/icons/icon-192.png" alt="EcuEntrega" className="w-7 h-7 rounded-lg" />
                    <span className="font-semibold text-sm text-text">EcuEntrega</span>
                </header>

                <main className="flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}