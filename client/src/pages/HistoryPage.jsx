import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Package, Calendar, Filter, RefreshCw, Building2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

function StatusBadge({ status, numero, label }) {
    if (status === 'ok') return (
        <div className="flex items-center gap-1.5">
            <CheckCircle size={16} className="text-emerald-400 shrink-0" />
            <div>
                <p className="text-xs text-slate-400 leading-none mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-emerald-400">Nº {numero ?? '—'}</p>
            </div>
        </div>
    );
    if (status === 'erro') return (
        <div className="flex items-center gap-1.5">
            <XCircle size={16} className="text-red-400 shrink-0" />
            <div>
                <p className="text-xs text-slate-400 leading-none mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-red-400">Erro</p>
            </div>
        </div>
    );
    return (
        <div className="flex items-center gap-1.5">
            <Clock size={16} className="text-slate-500 shrink-0" />
            <div>
                <p className="text-xs text-slate-400 leading-none mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-slate-500">Pendente</p>
            </div>
        </div>
    );
}

function OrderRow({ order }) {
    const [expanded, setExpanded] = useState(false);
    const date = new Date(order.criadoEm);
    const dateStr = date.toLocaleDateString('pt-BR');
    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const overallOk = order.pedido_compra?.status === 'ok' && order.pedido_venda?.status === 'ok';
    const overallErr = order.pedido_compra?.status === 'erro' || order.pedido_venda?.status === 'erro';

    return (
        <div className={`rounded-xl border transition-all ${overallOk ? 'border-emerald-500/20 bg-emerald-500/5' : overallErr ? 'border-red-500/20 bg-red-500/5' : 'border-slate-700/50 bg-slate-800/40'}`}>
            {/* Header row */}
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full px-5 py-4 flex items-center gap-4 text-left"
            >
                {/* Date */}
                <div className="shrink-0 w-28">
                    <p className="text-sm font-semibold text-white">{dateStr}</p>
                    <p className="text-xs text-slate-400">{timeStr}</p>
                </div>

                {/* Unidade */}
                <div className="shrink-0 w-28">
                    <p className="text-xs text-slate-400 mb-0.5">Unidade</p>
                    <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/25">
                        {order.unidade}
                    </span>
                </div>

                {/* Itens */}
                <div className="shrink-0 w-16 text-center">
                    <p className="text-xs text-slate-400 mb-0.5">Itens</p>
                    <p className="text-sm font-semibold text-white">{order.itens?.length ?? 0}</p>
                </div>

                {/* Status Compra (Escamax) */}
                <div className="flex-1">
                    <StatusBadge
                        status={order.pedido_compra?.status}
                        numero={order.pedido_compra?.numero}
                        label="Req. Compra Escamax"
                    />
                </div>

                {/* Status Venda (VP) */}
                <div className="flex-1">
                    <StatusBadge
                        status={order.pedido_venda?.status}
                        numero={order.pedido_venda?.numero}
                        label="Pedido Venda VP"
                    />
                </div>

                {/* Expand chevron */}
                <div className="shrink-0 text-slate-500">
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </button>

            {/* Expanded detail */}
            {expanded && (
                <div className="px-5 pb-4 border-t border-slate-700/40 pt-3">
                    {/* Erros */}
                    {order.pedido_compra?.status === 'erro' && (
                        <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-xs font-semibold text-red-400 mb-1">Detalhe do erro — Req. Compra Escamax</p>
                            <p className="text-xs text-slate-300 break-words">{order.pedido_compra.detalhe}</p>
                        </div>
                    )}
                    {order.pedido_venda?.status === 'erro' && (
                        <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-xs font-semibold text-red-400 mb-1">Detalhe do erro — Pedido Venda VP</p>
                            <p className="text-xs text-slate-300 break-words">{order.pedido_venda.detalhe}</p>
                        </div>
                    )}

                    {/* Itens */}
                    <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Itens do pedido</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {(order.itens || []).map((item, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/40">
                                <Package size={14} className="text-slate-500 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs font-mono text-sky-400 truncate">{item.codigo}</p>
                                    <p className="text-xs text-slate-400">{item.quantidade}× · R$ {Number(item.preco_unitario || 0).toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function HistoryPage() {
    const token = localStorage.getItem('token');
    const [allOrders, setAllOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Filtros de data
    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const [de, setDe] = useState(firstOfMonth);
    const [ate, setAte] = useState(today);

    // Filtro de unidade (client-side)
    const [unidadeFiltro, setUnidadeFiltro] = useState('Todas');

    // Busca pedidos do servidor — só dispara quando explicitamente chamado
    const fetchOrders = useCallback(async (fromDate, toDate) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (fromDate) params.set('de', fromDate);
            if (toDate) params.set('ate', toDate);
            const res = await fetch(`${API_BASE}/api/orders?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`Erro ${res.status}`);
            const data = await res.json();
            setAllOrders(data);
            setLastUpdated(new Date());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    // Carrega apenas na montagem inicial
    useEffect(() => { fetchOrders(firstOfMonth, today); }, []);  // eslint-disable-line

    // Lista de unidades únicas para o dropdown
    const unidades = useMemo(() => {
        const set = new Set(allOrders.map(o => o.unidade).filter(Boolean));
        return ['Todas', ...Array.from(set).sort()];
    }, [allOrders]);

    // Pedidos filtrados por unidade (client-side)
    const orders = useMemo(() => {
        if (unidadeFiltro === 'Todas') return allOrders;
        return allOrders.filter(o => o.unidade === unidadeFiltro);
    }, [allOrders, unidadeFiltro]);

    const handleFiltrar = () => fetchOrders(de, ate);

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Histórico de Pedidos</h1>
                    <p className="text-sm text-slate-400">
                        Acompanhe o status de cada pedido nas contas Omie.
                        {lastUpdated && (
                            <span className="ml-2 text-slate-600">
                                Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </p>
                </div>
                {/* Botão Atualizar */}
                <button
                    onClick={handleFiltrar}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all disabled:opacity-50 shrink-0"
                    title="Buscar pedidos novamente"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    Atualizar
                </button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-end gap-3 mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <Filter size={16} className="text-slate-500 self-center" />

                {/* Filtro por data */}
                <div className="flex items-center gap-2">
                    <Calendar size={15} className="text-slate-500" />
                    <label className="text-xs text-slate-400">De</label>
                    <input
                        type="date"
                        value={de}
                        onChange={e => setDe(e.target.value)}
                        className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">Até</label>
                    <input
                        type="date"
                        value={ate}
                        onChange={e => setAte(e.target.value)}
                        className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                </div>

                {/* Filtro por unidade */}
                <div className="flex items-center gap-2">
                    <Building2 size={15} className="text-slate-500" />
                    <label className="text-xs text-slate-400">Unidade</label>
                    <select
                        value={unidadeFiltro}
                        onChange={e => setUnidadeFiltro(e.target.value)}
                        className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                        {unidades.map(u => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleFiltrar}
                    className="ml-auto px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-sm font-semibold text-white transition-colors"
                >
                    Filtrar
                </button>
            </div>

            {/* Contador de resultados */}
            {!loading && !error && allOrders.length > 0 && (
                <p className="text-xs text-slate-500 mb-3">
                    {orders.length === allOrders.length
                        ? `${allOrders.length} pedido(s) no período`
                        : `${orders.length} de ${allOrders.length} pedido(s) · filtrado por ${unidadeFiltro}`}
                </p>
            )}

            {/* Lista */}
            {loading && (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 rounded-xl bg-slate-800/40 border border-slate-700/50 animate-pulse" />
                    ))}
                </div>
            )}
            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between gap-4">
                    <span>Erro ao carregar pedidos: {error}</span>
                    <button onClick={handleFiltrar} className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-semibold transition-colors shrink-0">
                        Tentar novamente
                    </button>
                </div>
            )}
            {!loading && !error && orders.length === 0 && (
                <div className="text-center py-16 text-slate-500">
                    <Package size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                        {allOrders.length === 0
                            ? 'Nenhum pedido encontrado no período selecionado.'
                            : `Nenhum pedido para a unidade "${unidadeFiltro}" neste período.`}
                    </p>
                </div>
            )}
            {!loading && !error && orders.length > 0 && (
                <div className="space-y-3">
                    {orders.map(order => (
                        <OrderRow key={order.id} order={order} />
                    ))}
                </div>
            )}
        </div>
    );
}
