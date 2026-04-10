import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { UserPlus, KeyRound, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { authService } from '@/services/authService';

function FormCard({ title, icon, children }: {
    title:    string;
    icon:     React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {icon}
                </div>
                <p className="text-sm font-medium text-text">{title}</p>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function Alert({ ok, message }: { ok: boolean; message: string }) {
    return (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs ${
            ok ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'
        }`}>
            {ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {message}
        </div>
    );
}

function PasswordInput({ value, onChange, placeholder }: {
    value:       string;
    onChange:    (v: string) => void;
    placeholder: string;
}) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 pr-10 text-sm text-text placeholder:text-text-muted outline-none focus:border-primary transition-colors"
            />
            <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
            >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
        </div>
    );
}

function CreateUserForm() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role,     setRole]     = useState<'admin' | 'agent'>('agent');
    const [result,   setResult]   = useState<{ ok: boolean; message: string } | null>(null);

    const mutation = useMutation({
        mutationFn: () => authService.register({ username, password, role }),
        onSuccess: () => {
            setResult({ ok: true, message: `Usuario "${username}" creado correctamente.` });
            setUsername('');
            setPassword('');
            setRole('agent');
        },
        onError: () => {
            setResult({ ok: false, message: 'Error al crear el usuario. Verifica que no exista.' });
        },
    });

    return (
        <FormCard title="Crear usuario" icon={<UserPlus size={16} />}>
            <div className="space-y-3">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-muted">Usuario</label>
                    <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="nombre de usuario"
                        className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted outline-none focus:border-primary transition-colors"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-muted">Contraseña</label>
                    <PasswordInput value={password} onChange={setPassword} placeholder="contraseña segura" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-muted">Rol</label>
                    <div className="flex gap-2">
                        {(['agent', 'admin'] as const).map(r => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => setRole(r)}
                                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                                    role === r
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-bg border-border text-text-muted hover:text-text'
                                }`}
                            >
                                {r === 'agent' ? 'Agente' : 'Admin'}
                            </button>
                        ))}
                    </div>
                </div>

                {result && <Alert ok={result.ok} message={result.message} />}

                <button
                    onClick={() => { setResult(null); mutation.mutate(); }}
                    disabled={!username.trim() || !password.trim() || mutation.isPending}
                    className="w-full py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                >
                    {mutation.isPending ? 'Creando...' : 'Crear usuario'}
                </button>
            </div>
        </FormCard>
    );
}

function ChangePasswordForm() {
    const [username,    setUsername]    = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [result,      setResult]      = useState<{ ok: boolean; message: string } | null>(null);

    const mutation = useMutation({
        mutationFn: () => authService.changePassword({ username, newPassword }),
        onSuccess: () => {
            setResult({ ok: true, message: `Contraseña de "${username}" actualizada.` });
            setUsername('');
            setNewPassword('');
        },
        onError: () => {
            setResult({ ok: false, message: 'Error al cambiar la contraseña. Verifica el usuario.' });
        },
    });

    return (
        <FormCard title="Cambiar contraseña" icon={<KeyRound size={16} />}>
            <div className="space-y-3">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-muted">Usuario</label>
                    <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="nombre de usuario"
                        className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted outline-none focus:border-primary transition-colors"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-muted">Nueva contraseña</label>
                    <PasswordInput value={newPassword} onChange={setNewPassword} placeholder="nueva contraseña" />
                </div>

                {result && <Alert ok={result.ok} message={result.message} />}

                <button
                    onClick={() => { setResult(null); mutation.mutate(); }}
                    disabled={!username.trim() || !newPassword.trim() || mutation.isPending}
                    className="w-full py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                >
                    {mutation.isPending ? 'Actualizando...' : 'Cambiar contraseña'}
                </button>
            </div>
        </FormCard>
    );
}

export function SettingsPage() {
    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
            <div>
                <h1 className="text-lg font-bold text-text">Configuración</h1>
                <p className="text-xs text-text-muted mt-0.5">Gestión de usuarios del panel</p>
            </div>
            <CreateUserForm />
            <ChangePasswordForm />
        </div>
    );
}