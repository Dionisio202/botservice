import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Search, Filter, Send, Paperclip, X, Info,
    ArrowLeft, CheckCircle, XCircle, AlertTriangle,
    Phone, Clock, ShieldOff, UserCheck, DollarSign,
    ChevronDown, FileText, RefreshCw, Zap,
} from 'lucide-react';
import { panelService } from '@/services/panelService';
import { messagesService } from '@/services/messagesService';
import { ordersService } from '@/services/ordersService';
import { customersService } from '@/services/customersService';
import type { ConversationSession } from '@/types/panel.types';
import type { Message } from '@/types/message.types';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: 'Pendiente',  color: 'text-warning',    bg: 'bg-warning/10 border-warning/20'  },
    confirmed: { label: 'Confirmado', color: 'text-success',    bg: 'bg-success/10 border-success/20'  },
    cancelled: { label: 'Cancelado',  color: 'text-danger',     bg: 'bg-danger/10 border-danger/20'    },
    expired:   { label: 'Expirado',   color: 'text-text-muted', bg: 'bg-surface border-border'         },
    delivered: { label: 'Entregado',  color: 'text-success',    bg: 'bg-success/10 border-success/20'  },
    shipped:   { label: 'Enviado',    color: 'text-primary',    bg: 'bg-primary/10 border-primary/20'  },
    lost:      { label: 'Perdido',    color: 'text-danger',     bg: 'bg-danger/10 border-danger/20'    },
    returned:  { label: 'Devuelto',   color: 'text-danger',     bg: 'bg-danger/10 border-danger/20'    },
};

const STATUS_FILTERS = [
    { label: 'Todos',       value: ''          },
    { label: 'Pendientes',  value: 'pending'   },
    { label: 'Confirmados', value: 'confirmed' },
    { label: 'Cancelados',  value: 'cancelled' },
    { label: 'Expirados',   value: 'expired'   },
];

const TIER_LABELS: Record<string, string> = { new: 'Nuevo', regular: 'Regular', loyal: 'Leal' };

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.expired;
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}

function timeAgo(dateStr: string): string {
    const diff  = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days  = Math.floor(hours / 24);
    if (mins < 1)   return 'ahora';
    if (mins < 60)  return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
}

