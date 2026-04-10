import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Users, CheckCircle, XCircle,
    AlertTriangle, UserCheck, TrendingUp,
    RefreshCw, ChevronRight, Phone,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { panelService } from '@/services/panelService';
import type { ReviewCustomer } from '@/types/panel.types';
import type { DateRangeFilters } from '@/services/panelService';

type FilterRange = 'all' | 'today' | '7d' | '30d';

const FILTER_RANGES: { label: string; value: FilterRange }[] = [
    { label: 'Histórico', value: 'all'   },
    { label: 'Hoy',       value: 'today' },
    { label: '7 días',    value: '7d'    },
    { label: '30 días',   value: '30d'   },
];

function toDateRange(range: FilterRange): DateRangeFilters {
    const now = new Date();
    const pad = (d: Date) => d.toISOString().split('T')[0];

    if (range === 'today') return { from: pad(now), to: pad(now) };
    if (range === '7d') {
        const d = new Date(now); d.setDate(d.getDate() - 6);
        return { from: pad(d), to: pad(now) };
    }
    if (range === '30d') {
        const d = new Date(now); d.setDate(d.getDate() - 29);
        return { from: pad(d), to: pad(now) };
    }
    return {};
}

const TIER_LABELS: Record<string, string> = { new: 'Nuevo', regular: 'Regular', loyal: 'Leal' };
const TIER_COLORS: Record<string, string> = {
    new:     'bg-surface text-text-muted border border-border',
    regular: 'bg-primary/10 text-primary border border-primary/20',
    loyal:   'bg-success/10 text-success border border-success/20',
};

function KpiCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
    return (
        <div className="bg-surface border border-border rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accent }} />
            <p className="text-xs text-text-muted mb-2">{label}</p>
            <p className="text-3xl font-bold text-text leading-none">{value}</p>
        </div>
    );
}

function RateBar({ rate, period }: { rate: number; period: string }) {
    const color = rate >= 80 ? 'var(--success)' : rate >= 60 ? 'var(--warning)' : 'var(--danger)';
    const label = rate >= 80 ? 'Excelente' : rate >= 60 ? 'Aceptable' : 'Bajo rendimiento';
    return (
        <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-text">Tasa de confirmación</p>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">{period}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border"
                        style={{ color, borderColor: color, background: `color-mix(in srgb, ${color} 10%, transparent)` }}>
                        {label}
                    </span>
                </div>
            </div>
            <p className="text-5xl font-bold leading-none mb-4" style={{ color }}>{rate}%</p>
            <div className="bg-bg rounded-full h-1.5 overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(rate, 100)}%`, background: color }} />
            </div>
            <div className="flex justify-between text-xs text-text-muted">
                <span>0%</span>
                <span style={{ color: 'var(--danger)' }}>60% mín</span>
                <span style={{ color: 'var(--warning)' }}>80% obj</span>
                <span>100%</span>
            </div>
        </div>
    );
}

