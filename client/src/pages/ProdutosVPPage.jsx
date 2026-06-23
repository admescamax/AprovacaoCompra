import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Package, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';

const SUPABASE_URL = 'https://hhgvlcskxopryqvhofsg.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZ3ZsY3NreG9wcnlxdmhvZnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3ODc0NjIsImV4cCI6MjA5MDM2MzQ2Mn0.Hzl6k-TM_U1Ae8cNUPtz8MFBbZ4EVF3EGOhvgV7xnqk';

async function fetchProdutos() {
    const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/omie_produtos?select=codigo_produto,descricao,unidade,estoque_atual,valor_unitario,updated_at&ativo=eq.true&order=descricao.asc&limit=1000`,
        {
            headers: {
                'apikey': SUPABASE_ANON,
                'Authorization': `Bearer ${SUPABASE_ANON}`,
            }
        }
    );
    if (!resp.ok) throw new Error(`Supabase ${resp.status}`);
    return resp.json();
}

async function triggerSync(token) {
    const resp = await fetch('/api/produtos-vp/sync', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    return resp.json();
}

function SortIcon({ col, sort }) {
    if (sort.col !== col) return <span className="ml-1 text-neutral-300">↕</span>;
    return sort.asc
        ? <ChevronUp className="inline h-3.5 w-3.5 ml-0.5 text-primary" />
        : <ChevronDown className="inline h-3.5 w-3.5 ml-0.5 text-primary" />;
}

export default function ProdutosVPPage() {
    const [produtos, setProdutos]   = useState([]);
    const [loading, setLoading]     = useState(true);
    const [syncing, setSyncing]     = useState(false);
    const [error, setError]         = useState(null);
    const [search, setSearch]       = useState('');
    const [syncMsg, setSyncMsg]     = useState(null);
    const [sort, setSort]           = useState({ col: 'descricao', asc: true });
    const [lastUpdate, setLastUpdate] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchProdutos();
            setProdutos(data);
            if (data.length > 0) {
                const latest = data.reduce((a, b) =>
                    new Date(a.updated_at) > new Date(b.updated_at) ? a : b
                );
                setLastUpdate(new Date(latest.updated_at));
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSync = async () => {
        setSyncing(true);
        setSyncMsg(null);
        try {
            const token = localStorage.getItem('token');
            const result = await triggerSync(token);
            setSyncMsg(result.ok
                ? `✓ ${result.synced} produtos sincronizados`
                : `Erro: ${result.errors?.join(', ') || result.error || 'falha no sync'}`
            );
            if (result.ok) await load();
        } catch (e) {
            setSyncMsg(`Erro: ${e.message}`);
        } finally {
            setSyncing(false);
        }
    };

    const toggleSort = (col) => {
        setSort(s => s.col === col ? { col, asc: !s.asc } : { col, asc: true });
    };

    const filtered = produtos.filter(p =>
        p.descricao?.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo_produto?.toLowerCase().includes(search.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
        const av = a[sort.col] ?? '';
        const bv = b[sort.col] ?? '';
        if (typeof av === 'number') return sort.asc ? av - bv : bv - av;
        return sort.asc
            ? String(av).localeCompare(String(bv))
            : String(bv).localeCompare(String(av));
    });

    const estoqueZero = sorted.filter(p => p.estoque_atual <= 0).length;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="vp-eyebrow">Catálogo</p>
                    <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-neutral-900">
                        Produtos VerticalParts
                    </h1>
                    {lastUpdate && (
                        <p className="mt-0.5 text-xs text-neutral-400">
                            Atualizado em {lastUpdate.toLocaleString('pt-BR')}
                        </p>
                    )}
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-card transition hover:border-primary hover:text-primary disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                </button>
            </div>

            {/* Sync feedback */}
            {syncMsg && (
                <div className={`rounded-xl border px-4 py-2.5 text-sm ${
                    syncMsg.startsWith('✓')
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                }`}>
                    {syncMsg}
                </div>
            )}

            {/* Stats */}
            {!loading && !error && (
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Total de Produtos', value: produtos.length, gold: true },
                        { label: 'Com Estoque', value: produtos.length - estoqueZero, color: 'text-green-600' },
                        { label: 'Sem Estoque', value: estoqueZero, color: estoqueZero > 0 ? 'text-red-500' : 'text-neutral-400' },
                    ].map(({ label, value, gold, color }) => (
                        <div key={label} className="rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-card">
                            <p className="text-xs text-neutral-400">{label}</p>
                            <p className={`text-2xl font-bold ${gold ? 'text-primary-dark' : color}`}>
                                {value.toLocaleString('pt-BR')}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                    type="text"
                    placeholder="Buscar por código ou descrição..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-card outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card">
                {loading ? (
                    <div className="flex items-center justify-center gap-3 py-16 text-neutral-400">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Carregando produtos...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center gap-2 py-16 text-center">
                        <AlertTriangle className="h-8 w-8 text-red-400" />
                        <p className="text-sm font-medium text-red-600">Erro ao carregar produtos</p>
                        <p className="text-xs text-neutral-400">{error}</p>
                        <button onClick={load} className="mt-2 text-xs text-primary underline">Tentar novamente</button>
                    </div>
                ) : sorted.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-16 text-center">
                        <Package className="h-10 w-10 text-neutral-200" />
                        <p className="text-sm font-medium text-neutral-500">
                            {search ? 'Nenhum produto encontrado' : 'Lista vazia — clique em Sincronizar Agora'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-100 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                                    {[
                                        { key: 'codigo_produto', label: 'Código' },
                                        { key: 'descricao',      label: 'Descrição' },
                                        { key: 'unidade',        label: 'Un.' },
                                        { key: 'estoque_atual',  label: 'Estoque' },
                                        { key: 'valor_unitario', label: 'Valor Unit.' },
                                    ].map(({ key, label }) => (
                                        <th
                                            key={key}
                                            onClick={() => toggleSort(key)}
                                            className="cursor-pointer select-none px-4 py-3 text-left hover:text-primary transition-colors"
                                        >
                                            {label}<SortIcon col={key} sort={sort} />
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                {sorted.map((p) => (
                                    <tr key={p.codigo_produto} className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                                            {p.codigo_produto}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-neutral-800">
                                            {p.descricao}
                                        </td>
                                        <td className="px-4 py-3 text-neutral-500">{p.unidade}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                p.estoque_atual > 0
                                                    ? 'bg-green-50 text-green-700'
                                                    : 'bg-red-50 text-red-600'
                                            }`}>
                                                {Number(p.estoque_atual).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-neutral-700">
                                            {Number(p.valor_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="border-t border-neutral-100 px-4 py-2.5 text-xs text-neutral-400">
                            {sorted.length} de {produtos.length} produto{produtos.length !== 1 ? 's' : ''}
                            {search && ` — filtrando por "${search}"`}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