function ConversationItem({ session, selected, onClick }: {
    session:  ConversationSession;
    selected: boolean;
    onClick:  () => void;
}) {
    const lastMsg  = session.messages[0];
    const cfg      = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.expired;
    const hasAlert = session.customer.needs_agent_review;

    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-4 py-3 border-b border-border transition-colors flex gap-3 ${
                selected ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-surface'
            }`}
        >
            <div className="relative shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    selected ? 'bg-primary text-white' : 'bg-surface border border-border text-text-muted'
                }`}>
                    {(session.customer.customer_name ?? session.customer.phone)[0].toUpperCase()}
                </div>
                {hasAlert && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-warning rounded-full border-2 border-bg" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-medium text-text truncate">
                        {session.customer.customer_name ?? session.customer.phone}
                    </p>
                    <span className="text-xs text-text-muted shrink-0 ml-1">{timeAgo(session.updated_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-xs text-text-muted truncate">{lastMsg?.content ?? '—'}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ml-1 ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                    </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">#{session.order_id}</p>
            </div>
        </button>
    );
}

function ChatMessage({ msg }: { msg: Message }) {
    const isOut = msg.direction === 'outbound';
    return (
        <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-2`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                isOut
                    ? 'bg-primary text-white rounded-tr-sm'
                    : 'bg-surface border border-border text-text rounded-tl-sm'
            }`}>
                {msg.media_url && (
                    <div className="mb-2">
                        {msg.media_type === 'image'
                            ? <img src={msg.media_url} alt="media" className="rounded-lg max-w-full max-h-48 object-cover" />
                            : <a href={msg.media_url} target="_blank" rel="noreferrer"
                                className="flex items-center gap-2 text-xs underline opacity-80">
                                <FileText size={14} /> Ver documento
                              </a>
                        }
                    </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                <p className={`text-xs mt-1 ${isOut ? 'text-white/60' : 'text-text-muted'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
}

function ChatPanel({ session, onClose }: { session: ConversationSession; onClose: () => void }) {
    const qc                                    = useQueryClient();
    const [text, setText]                       = useState('');
    const [showInfo, setShowInfo]               = useState(false);
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [lostAmount, setLostAmount]           = useState('');
    const [showLostInput, setShowLostInput]     = useState(false);
    const [showActions, setShowActions]         = useState(false);
    const [mediaPreview, setMediaPreview]       = useState<File | null>(null);
    const bottomRef                             = useRef<HTMLDivElement>(null);
    const fileRef                               = useRef<HTMLInputElement>(null);

    const { data: msgsData, isLoading: msgsLoading, isFetching, refetch } = useQuery({
        queryKey: ['messages', session.id],
        queryFn:  () => messagesService.getBySession(session.id),
    });

    const { data: qrData } = useQuery({
        queryKey: ['quick-replies'],
        queryFn:  messagesService.getQuickReplies,
        staleTime: 60_000,
    });

    const messages     = msgsData?.data ?? [];
    const quickReplies = qrData?.data   ?? [];

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    useEffect(() => {
        setText('');
        setMediaPreview(null);
        setShowLostInput(false);
        setShowActions(false);
        setShowQuickReplies(false);
    }, [session.id]);

    const sendMutation = useMutation({
        mutationFn: () => messagesService.send({
            session_id: session.id,
            customerId: session.customer.id,
            phone:      session.customer.phone,
            content:    text.trim(),
        }),
        onSuccess: () => {
            setText('');
            refetch();
            qc.invalidateQueries({ queryKey: ['conversations'] });
        },
    });

    const sendMediaMutation = useMutation({
        mutationFn: (file: File) => messagesService.sendMedia({
            phone:      session.customer.phone,
            customerId: session.customer.id,
            sessionId:  session.id,
            caption:    text.trim() || undefined,
            file,
        }),
        onSuccess: () => {
            setText('');
            setMediaPreview(null);
            refetch();
            qc.invalidateQueries({ queryKey: ['conversations'] });
        },
    });

    const statusMutation = useMutation({
        mutationFn: (status: string) => ordersService.updateStatus(session.order_id, status),
        onSuccess:  () => qc.invalidateQueries({ queryKey: ['conversations'] }),
    });

    const lostMutation = useMutation({
        mutationFn: () => customersService.recordLost(session.customer.phone, Number(lostAmount)),
        onSuccess: () => {
            setShowLostInput(false);
            setLostAmount('');
            qc.invalidateQueries({ queryKey: ['conversations'] });
        },
    });

    const reviewMutation = useMutation({
        mutationFn: ({ approved, trustFully }: { approved: boolean; trustFully?: boolean }) =>
            customersService.reviewOverride(session.customer.phone, approved, trustFully),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setMediaPreview(file);
        e.target.value = '';
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (mediaPreview) { sendMediaMutation.mutate(mediaPreview); return; }
            if (text.trim()) sendMutation.mutate();
        }
    };

    const handleSend = () => {
        if (mediaPreview) { sendMediaMutation.mutate(mediaPreview); return; }
        if (text.trim()) sendMutation.mutate();
    };

    const isSending = sendMutation.isPending || sendMediaMutation.isPending;

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface shrink-0">
                <button onClick={onClose} className="lg:hidden text-text-muted hover:text-text transition-colors">
                    <ArrowLeft size={18} />
                </button>
                <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {(session.customer.customer_name ?? session.customer.phone)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text truncate">
                            {session.customer.customer_name ?? session.customer.phone}
                        </p>
                        {session.customer.needs_agent_review && (
                            <span className="text-xs bg-warning/10 text-warning border border-warning/20 px-1.5 py-0.5 rounded-full shrink-0">
                                Revisión
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-text-muted">{session.customer.phone} · #{session.order_id}</p>
                        <StatusBadge status={session.status} />
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => refetch()}
                        className="p-1.5 rounded-lg border border-border text-text-muted hover:text-text hover:bg-bg transition-colors"
                        title="Actualizar mensajes"
                    >
                        <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setShowActions(a => !a)}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 border border-border rounded-lg text-text-muted hover:bg-surface hover:text-text transition-colors"
                        >
                            Acciones <ChevronDown size={12} />
                        </button>
                        {showActions && (
                            <div className="absolute right-0 top-full mt-1 bg-bg border border-border rounded-xl shadow-lg z-50 min-w-[190px] py-1 overflow-hidden">
                                {['confirmed', 'cancelled', 'shipped', 'delivered', 'lost'].map(s => (
                                    <button key={s}
                                        onClick={() => { statusMutation.mutate(s); setShowActions(false); }}
                                        className="w-full text-left px-4 py-2 text-xs text-text hover:bg-surface transition-colors flex items-center gap-2"
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                            STATUS_CONFIG[s]?.color.replace('text-', 'bg-')
                                        }`} />
                                        Marcar como {STATUS_CONFIG[s]?.label}
                                    </button>
                                ))}
                                <div className="border-t border-border my-1" />
                                <button
                                    onClick={() => { setShowLostInput(l => !l); setShowActions(false); }}
                                    className="w-full text-left px-4 py-2 text-xs text-danger hover:bg-surface transition-colors flex items-center gap-2"
                                >
                                    <DollarSign size={12} /> Registrar monto perdido
                                </button>
                                {session.customer.is_blacklisted && (
                                    <button
                                        onClick={() => { customersService.unblacklist(session.customer.phone); setShowActions(false); }}
                                        className="w-full text-left px-4 py-2 text-xs text-success hover:bg-surface transition-colors flex items-center gap-2"
                                    >
                                        <ShieldOff size={12} /> Desbloquear cliente
                                    </button>
                                )}
                                {session.customer.needs_agent_review && (
                                    <>
                                        <div className="border-t border-border my-1" />
                                        <button
                                            onClick={() => { reviewMutation.mutate({ approved: true }); setShowActions(false); }}
                                            className="w-full text-left px-4 py-2 text-xs text-success hover:bg-surface transition-colors flex items-center gap-2"
                                        >
                                            <UserCheck size={12} /> Aprobar revisión
                                        </button>
                                        <button
                                            onClick={() => { reviewMutation.mutate({ approved: true, trustFully: true }); setShowActions(false); }}
                                            className="w-full text-left px-4 py-2 text-xs text-primary hover:bg-surface transition-colors flex items-center gap-2"
                                        >
                                            <CheckCircle size={12} /> Aprobar y confiar
                                        </button>
                                        <button
                                            onClick={() => { reviewMutation.mutate({ approved: false }); setShowActions(false); }}
                                            className="w-full text-left px-4 py-2 text-xs text-danger hover:bg-surface transition-colors flex items-center gap-2"
                                        >
                                            <XCircle size={12} /> Escalar a blacklist
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setShowInfo(i => !i)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                            showInfo
                                ? 'bg-primary/10 border-primary/20 text-primary'
                                : 'border-border text-text-muted hover:text-text hover:bg-surface'
                        }`}
                    >
                        <Info size={16} />
                    </button>
                </div>
            </div>

            {showLostInput && (
                <div className="px-4 py-3 bg-danger/5 border-b border-danger/20 flex items-center gap-3 shrink-0">
                    <DollarSign size={14} className="text-danger shrink-0" />
                    <input
                        type="number"
                        value={lostAmount}
                        onChange={e => setLostAmount(e.target.value)}
                        placeholder="Monto perdido (ej: 45.00)"
                        className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted outline-none"
                    />
                    <button
                        onClick={() => lostMutation.mutate()}
                        disabled={!lostAmount || lostMutation.isPending}
                        className="text-xs px-3 py-1.5 bg-danger text-white rounded-lg disabled:opacity-50"
                    >
                        {lostMutation.isPending ? '...' : 'Registrar'}
                    </button>
                    <button onClick={() => setShowLostInput(false)} className="text-text-muted hover:text-text">
                        <X size={14} />
                    </button>
                </div>
            )}

            <div className="flex flex-1 min-h-0">
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 overflow-y-auto px-4 py-4">
                        {msgsLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mb-3">
                                    <Phone size={20} className="text-text-muted" />
                                </div>
                                <p className="text-sm text-text-muted">Sin mensajes aún</p>
                            </div>
                        ) : (
                            messages.map(m => <ChatMessage key={m.id} msg={m} />)
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {showQuickReplies && quickReplies.length > 0 && (
                        <div className="border-t border-border bg-surface px-4 py-2 shrink-0">
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {quickReplies.map(qr => (
                                    <button
                                        key={qr.id}
                                        onClick={() => { setText(qr.content); setShowQuickReplies(false); }}
                                        className="text-xs px-3 py-1.5 bg-bg border border-border rounded-lg whitespace-nowrap hover:border-primary hover:text-primary transition-colors shrink-0"
                                    >
                                        {qr.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {mediaPreview && (
                        <div className="px-4 py-2 border-t border-border bg-surface flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                {mediaPreview.type.startsWith('image/')
                                    ? <img src={URL.createObjectURL(mediaPreview)} alt="preview" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                    : <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <FileText size={16} className="text-primary" />
                                      </div>
                                }
                                <p className="text-xs text-text truncate">{mediaPreview.name}</p>
                            </div>
                            <button onClick={() => setMediaPreview(null)} className="text-text-muted hover:text-danger transition-colors shrink-0">
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    <div className="px-4 py-3 border-t border-border bg-surface shrink-0">
                        <div className="flex items-end gap-2">
                            <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                            <button
                                onClick={() => fileRef.current?.click()}
                                className={`p-2 rounded-lg transition-colors shrink-0 ${
                                    mediaPreview ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-text hover:bg-bg'
                                }`}
                                title="Adjuntar archivo"
                            >
                                <Paperclip size={18} />
                            </button>
                            <button
                                onClick={() => setShowQuickReplies(q => !q)}
                                className={`p-2 rounded-lg transition-colors shrink-0 ${
                                    showQuickReplies ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-text hover:bg-bg'
                                }`}
                                title="Respuestas rápidas"
                            >
                                <Zap size={18} />
                            </button>
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={mediaPreview ? 'Añade un caption (opcional)...' : 'Escribe un mensaje...'}
                                rows={1}
                                className="flex-1 bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted outline-none focus:border-primary transition-colors resize-none max-h-32"
                                style={{ minHeight: '42px' }}
                            />
                            <button
                                onClick={handleSend}
                                disabled={(!text.trim() && !mediaPreview) || isSending}
                                className="p-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl transition-colors shrink-0"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                        <p className="text-xs text-text-muted mt-1.5 ml-1">
                            Enter para enviar · Shift+Enter para nueva línea
                        </p>
                    </div>
                </div>

                {showInfo && (
                    <div className="w-72 border-l border-border bg-surface overflow-y-auto shrink-0">
                        <div className="p-4 space-y-4">
                            <div>
                                <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">Pedido</p>
                                <div className="space-y-2.5">
                                    {[
                                        { label: 'Orden',    value: `#${session.order_id}`,                                                                      mono: true  },
                                        { label: 'Total',    value: `$${Number(session.order_total ?? 0).toFixed(2)}`,                                           mono: false },
                                        { label: 'Intentos', value: String(session.attempts),                                                                    mono: false },
                                        { label: 'Creado',   value: new Date(session.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }),mono: false },
                                        { label: 'Paso',     value: session.conv_step.replace('awaiting_', ''),                                                  mono: true  },
                                    ].map(({ label, value, mono }) => (
                                        <div key={label} className="flex justify-between items-center">
                                            <span className="text-xs text-text-muted">{label}</span>
                                            <span className={`text-xs text-text ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-text-muted">Estado</span>
                                        <StatusBadge status={session.status} />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-border pt-4">
                                <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">Cliente</p>
                                <div className="space-y-2.5">
                                    {[
                                        { label: 'Teléfono', value: session.customer.phone,                                                          mono: true  },
                                        { label: 'Tier',     value: TIER_LABELS[session.customer.customer_tier] ?? session.customer.customer_tier,   mono: false },
                                        { label: 'Riesgo',   value: `${session.customer.risk_score} pts`,                                            mono: false },
                                    ].map(({ label, value, mono }) => (
                                        <div key={label} className="flex justify-between items-center">
                                            <span className="text-xs text-text-muted">{label}</span>
                                            <span className={`text-xs text-text ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
                                        </div>
                                    ))}
                                    {session.customer.is_blacklisted && (
                                        <div className="flex items-center gap-1.5 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-2 py-1.5 mt-1">
                                            <AlertTriangle size={12} /> En blacklist
                                        </div>
                                    )}
                                    {session.customer.needs_agent_review && (
                                        <div className="flex items-center gap-1.5 text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-2 py-1.5">
                                            <Clock size={12} /> Necesita revisión
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export function ConversationsPage() {
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [search, setSearch]         = useState('');
    const [statusFilter, setStatus]   = useState('');
    const [page, setPage]             = useState(1);
    const showChat                    = selectedId !== null;

    const { data, isLoading, isFetching: listFetching, refetch: refetchList } = useQuery({
        queryKey: ['conversations', statusFilter, search, page],
        queryFn:  () => panelService.getConversations({ status: statusFilter, search, page, limit: 30 }),
    });

    const sessions   = data?.data?.data ?? [];
    const totalPages = data?.data?.totalPages ?? 1;
    const selected   = sessions.find(s => s.id === selectedId) ?? null;

    const handleSelect = useCallback((id: number) => setSelectedId(id), []);
    const handleClose  = useCallback(() => setSelectedId(null), []);

    return (
        <div className="flex h-full overflow-hidden">
            <div className={`flex flex-col border-r border-border bg-bg shrink-0 ${
                showChat ? 'hidden lg:flex lg:w-72 xl:w-80' : 'flex w-full lg:w-72 xl:w-80'
            }`}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                    <p className="text-sm font-medium text-text">Conversaciones</p>
                    <button
                        onClick={() => refetchList()}
                        className="text-text-muted hover:text-text transition-colors"
                        title="Actualizar lista"
                    >
                        <RefreshCw size={14} className={listFetching ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="p-3 border-b border-border space-y-2 shrink-0">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Buscar nombre o teléfono..."
                            className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-text placeholder:text-text-muted outline-none focus:border-primary transition-colors"
                        />
                    </div>
                    <div className="flex gap-1 overflow-x-auto pb-0.5">
                        {STATUS_FILTERS.map(({ label, value }) => (
                            <button
                                key={value}
                                onClick={() => { setStatus(value); setPage(1); }}
                                className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors shrink-0 ${
                                    statusFilter === value
                                        ? 'bg-primary text-white'
                                        : 'bg-surface border border-border text-text-muted hover:text-text'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6">
                            <Filter size={24} className="text-text-muted mb-2" />
                            <p className="text-sm text-text-muted">Sin conversaciones</p>
                        </div>
                    ) : (
                        sessions.map(s => (
                            <ConversationItem
                                key={s.id}
                                session={s}
                                selected={s.id === selectedId}
                                onClick={() => handleSelect(s.id)}
                            />
                        ))
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border shrink-0">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="text-xs text-text-muted disabled:opacity-40 hover:text-text transition-colors"
                        >
                            ← Anterior
                        </button>
                        <span className="text-xs text-text-muted">{page} / {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="text-xs text-text-muted disabled:opacity-40 hover:text-text transition-colors"
                        >
                            Siguiente →
                        </button>
                    </div>
                )}
            </div>

            <div className={`flex-1 min-w-0 ${showChat ? 'flex' : 'hidden lg:flex'} flex-col`}>
                {selected ? (
                    <ChatPanel session={selected} onClose={handleClose} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <div className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mb-4">
                            <Phone size={28} className="text-text-muted" />
                        </div>
                        <p className="text-sm font-medium text-text mb-1">Selecciona una conversación</p>
                        <p className="text-xs text-text-muted">Elige un chat de la lista para ver los mensajes</p>
                    </div>
                )}
            </div>
        </div>
    );
}