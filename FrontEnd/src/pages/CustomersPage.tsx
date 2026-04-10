import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Search, RefreshCw, Shield, ShieldOff, UserCheck,
    AlertTriangle, CheckCircle, XCircle, ChevronLeft,
    ChevronRight, Filter, Star, Phone, Calendar, X,
} from 'lucide-react';
import { customersService } from '@/services/customersService';
import type { Customer, CustomerFilters } from '@/types/customer.types';

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    new:     { label: 'Nuevo',   color: 'text-text-muted', bg: 'bg-surface border-border'        },
    regular: { label: 'Regular', color: 'text-primary',    bg: 'bg-primary/10 border-primary/20' },
    loyal:   { label: 'Leal',    color: 'text-success',    bg: 'bg-success/10 border-success/20' },
};

const STATUS_FILTERS = [
    { label: 'Todos',        value: ''             },
    { label: 'Blacklist',    value: 'blacklisted'  },
    { label: 'Revisión',     value: 'needs_review' },
    { label: 'De confianza', value: 'trusted'      },
];

const TIER_FILTERS = [
    { label: 'Todos',   value: ''        },
    { label: 'Nuevo',   value: 'new'     },
    { label: 'Regular', value: 'regular' },
    { label: 'Leal',    value: 'loyal'   },
];

function RiskBadge({ score }: { score: number }) {
    const color = score >= 6 ? 'text-danger bg-danger/10 border-danger/20'
                : score >= 3 ? 'text-warning bg-warning/10 border-warning/20'
                : 'text-success bg-success/10 border-success/20';
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full border ${color}`}>
            {score} pts
        </span>
    );
}

function TierBadge({ tier }: { tier: string }) {
    const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.new;
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}

function CustomerRow({ customer, onAction }: { customer: Customer; onAction: (c: Customer) => void }) {
    return (
        <tr className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        customer.is_blacklisted     ? 'bg-danger/10 text-danger'
                        : customer.manually_trusted ? 'bg-success/10 text-success'
                        : 'bg-primary/10 text-primary'
                    }`}>
                        {(customer.customer_name ?? customer.phone)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-text truncate">{customer.customer_name ?? '—'}</p>
                        <p className="text-xs text-text-muted font-mono">{customer.phone}</p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3"><TierBadge tier={customer.customer_tier} /></td>
            <td className="px-4 py-3"><RiskBadge score={customer.risk_score} /></td>
            <td className="px-4 py-3 text-center"><span className="text-xs text-text">{customer.confirmed_orders}</span></td>
            <td className="px-4 py-3 text-center"><span className="text-xs text-danger">{customer.cancelled_orders}</span></td>
            <td className="px-4 py-3 text-center"><span className="text-xs text-danger">{customer.lost_orders}</span></td>
            <td className="px-4 py-3">
                <span className="text-xs text-danger font-medium">${Number(customer.total_lost_amount).toFixed(2)}</span>
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-1 flex-wrap">
                    {customer.is_blacklisted    && <span className="text-xs bg-danger/10 text-danger border border-danger/20 px-1.5 py-0.5 rounded-full">Blacklist</span>}
                    {customer.needs_agent_review && <span className="text-xs bg-warning/10 text-warning border border-warning/20 px-1.5 py-0.5 rounded-full">Revisión</span>}
                    {customer.manually_trusted   && <span className="text-xs bg-success/10 text-success border border-success/20 px-1.5 py-0.5 rounded-full">Confiable</span>}
                    {!customer.is_blacklisted && !customer.needs_agent_review && !customer.manually_trusted && (
                        <span className="text-xs text-text-muted">—</span>
                    )}
                </div>
            </td>
            <td className="px-4 py-3">
                <p className="text-xs text-text-muted">
                    {new Date(customer.last_order_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: '2-digit' })}
                </p>
            </td>
            <td className="px-4 py-3">
                <button
                    onClick={() => onAction(customer)}
                    className="text-xs px-3 py-1.5 border border-border rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors"
                >
                    Ver
                </button>
            </td>
        </tr>
    );
}