function StatusBars({ confirmed, pending, cancelled }: { confirmed: number; pending: number; cancelled: number }) {
    const total = confirmed + pending + cancelled;
    const items = [
        { label: 'Confirmados', value: confirmed, color: 'var(--success)' },
        { label: 'Pendientes',  value: pending,   color: 'var(--warning)' },
        { label: 'Cancelados',  value: cancelled, color: 'var(--danger)'  },
    ];
    return (
        <div className="bg-surface border border-border rounded-2xl p-5">
            <p className="text-sm font-medium text-text mb-4">Distribución de pedidos</p>
            <div className="space-y-4">
                {items.map(({ label, value, color }) => {
                    const pct = total > 0 ? Math.round(value / total * 100) : 0;
                    return (
                        <div key={label}>
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                                    <span className="text-xs text-text">{label}</span>
                                </div>
                                <span className="text-xs text-text-muted">{value} · {pct}%</span>
                            </div>
                            <div className="bg-bg rounded-full h-1 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${pct}%`, background: color }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function AlertBanner({ rate, total }: { rate: number; total: number }) {
    if (total === 0) return null;
    const config = rate >= 80
        ? { bg: 'bg-success/10', border: 'border-success/20', text: 'text-success', icon: <CheckCircle size={16} />, title: `Excelente rendimiento · ${rate}%`, desc: 'Por encima del objetivo del 80%. El bot opera de forma óptima.' }
        : rate >= 60
        ? { bg: 'bg-warning/10', border: 'border-warning/20', text: 'text-warning', icon: <AlertTriangle size={16} />, title: `Rendimiento aceptable · ${rate}%`, desc: 'Entre el mínimo (60%) y el objetivo (80%). Hay margen de mejora.' }
        : { bg: 'bg-danger/10',  border: 'border-danger/20',  text: 'text-danger',  icon: <XCircle size={16} />, title: `Rendimiento bajo · ${rate}%`, desc: 'Por debajo del mínimo del 60%. Revisar el flujo de conversación.' };
    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${config.bg} ${config.border}`}>
            <span className={config.text}>{config.icon}</span>
            <div>
                <p className={`text-sm font-medium ${config.text}`}>{config.title}</p>
                <p className="text-xs text-text-muted">{config.desc}</p>
            </div>
        </div>
    );
}

function ReviewRow({ customer }: { customer: ReviewCustomer }) {
    const session = customer.order_sessions[0];
    return (
        <tr className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                        <Phone size={12} className="text-warning" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-text">{customer.phone}</p>
                        <p className="text-xs text-text-muted">{customer.customer_name ?? '—'}</p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_COLORS[customer.customer_tier] ?? TIER_COLORS.new}`}>
                    {TIER_LABELS[customer.customer_tier] ?? customer.customer_tier}
                </span>
            </td>
            <td className="px-4 py-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    customer.risk_score >= 6 ? 'bg-danger/10 text-danger'
                    : customer.risk_score >= 3 ? 'bg-warning/10 text-warning'
                    : 'bg-surface text-text-muted border border-border'
                }`}>
                    {customer.risk_score} pts
                </span>
            </td>
            <td className="px-4 py-3">
                <p className="text-xs text-text-muted max-w-[180px] truncate">{customer.agent_review_reason ?? '—'}</p>
            </td>
            <td className="px-4 py-3">
                {session
                    ? <span className="text-xs text-text-muted font-mono">#{session.order_id}</span>
                    : <span className="text-xs text-text-muted">—</span>
                }
            </td>
            <td className="px-4 py-3">
                <p className="text-xs text-text-muted">
                    {new Date(customer.last_order_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                </p>
            </td>
        </tr>
    );
}

export function DashboardPage() {
    const navigate                          = useNavigate();
    const [range, setRange]                 = useState<FilterRange>('all');
    const [refreshKey, setRefreshKey]       = useState(0);
    const filters                           = toDateRange(range);
    const periodLabel                       = FILTER_RANGES.find(f => f.value === range)?.label ?? 'Histórico';

    const { data, isLoading, isError, isFetching } = useQuery({
        queryKey:        ['dashboard', range, refreshKey],
        queryFn:         () => panelService.getDashboard(filters),
        refetchInterval: 30_000,
    });

    const handleRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (isError || !data?.data) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-sm text-text-muted">Error al cargar el dashboard.</p>
            </div>
        );
    }

    const { customers, orders, total_lost_amount, review_list } = data.data;
    const total = orders.confirmed + orders.pending + orders.cancelled;
    const rate  = total > 0 ? Math.round(orders.confirmed / total * 100) : 0;

    return (
        <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-bold text-text">Dashboard</h1>
                    <p className="text-xs text-text-muted mt-0.5">Resumen operativo · actualiza cada 30s</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-surface border border-border rounded-lg p-0.5 gap-0.5">
                        {FILTER_RANGES.map(({ label, value }) => (
                            <button
                                key={value}
                                onClick={() => setRange(value)}
                                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                                    range === value
                                        ? 'bg-primary text-white'
                                        : 'text-text-muted hover:text-text'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors px-3 py-1.5 border border-border rounded-lg hover:bg-surface"
                    >
                        <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                </div>
            </div>

            <AlertBanner rate={rate} total={total} />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <KpiCard label="Total clientes"  value={customers.total}                        accent="var(--primary)" />
                <KpiCard label="Confirmados"     value={orders.confirmed}                       accent="var(--success)" />
                <KpiCard label="Pendientes"      value={orders.pending}                         accent="var(--warning)" />
                <KpiCard label="Cancelados"      value={orders.cancelled}                       accent="var(--danger)"  />
                <KpiCard label="Blacklist"       value={customers.blacklisted}                  accent="var(--danger)"  />
                <KpiCard label="Monto perdido"   value={`$${Number(total_lost_amount).toFixed(2)}`} accent="var(--danger)" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <RateBar rate={rate} period={periodLabel} />
                <StatusBars confirmed={orders.confirmed} pending={orders.pending} cancelled={orders.cancelled} />
                <div className="bg-surface border border-border rounded-2xl p-5">
                    <p className="text-sm font-medium text-text mb-4">Clientes</p>
                    <div className="space-y-3">
                        {[
                            { icon: <Users size={14} />,         label: 'Total',           value: customers.total,                        color: 'bg-primary/10 text-primary' },
                            { icon: <AlertTriangle size={14} />, label: 'Blacklist',        value: customers.blacklisted,                  color: 'bg-danger/10 text-danger'   },
                            { icon: <UserCheck size={14} />,     label: 'Necesitan ayuda',  value: customers.needs_agent_review,           color: 'bg-warning/10 text-warning' },
                            { icon: <TrendingUp size={14} />,    label: 'Activos',          value: customers.total - customers.blacklisted, color: 'bg-success/10 text-success' },
                        ].map(({ icon, label, value, color }) => (
                            <div key={label} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
                                    <span className="text-xs text-text">{label}</span>
                                </div>
                                <span className="text-sm font-bold text-text">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {review_list.length > 0 && (
                <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                            <p className="text-sm font-medium text-text">Necesitan atención del agente</p>
                            <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full border border-warning/20">
                                {customers.needs_agent_review}
                            </span>
                        </div>
                        <button
                            onClick={() => navigate('/conversations?status=needs_review')}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
                        >
                            Ver todos <ChevronRight size={12} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border bg-bg">
                                    {['Cliente', 'Tier', 'Riesgo', 'Razón', 'Pedido', 'Última orden'].map(h => (
                                        <th key={h} className="px-4 py-2.5 text-xs font-medium text-text-muted whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {review_list.map(c => <ReviewRow key={c.id} customer={c} />)}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {review_list.length === 0 && customers.needs_agent_review === 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-success/20 bg-success/10">
                    <CheckCircle size={16} className="text-success" />
                    <div>
                        <p className="text-sm font-medium text-success">Sin casos urgentes</p>
                        <p className="text-xs text-text-muted">No hay clientes que necesiten atención del agente.</p>
                    </div>
                </div>
            )}
        </div>
    );
}