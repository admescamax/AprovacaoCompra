import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2, Package, AlertCircle, RefreshCw, LayoutGrid, List, Image as ImageIcon, ShoppingCart, Plus, Minus, Check, Ruler, AlertTriangle, X, Zap, RotateCw } from 'lucide-react';
import CartSidebar from '../components/CartSidebar';
import { useProductCache } from '../hooks/useProductCache';

const CATEGORIAS = ['Todos', 'Corrimãos', 'Escada/Esteira', 'Elevadores', 'BST/Monarch', 'Outros'];

// ── Helpers ──────────────────────────────────────────────────────────────────
const getCategoryStyles = (codigo) => {
    const code = (codigo || '').toUpperCase();
    if (code.startsWith('VPB-')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (code.startsWith('VPEL-')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (code.startsWith('VPER-')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    // Corrimãos (VP-, VPP-, VPKIT-, VPPKIT-, VPPU-)
    if (code.startsWith('VPPKIT-') || code.startsWith('VPKIT-') || code.startsWith('VPPU-') ||
        code.startsWith('VPP-') || code.startsWith('VP-'))
        return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
};

const getCategoryBadgeStyles = (cat, active) => {
    if (active) return 'bg-sky-500 text-slate-900 border-sky-500';
    return 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-sky-500/50 hover:text-sky-400';
};

const formatarMoeda = (valor) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

/** Detecta corrimãos vendidos por metro/mm */
const isCorrimao = (part) => {
    const code = (part?.codigo || '').toUpperCase();
    return (
        code.startsWith('VP-') ||
        code.startsWith('VPP-') ||
        code.startsWith('VPPU-')
    );
};

// ── Controle de quantidade para produtos NORMAIS ──────────────────────────────
function QtyControl({ value, onDec, onInc, size = 'sm' }) {
    const btn = size === 'sm' ? 'p-1' : 'p-2';
    const iconSz = size === 'sm' ? 12 : 16;
    const spanW = size === 'sm' ? 'w-6' : 'w-10';
    return (
        <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700">
            <button onClick={onDec} className={`${btn} hover:text-sky-400 transition-colors`}><Minus size={iconSz} /></button>
            <span className={`${spanW} text-center text-xs font-bold text-white`}>{value}</span>
            <button onClick={onInc} className={`${btn} hover:text-sky-400 transition-colors`}><Plus size={iconSz} /></button>
        </div>
    );
}

// ── Campo de medida em mm para CORRIMÃO ──────────────────────────────────────
function MmInput({ value, onChange, preco, compact = false }) {
    const precoPorMm = preco / 1000;
    const totalPrev = precoPorMm * (value || 0);
    return (
        <div className={`flex flex-col gap-1 ${compact ? '' : 'w-full'}`}>
            <div className="flex items-center gap-1">
                <Ruler size={12} className="text-amber-400 shrink-0" />
                <input
                    type="number"
                    min={1}
                    value={value || ''}
                    onChange={e => onChange(Math.max(1, parseInt(e.target.value) || 1))}
                    placeholder="mm"
                    className={`bg-slate-900 border border-amber-500/40 rounded-lg text-white text-xs font-bold text-center focus:outline-none focus:border-amber-400 transition-colors ${compact ? 'w-20 py-1 px-1' : 'w-full py-1.5 px-2'}`}
                />
            </div>
            {!compact && value > 0 && (
                <p className="text-[10px] text-amber-400 text-right">≈ {formatarMoeda(totalPrev)}</p>
            )}
        </div>
    );
}

export default function SearchPage() {
    // ── Product data via IndexedDB cache ──────────────────────────────────────
    const { parts: allParts, loading, syncStatus, syncProgress, error, refresh, lastUpdate } = useProductCache();

    const [query, setQuery] = useState('');
    const [categoriaAtiva, setCat] = useState('Todos');
    const [viewMode, setViewMode] = useState('list');
    const [selectedPart, setSelectedPart] = useState(null);

    // Carrinho
    const [cart, setCart] = useState(() => {
        try { return JSON.parse(localStorage.getItem('escamax_cart') || '[]'); } catch { return []; }
    });
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [quantities, setQuantities] = useState({});   // { codigo: qty (unidades) }
    const [mmValues, setMmValues] = useState({});        // { codigo: mm (corrimão) }
    const [addedFeedback, setAddedFeedback] = useState({});
    const [zeroStockPopup, setZeroStockPopup] = useState(null); // { product, qty }

    // Persistência local do carrinho
    React.useEffect(() => {
        localStorage.setItem('escamax_cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (product) => {
        const corrimao = isCorrimao(product);
        const qty = corrimao ? (mmValues[product.codigo] || 1) : (quantities[product.codigo] || 1);

        // Bloqueia produtos sem estoque e registra demanda
        if (!product.estoque || product.estoque <= 0) {
            const demands = JSON.parse(localStorage.getItem('escamax_demandas') || '[]');
            const idx = demands.findIndex(d => d.codigo === product.codigo);
            if (idx >= 0) {
                demands[idx].quantidade = Math.max(demands[idx].quantidade, qty);
                demands[idx].data = new Date().toISOString();
            } else {
                demands.push({
                    codigo: product.codigo,
                    descricao: product.descricao,
                    quantidade: qty,
                    data: new Date().toISOString(),
                });
            }
            localStorage.setItem('escamax_demandas', JSON.stringify(demands));
            window.dispatchEvent(new Event('storage')); // notifica Sidebar
            setZeroStockPopup({ product, qty });
            return;
        }

        let cartItem;
        if (corrimao) {
            const mm = mmValues[product.codigo] || 1;
            const precoPorMm = product.preco / 1000;
            cartItem = { ...product, quantity: mm, preco: precoPorMm, mmBased: true };
        } else {
            cartItem = { ...product, quantity: qty };
        }

        setCart(prev => {
            const existing = prev.find(i => i.codigo === product.codigo);
            if (existing) {
                return prev.map(i =>
                    i.codigo === product.codigo
                        ? { ...i, quantity: corrimao ? cartItem.quantity : i.quantity + cartItem.quantity }
                        : i
                );
            }
            return [...prev, cartItem];
        });

        setAddedFeedback(prev => ({ ...prev, [product.codigo]: true }));
        setTimeout(() => setAddedFeedback(prev => ({ ...prev, [product.codigo]: false })), 2000);
    };

    const updateCartQuantity = (codigo, delta) => {
        setCart(prev => prev.map(item => {
            if (item.codigo !== codigo) return item;
            if (item.mmBased) return item; // mm não usa stepper
            return { ...item, quantity: Math.max(1, item.quantity + delta) };
        }));
    };

    const removeFromCart = (codigo) => setCart(prev => prev.filter(i => i.codigo !== codigo));

    const updateQty = (codigo, delta) =>
        setQuantities(prev => ({ ...prev, [codigo]: Math.max(1, (prev[codigo] || 1) + delta) }));

    const setMm = (codigo, v) => setMmValues(prev => ({ ...prev, [codigo]: v }));

    const resultados = useMemo(() => {
        const q = query.toLowerCase().trim();
        const filtered = allParts.filter(p => {
            const matchQuery = !q ||
                (p.codigo || '').toLowerCase().includes(q) ||
                (p.descricao || '').toLowerCase().includes(q);
            const matchCat = categoriaAtiva === 'Todos' || p.categoria === categoriaAtiva;
            return matchQuery && matchCat;
        });
        return filtered.sort((a, b) =>
            (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true, sensitivity: 'base' })
        );
    }, [allParts, query, categoriaAtiva]);

    // Para o badge do carrinho: contar itens mm como 1
    const totalCartItems = cart.reduce((s, i) => s + (i.mmBased ? 1 : i.quantity), 0);

    // CartSidebar via portal: evita qualquer problema de overflow/stacking do ancestral
    const cartPortal = createPortal(
        <CartSidebar
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            cart={cart}
            updateQuantity={updateCartQuantity}
            removeFromItem={removeFromCart}
            clearCart={() => setCart([])}
        />,
        document.body
    );

    const zeroStockModal = zeroStockPopup && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setZeroStockPopup(null)} />
            {/* Modal */}
            <div className="relative bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl shadow-amber-500/10 p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 flex-shrink-0">
                        <AlertTriangle size={24} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-base">Produto sem estoque</h3>
                        <p className="text-slate-400 text-sm mt-1 leading-snug">
                            <span className="font-mono text-amber-300 font-semibold">{zeroStockPopup.product.codigo}</span>
                            {' — '}{(zeroStockPopup.product.descricao || '').slice(0, 60)}
                        </p>
                        <div className="mt-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <p className="text-xs text-amber-300 font-semibold">
                                ✅ Demanda de {zeroStockPopup.qty} {zeroStockPopup.product.mmBased ? 'mm' : 'un'} registrada
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">Acompanhe no menu lateral, acima de Dashboard.</p>
                        </div>
                    </div>
                    <button onClick={() => setZeroStockPopup(null)} className="text-slate-500 hover:text-white transition-colors flex-shrink-0">
                        <X size={18} />
                    </button>
                </div>
                <button
                    onClick={() => setZeroStockPopup(null)}
                    className="mt-4 w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                >
                    Entendido
                </button>
            </div>
        </div>,
        document.body
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Cabeçalho */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white">Estoque VerticalParts</h2>
                    <p className="text-slate-400 mt-1">
                        {loading
                            ? 'Carregando produtos...'
                            : error
                                ? 'Erro ao carregar'
                                : `${resultados.length} produtos disponíveis`}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Botão Carrinho */}
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="relative p-3 bg-sky-500 text-slate-900 rounded-xl shadow-lg shadow-sky-500/20 hover:bg-sky-400 transition-all active:scale-95"
                    >
                        <ShoppingCart size={24} />
                        {totalCartItems > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-slate-900">
                                {totalCartItems}
                            </span>
                        )}
                    </button>

                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 mx-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-700 text-sky-400 shadow-sm border border-slate-600' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
                            title="Ver em grade"
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-700 text-sky-400 shadow-sm border border-slate-600' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
                            title="Ver em lista"
                        >
                            <List size={20} />
                        </button>
                    </div>
                    <button
                        onClick={refresh}
                        disabled={syncStatus === 'syncing'}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all disabled:opacity-50 flex-shrink-0"
                        title="Limpar cache e buscar dados frescos do Omie"
                    >
                        <RefreshCw size={15} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                </div>
                {lastUpdate && (
                    <p className="text-[10px] text-slate-500 text-right mt-1">
                        Última atualização: {lastUpdate.toLocaleDateString('pt-BR')} às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}
            </div>

            {/* ── Banners de status do cache ───────────────────────────────── */}
            {syncStatus === 'cache' && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium animate-in fade-in duration-300">
                    <Zap size={13} className="shrink-0" />
                    Carregado do cache local — clique em <strong className="mx-1">Atualizar</strong> para sincronizar com o Omie
                </div>
            )}
            {syncStatus === 'syncing' && (
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sky-400 text-xs font-medium">
                        <RotateCw size={13} className="animate-spin shrink-0" />
                        {syncProgress.total > 0
                            ? `Sincronizando produtos: ${syncProgress.loaded} / ${syncProgress.total}…`
                            : 'Sincronizando produtos com o Omie…'}
                    </div>
                    {syncProgress.total > 0 && (
                        <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-sky-500 rounded-full transition-all duration-300"
                                style={{ width: `${Math.round((syncProgress.loaded / syncProgress.total) * 100)}%` }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Barra de busca */}
            <div className="relative group max-w-4xl mx-auto w-full">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="text-slate-400 group-focus-within:text-sky-400 transition-colors" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="w-full glass-panel pl-12 pr-6 py-4 rounded-xl text-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all"
                    placeholder="Filtrar por código ou descrição..."
                    disabled={loading || !!error}
                />
            </div>

            {/* Filtros de categoria */}
            {!loading && !error && (
                <div className="flex flex-wrap gap-2">
                    {CATEGORIAS.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCat(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${getCategoryBadgeStyles(cat, categoriaAtiva === cat)}`}
                        >
                            {cat}
                            {cat !== 'Todos' && (
                                <span className="ml-1.5 opacity-60">
                                    {allParts.filter(p => p.categoria === cat).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Conteúdo */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
                    <Loader2 size={40} className="animate-spin text-sky-400" />
                    <p>Consultando estoque na VerticalParts...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                    <AlertCircle size={40} className="text-red-400" />
                    <p className="text-red-400 font-medium">{error}</p>
                    <button onClick={refresh} className="px-6 py-2 rounded-lg bg-sky-500 text-slate-900 font-semibold hover:bg-sky-400 transition-all">Tentar novamente</button>
                </div>
            ) : resultados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
                    <Package size={40} />
                    <p>Nenhum produto encontrado.</p>
                </div>
            ) : viewMode === 'grid' ? (
                /* ── GRID VIEW ── */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {resultados.map(part => {
                        const corrimao = isCorrimao(part);
                        const mm = mmValues[part.codigo] || '';
                        return (
                            <div
                                key={part.codigo}
                                onClick={(e) => { if (e.target.closest('button, input')) return; setSelectedPart(part); }}
                                className="glass-panel rounded-xl p-5 hover:border-sky-500/30 transition-all group relative flex flex-col overflow-hidden cursor-pointer"
                            >
                                <div className="absolute inset-0 bg-sky-400/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                <div className="mb-4 h-40 -mx-5 -mt-5 bg-slate-900/50 flex items-center justify-center overflow-hidden border-b border-white/5">
                                    {part.url_imagem ? (
                                        <img src={part.url_imagem} alt={part.descricao} loading="lazy" className="w-full h-full object-contain hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <ImageIcon size={40} className="text-slate-700" />
                                    )}
                                </div>

                                <div className="relative z-10 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-3 gap-2">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${getCategoryStyles(part.codigo)}`}>
                                            {part.categoria}
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${part.estoque > 0 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                                            {corrimao ? `${part.estoque || 0} mm` : `Estq: ${part.estoque || 0}`}
                                        </span>
                                    </div>
                                    <div className="mb-4">
                                        <span className="text-xs font-mono text-slate-500 block mb-1">{part.codigo}</span>
                                        <h3 className="text-base font-bold text-white leading-tight min-h-[3rem] line-clamp-2" title={part.descricao}>
                                            {part.descricao}
                                        </h3>
                                    </div>
                                    <div className="mt-auto pt-4 border-t border-slate-700/50 space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <div>
                                                <span className="text-xl font-bold text-green-400">{formatarMoeda(part.preco)}</span>
                                                {corrimao && <span className="text-[10px] text-slate-500 block">/metro</span>}
                                            </div>
                                            {corrimao ? (
                                                <MmInput value={mm} onChange={v => setMm(part.codigo, v)} preco={part.preco} compact />
                                            ) : (
                                                <QtyControl
                                                    value={quantities[part.codigo] || 1}
                                                    onDec={() => updateQty(part.codigo, -1)}
                                                    onInc={() => updateQty(part.codigo, 1)}
                                                />
                                            )}
                                        </div>
                                        <button
                                            onClick={() => addToCart(part)}
                                            disabled={corrimao && !mmValues[part.codigo]}
                                            className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
                                                ${addedFeedback[part.codigo] ? 'bg-green-500 text-slate-900' : 'bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-slate-900 border border-sky-500/30'}`}
                                        >
                                            {addedFeedback[part.codigo] ? <><Check size={18} /> Adicionado</> : <><Plus size={18} /> {corrimao ? 'Adicionar medida' : 'Comprar'}</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ── LIST VIEW ── */
                /* overflow-x-auto here (not overflow-hidden) so table scrolls instead of overflowing the page */
                <div className="rounded-xl overflow-x-auto border border-slate-700/50 shadow-inner bg-slate-900/60">
                    <table className="w-full text-left border-collapse" style={{ minWidth: '760px' }}>
                        <thead>
                            <tr className="bg-slate-800/50 border-b border-slate-700">
                                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 w-14">Item</th>
                                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 w-40">Código</th>
                                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Descrição</th>
                                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center w-28">Estoque</th>
                                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right w-32">Preço</th>
                                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center w-52">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {resultados.map(part => {
                                const corrimao = isCorrimao(part);
                                const mm = mmValues[part.codigo] || '';
                                return (
                                    <tr
                                        key={part.codigo}
                                        onClick={(e) => { if (e.target.closest('button, input')) return; setSelectedPart(part); }}
                                        className="hover:bg-sky-400/5 transition-colors group cursor-pointer"
                                    >
                                        {/* Thumb */}
                                        <td className="px-4 py-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                                                {part.url_imagem ? (
                                                    <img src={part.url_imagem} alt={part.descricao} loading="lazy" className="w-full h-full object-contain" />
                                                ) : (
                                                    <ImageIcon size={16} className="text-slate-700" />
                                                )}
                                            </div>
                                        </td>

                                        {/* Código */}
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getCategoryStyles(part.codigo)}`}>
                                                {part.codigo}
                                            </span>
                                        </td>

                                        {/* Descrição */}
                                        <td className="px-4 py-3">
                                            <p className="text-white font-medium text-sm leading-relaxed">{part.descricao}</p>
                                            {corrimao && (
                                                <p className="text-[10px] text-amber-400 mt-0.5 flex items-center gap-1">
                                                    <Ruler size={10} /> Vendido por metro — estoque em mm
                                                </p>
                                            )}
                                        </td>

                                        {/* Estoque */}
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold border ${part.estoque > 0 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                                                {part.estoque || 0}{corrimao ? ' mm' : ''}
                                            </span>
                                        </td>

                                        {/* Preço */}
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-green-400 font-bold text-sm">{formatarMoeda(part.preco)}</span>
                                            {corrimao && <span className="text-[10px] text-slate-500 block">/metro</span>}
                                        </td>

                                        {/* Ação */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 justify-center">
                                                {corrimao ? (
                                                    /* Campo mm compacto */
                                                    <MmInput value={mm} onChange={v => setMm(part.codigo, v)} preco={part.preco} compact />
                                                ) : (
                                                    <QtyControl
                                                        value={quantities[part.codigo] || 1}
                                                        onDec={() => updateQty(part.codigo, -1)}
                                                        onInc={() => updateQty(part.codigo, 1)}
                                                        size="sm"
                                                    />
                                                )}
                                                <button
                                                    onClick={() => addToCart(part)}
                                                    disabled={corrimao && !mmValues[part.codigo]}
                                                    className={`p-2 rounded-lg transition-all active:scale-95 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed
                                                        ${addedFeedback[part.codigo] ? 'bg-green-500 text-slate-900' : 'bg-sky-500 text-slate-900 hover:bg-sky-400'}`}
                                                    title={corrimao && !mm ? 'Informe a medida em mm' : 'Adicionar ao carrinho'}
                                                >
                                                    {addedFeedback[part.codigo] ? <Check size={16} /> : <ShoppingCart size={16} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* CartSidebar via portal → sem interferência de overflow ancestral */}
            {cartPortal}

            {/* Modal de Detalhes do Produto */}
            {selectedPart && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div
                        className="glass-panel w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border-white/10 flex flex-col md:flex-row"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Imagem */}
                        <div className="w-full md:w-1/2 bg-slate-900 flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-white/5">
                            {selectedPart.url_imagem ? (
                                <img src={selectedPart.url_imagem} alt={selectedPart.descricao} className="max-w-full max-h-[300px] object-contain" />
                            ) : (
                                <ImageIcon size={80} className="text-slate-800" />
                            )}
                        </div>

                        {/* Infos */}
                        <div className="w-full md:w-1/2 p-8 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${getCategoryStyles(selectedPart.codigo)}`}>
                                    {selectedPart.categoria}
                                </span>
                                <button onClick={() => setSelectedPart(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
                                    <span className="text-xl leading-none">×</span>
                                </button>
                            </div>

                            <span className="text-xs font-mono text-slate-500 mb-1">{selectedPart.codigo}</span>
                            <h2 className="text-2xl font-bold text-white mb-4 leading-tight">{selectedPart.descricao}</h2>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">{isCorrimao(selectedPart) ? 'Preço por metro' : 'Preço Unitário'}</span>
                                    <span className="text-xl font-bold text-green-400">{formatarMoeda(selectedPart.preco)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Estoque Disponível</span>
                                    <span className={`font-bold ${selectedPart.estoque > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {selectedPart.estoque || 0} {isCorrimao(selectedPart) ? 'mm' : 'unidades'}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-auto space-y-4">
                                {isCorrimao(selectedPart) ? (
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-amber-500/20">
                                        <p className="text-xs text-amber-400 mb-2 flex items-center gap-1.5">
                                            <Ruler size={13} /> Informe a medida desejada em mm
                                        </p>
                                        <MmInput
                                            value={mmValues[selectedPart.codigo] || ''}
                                            onChange={v => setMm(selectedPart.codigo, v)}
                                            preco={selectedPart.preco}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 justify-between bg-slate-800/50 p-3 rounded-xl border border-white/5">
                                        <span className="text-sm text-slate-300">Quantidade</span>
                                        <QtyControl
                                            value={quantities[selectedPart.codigo] || 1}
                                            onDec={() => updateQty(selectedPart.codigo, -1)}
                                            onInc={() => updateQty(selectedPart.codigo, 1)}
                                            size="lg"
                                        />
                                    </div>
                                )}

                                <button
                                    onClick={() => { addToCart(selectedPart); setSelectedPart(null); }}
                                    disabled={isCorrimao(selectedPart) && !mmValues[selectedPart.codigo]}
                                    className="w-full py-4 rounded-xl bg-sky-500 text-slate-900 font-bold hover:bg-sky-400 transition-all shadow-lg shadow-sky-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <ShoppingCart size={20} />
                                    {isCorrimao(selectedPart) ? 'Adicionar medida ao Carrinho' : 'Adicionar ao Carrinho'}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="absolute inset-0 z-[-1]" onClick={() => setSelectedPart(null)} />
                </div>,
                document.body
            )}
            {cartPortal}
            {zeroStockModal}
        </div>
    );
}
