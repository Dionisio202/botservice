import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function LoginPage() {
    const [username,    setUsername]    = useState('');
    const [password,    setPassword]    = useState('');
    const [showPass,    setShowPass]    = useState(false);
    const [error,       setError]       = useState<string | null>(null);
    const [isLoading,   setIsLoading]   = useState(false);
    const { login }                     = useAuth();
    const navigate                      = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const result = await login(username, password);

        if (result.ok) {
            navigate('/dashboard', { replace: true });
        } else {
            setError(result.error ?? 'Credenciales incorrectas.');
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
            <div className="w-full max-w-sm">

                <div className="flex flex-col items-center mb-8">
                    <img
                        src="/icons/icon-192.png"
                        alt="EcuEntrega"
                        className="w-20 h-20 rounded-2xl shadow-lg mb-4"
                    />
                    <h1 className="text-2xl font-bold text-text">EcuEntrega</h1>
                    <p className="text-sm text-text-muted mt-1">Panel de gestión</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-6 space-y-4">

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                            Usuario
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="tu usuario"
                            required
                            autoFocus
                            className="w-full px-4 py-3 rounded-xl bg-bg border border-border text-text placeholder:text-text-muted text-sm focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                            Contraseña
                        </label>
                        <div className="relative">
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full px-4 py-3 pr-11 rounded-xl bg-bg border border-border text-text placeholder:text-text-muted text-sm focus:outline-none focus:border-primary transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(s => !s)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                            >
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3">
                            <p className="text-danger text-xs">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || !username || !password}
                        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm py-3 rounded-xl transition-colors"
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <LogIn size={16} />
                                Iniciar sesión
                            </>
                        )}
                    </button>
                </form>

                <p className="text-center text-xs text-text-muted mt-6">
                    © {new Date().getFullYear()} EcuEntrega · Orizen Labs
                </p>
            </div>
        </div>
    );
}