function CustomerDrawer({ customer, onClose }: { customer: Customer; onClose: () => void }) {
    const qc                                        = useQueryClient();
    const [showBlacklistInput, setShowBlacklistInput] = useState(false);
    const [blacklistReason, setBlacklistReason]     = useState('');

    const unblacklistMutation = useMutation({
        mutationFn: () => customersService.unblacklist(customer.phone),
        onSuccess:  () => qc.invalidateQueries({ queryKey: ['customers'] }),
    });

    const blacklistMutation = useMutation({
        mutationFn: () => customersService.blacklist(customer.phone, blacklistReason, 0),
        onSuccess: () => {
            setShowBlacklistInput(false);
            setBlacklistReason('');
            qc.invalidateQueries({ queryKey: ['customers'] });
        },
    });

    const reviewMutation = useMutation({
        mutationFn: ({ approved, trustFully }: { approved: boolean; trustFully?: boolean }) =>
            customersService.reviewOverride(customer.phone, approved, trustFully),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
    });

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40" onClick={onClose} />
            <div className="w-full max-w-sm bg-bg border-l border-border flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                            customer.is_blacklisted     ? 'bg-danger/10 text-danger'
                            : customer.manually_trusted ? 'bg-success/10 text-success'
                            : 'bg-primary/10 text-primary'
                        }`}>
                            {(customer.customer_name ?? customer.phone)[0].toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-text">{customer.customer_name ?? '—'}</p>
                            <p className="text-xs text-text-muted font-mono">{customer.phone}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-text transition-colors">
                        <XCircle size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    <div className="flex gap-2 flex-wrap">
                        <TierBadge tier={customer.customer_tier} />
                        <RiskBadge score={customer.risk_score} />
                        {customer.manually_trusted && (
                            <span className="text-xs bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Star size={10} /> Confiable
                            </span>
                        )}
                    </div>

                    <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                        <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Estadísticas</p>
                        {[
                            { label: 'Total pedidos',     value: customer.total_orders,     color: ''                },
                            { label: 'Confirmados',       value: customer.confirmed_orders, color: 'text-success'    },
                            { label: 'Cancelados',        value: customer.cancelled_orders, color: 'text-danger'     },
                            { label: 'Perdidos',          value: customer.lost_orders,      color: 'text-danger'     },
                            { label: 'Sesiones expiradas',value: customer.expired_sessions, color: 'text-text-muted' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="flex justify-between items-center">
                                <span className="text-xs text-text-muted">{label}</span>
                                <span className={`text-xs font-medium text-text ${color}`}>{value}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center border-t border-border pt-3">
                            <span className="text-xs text-text-muted">Monto perdido</span>
                            <span className="text-xs font-bold text-danger">${Number(customer.total_lost_amount).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                        <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Fechas</p>
                        {[
                            { label: 'Primer pedido', value: customer.first_order_at },
                            { label: 'Último pedido', value: customer.last_order_at  },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between items-center">
                                <span className="text-xs text-text-muted">{label}</span>
                                <span className="text-xs text-text">
                                    {new Date(value).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                        ))}
                    </div>

                    {(customer.is_blacklisted || customer.needs_agent_review) && (
                        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                            <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Estado</p>
                            {customer.is_blacklisted && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                                        <Shield size={12} /> En blacklist
                                    </div>
                                    {customer.blacklist_reason && (
                                        <p className="text-xs text-text-muted">{customer.blacklist_reason}</p>
                                    )}
                                </div>
                            )}
                            {customer.needs_agent_review && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
                                        <AlertTriangle size={12} /> Necesita revisión
                                    </div>
                                    {customer.agent_review_reason && (
                                        <p className="text-xs text-text-muted">{customer.agent_review_reason}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Acciones</p>

                        {customer.is_blacklisted && (
                            <button
                                onClick={() => unblacklistMutation.mutate()}
                                disabled={unblacklistMutation.isPending}
                                className="w-full flex items-center gap-2 px-4 py-2.5 bg-success/10 border border-success/20 text-success text-xs rounded-xl hover:bg-success/20 transition-colors disabled:opacity-50"
                            >
                                <ShieldOff size={14} />
                                {unblacklistMutation.isPending ? 'Desbloqueando...' : 'Desbloquear cliente'}
                            </button>
                        )}

                        {customer.needs_agent_review && (
                            <>
                                <button
                                    onClick={() => reviewMutation.mutate({ approved: true })}
                                    disabled={reviewMutation.isPending}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-success/10 border border-success/20 text-success text-xs rounded-xl hover:bg-success/20 transition-colors disabled:opacity-50"
                                >
                                    <UserCheck size={14} /> Aprobar revisión
                                </button>
                                <button
                                    onClick={() => reviewMutation.mutate({ approved: true, trustFully: true })}
                                    disabled={reviewMutation.isPending}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/20 text-primary text-xs rounded-xl hover:bg-primary/20 transition-colors disabled:opacity-50"
                                >
                                    <CheckCircle size={14} /> Aprobar y confiar
                                </button>
                                <button
                                    onClick={() => reviewMutation.mutate({ approved: false })}
                                    disabled={reviewMutation.isPending}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-danger/10 border border-danger/20 text-danger text-xs rounded-xl hover:bg-danger/20 transition-colors disabled:opacity-50"
                                >
                                    <XCircle size={14} /> Escalar a blacklist
                                </button>
                            </>
                        )}

                        {!customer.is_blacklisted && (
                            showBlacklistInput ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={blacklistReason}
                                            onChange={e => setBlacklistReason(e.target.value)}
                                            placeholder="Razón del bloqueo..."
                                            className="flex-1 bg-bg border border-border rounded-xl px-3 py-2 text-xs text-text placeholder:text-text-muted outline-none focus:border-danger transition-colors"
                                        />
                                        <button
                                            onClick={() => { setShowBlacklistInput(false); setBlacklistReason(''); }}
                                            className="text-text-muted hover:text-text transition-colors shrink-0"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => blacklistMutation.mutate()}
                                        disabled={!blacklistReason.trim() || blacklistMutation.isPending}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-danger text-white text-xs rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity"
                                    >
                                        <Shield size={14} />
                                        {blacklistMutation.isPending ? 'Bloqueando...' : 'Confirmar bloqueo'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowBlacklistInput(true)}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-danger/10 border border-danger/20 text-danger text-xs rounded-xl hover:bg-danger/20 transition-colors"
                                >
                                    <Shield size={14} /> Agregar a blacklist
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function CustomersPage() {
    const [filters, setFilters]         = useState<CustomerFilters>({ page: 1, limit: 20 });
    const [selected, setSelected]       = useState<Customer | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['customers', filters],
        queryFn:  () => customersService.getAll(filters),
    });

    const customers  = data?.data?.data ?? [];
    const total      = data?.data?.total ?? 0;
    const totalPages = data?.data?.totalPages ?? 1;
    const page       = filters.page ?? 1;

    const update = useCallback((patch: Partial<CustomerFilters>) => {
        setFilters(f => ({ ...f, ...patch, page: 1 }));
    }, []);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border shrink-0">
                <div>
                    <h1 className="text-lg font-bold text-text">Clientes</h1>
                    <p className="text-xs text-text-muted mt-0.5">{total} clientes encontrados</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(f => !f)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-lg transition-colors ${
                            showFilters ? 'bg-primary/10 border-primary/20 text-primary' : 'border-border text-text-muted hover:text-text hover:bg-surface'
                        }`}
                    >
                        <Filter size={13} /> Filtros
                    </button>
                    <button
                        onClick={() => refetch()}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors"
                    >
                        <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                </div>
            </div>

            {showFilters && (
                <div className="px-4 sm:px-6 py-3 border-b border-border bg-surface shrink-0">
                    <div className="flex flex-wrap gap-3">
                        <div className="relative">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input
                                type="text"
                                placeholder="Nombre..."
                                defaultValue={filters.name}
                                onChange={e => update({ name: e.target.value })}
                                className="bg-bg border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-text placeholder:text-text-muted outline-none focus:border-primary transition-colors w-36"
                            />
                        </div>
                        <div className="relative">
                            <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input
                                type="text"
                                placeholder="Teléfono..."
                                defaultValue={filters.phone}
                                onChange={e => update({ phone: e.target.value })}
                                className="bg-bg border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-text placeholder:text-text-muted outline-none focus:border-primary transition-colors w-36"
                            />
                        </div>
                        <select
                            value={filters.tier ?? ''}
                            onChange={e => update({ tier: e.target.value })}
                            className="bg-bg border border-border rounded-lg px-3 py-1.5 text-xs text-text outline-none focus:border-primary transition-colors"
                        >
                            {TIER_FILTERS.map(({ label, value }) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                        <select
                            value={filters.status ?? ''}
                            onChange={e => update({ status: e.target.value })}
                            className="bg-bg border border-border rounded-lg px-3 py-1.5 text-xs text-text outline-none focus:border-primary transition-colors"
                        >
                            {STATUS_FILTERS.map(({ label, value }) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                        <div className="flex items-center gap-2">
                            <Calendar size={13} className="text-text-muted shrink-0" />
                            <input
                                type="date"
                                value={filters.from ?? ''}
                                onChange={e => update({ from: e.target.value })}
                                className="bg-bg border border-border rounded-lg px-3 py-1.5 text-xs text-text outline-none focus:border-primary transition-colors"
                            />
                            <span className="text-xs text-text-muted">→</span>
                            <input
                                type="date"
                                value={filters.to ?? ''}
                                onChange={e => update({ to: e.target.value })}
                                className="bg-bg border border-border rounded-lg px-3 py-1.5 text-xs text-text outline-none focus:border-primary transition-colors"
                            />
                        </div>
                        <button
                            onClick={() => setFilters({ page: 1, limit: 20 })}
                            className="text-xs text-text-muted hover:text-danger transition-colors"
                        >
                            Limpiar
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : customers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <Filter size={32} className="text-text-muted mb-3" />
                        <p className="text-sm font-medium text-text mb-1">Sin resultados</p>
                        <p className="text-xs text-text-muted">Prueba con otros filtros</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-bg border-b border-border">
                            <tr>
                                {['Cliente', 'Tier', 'Riesgo', 'Confirmados', 'Cancelados', 'Perdidos', 'Monto perdido', 'Estado', 'Último pedido', ''].map(h => (
                                    <th key={h} className="px-4 py-3 text-xs font-medium text-text-muted whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(c => (
                                <CustomerRow key={c.id} customer={c} onAction={setSelected} />
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-border shrink-0">
                    <p className="text-xs text-text-muted">{total} clientes · página {page} de {totalPages}</p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setFilters(f => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}
                            disabled={page === 1}
                            className="p-1.5 border border-border rounded-lg text-text-muted disabled:opacity-40 hover:text-text hover:bg-surface transition-colors"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs text-text-muted px-2">{page} / {totalPages}</span>
                        <button
                            onClick={() => setFilters(f => ({ ...f, page: Math.min(totalPages, (f.page ?? 1) + 1) }))}
                            disabled={page === totalPages}
                            className="p-1.5 border border-border rounded-lg text-text-muted disabled:opacity-40 hover:text-text hover:bg-surface transition-colors"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {selected && (
                <CustomerDrawer customer={selected} onClose={() => setSelected(null)} />
            )}
        </div>
    );
}