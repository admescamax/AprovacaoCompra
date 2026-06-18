import React, { useState, useEffect } from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2, CheckCircle, Loader2, Image as ImageIcon, Truck, Star, CreditCard, Tag } from 'lucide-react';

const BRANCHES = [
    { id: 'SAOPAULO', name: 'Escamax - São Paulo' },
    { id: 'BRASILIA', name: 'Escamax - Brasília' },
    { id: 'SALVADOR', name: 'Escamax - Salvador' },
    { id: 'FLORIANOPOLIS', name: 'Escamax - Florianópolis' },
    { id: 'PICARRAS', name: 'Escamax - Piçarras' },
];

const TIPOS_FRETE = [
    { value: '0', label: 'CIF – Por conta da VerticalParts' },
    { value: '1', label: 'FOB – Por conta da Escamax' },
    { value: '2', label: 'Transportadora coleta na VerticalParts' },
];

const PRIORIDADES = [
    { value: 'Balcão', label: 'Balcão', sub: '30 min' },
    { value: 'Urgente', label: 'Urgente', sub: '3 horas' },
    { value: 'Normal', label: 'Normal', sub: '24 horas' },
];

// ── Componentes auxiliares ────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label }) {
    return (
        <div className="flex items-center gap-2 mb-3">
            <Icon size={13} className="text-slate-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        </div>
    );
}

function RadioGroup({ options, value, onChange, columns = 1 }) {
    return (
        <div className={`grid gap-2 ${columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {options.map(opt => {
                const active = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`rounded-lg border px-3 py-2 text-left transition-all text-xs font-semibold
                            ${active
                                ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <span className="block">{opt.label}</span>
                        {opt.sub && <span className={`text-[10px] font-normal ${active ? 'text-sky-400/70' : 'text-slate-600'}`}>{opt.sub}</span>}
                    </button>
                );
            })}
        </div>
    );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CartSidebar({ isOpen, onClose, cart, updateQuantity, removeFromItem, clearCart }) {
    const [selectedBranch, setSelectedBranch] = useState('');
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [checkoutStatus, setCheckoutStatus] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    // Novos campos
    const [finalidade, setFinalidade] = useState('Revenda');
    const [tipoFrete, setTipoFrete] = useState('1'); // FOB padrão
    const [prioridade, setPrioridade] = useState('Normal');
    const [valorEntrada, setValorEntrada] = useState('');
    const [dataEntrada, setDataEntrada] = useState('');
    const [parcelas, setParcelas] = useState('1');

    // Campos condicionais de frete
    const [enderecoEntrega, setEnderecoEntrega] = useState('');
    const [transportadoraRazao, setTransportadoraRazao] = useState('');
    const [transportadoraCnpj, setTransportadoraCnpj] = useState('');

    useEffect(() => {
        if (isOpen) {
            setCheckoutStatus(null);
            setErrorMessage('');
            setIsCheckingOut(false);
        }
    }, [isOpen]);

    const totalItems = cart.reduce((sum, item) => sum + (item.mmBased ? 1 : item.quantity), 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.preco * item.quantity), 0);

    const formatarMoeda = (valor) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

    const today = new Date().toISOString().slice(0, 10);

    const handleCheckout = async () => {
        setIsCheckingOut(true);
        setCheckoutStatus(null);
        setErrorMessage('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/checkout/processar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    unidade: selectedBranch,
                    itens: cart.map(item => ({
                        codigo: item.codigo,
                        quantidade: item.quantity,
                        preco_unitario: item.preco,
                        preco_original: item.preco_original,
                    })),
                    finalidade,
                    tipoFrete,
                    prioridade,
                    enderecoEntrega: tipoFrete === '0' ? enderecoEntrega : null,
                    transportadora: tipoFrete === '2' ? {
                        razaoSocial: transportadoraRazao,
                        cnpj: transportadoraCnpj,
                    } : null,
                    pagamento: {
                        valorEntrada: parseFloat(valorEntrada) || 0,
                        dataEntrada: dataEntrada || null,
                        parcelas: parseInt(parcelas) || 1,
                    }
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                const msg = errorData.detail || errorData.error || 'Falha no checkout';
                setErrorMessage(msg);
                throw new Error(msg);
            }

            setCheckoutStatus('success');
            setTimeout(() => {
                clearCart();
                onClose();
                setCheckoutStatus(null);
            }, 3000);
        } catch (err) {
            console.error(err);
            setCheckoutStatus('error');
            if (!errorMessage) setErrorMessage(err.message || 'Erro inesperado');
        } finally {
            setIsCheckingOut(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={onClose} />

            {/* Sidebar */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-700 z-[101] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <ShoppingCart className="text-sky-400" />
                        <h2 className="text-xl font-bold text-white">Meu Carrinho</h2>
                        <span className="bg-sky-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {totalItems}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                {/* Seleção de Unidade */}
                <div className="px-5 py-3 bg-slate-800/30 border-b border-slate-700 shrink-0">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                        Unidade Escamax Requisitante
                    </label>
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/50 outline-none transition-all ${
                            selectedBranch ? 'border-slate-700 text-white' : 'border-amber-500/60 text-slate-400'
                        }`}
                    >
                        <option value="" disabled>Escolha a unidade...</option>
                        {BRANCHES.map(branch => (
                            <option key={branch.id} value={branch.id} disabled={branch.disabled}>
                                {branch.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Scroll area: itens + detalhes do pedido */}
                <div className="flex-1 overflow-y-auto">

                    {/* Itens */}
                    <div className="p-5 space-y-3">
                        {cart.length === 0 ? (
                            <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-4">
                                <ShoppingCart size={48} className="opacity-20" />
                                <p className="text-sm">Seu carrinho está vazio.</p>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div key={item.codigo} className="glass-panel p-4 rounded-xl border border-slate-700/50 flex gap-3 group">
                                    <div className="w-14 h-14 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                        {item.url_imagem ? (
                                            <img src={item.url_imagem} alt={item.descricao} className="w-full h-full object-contain" />
                                        ) : (
                                            <ImageIcon size={18} className="text-slate-700" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className="text-xs font-bold text-white leading-tight" title={item.descricao}>{item.descricao}</h4>
                                            <button onClick={() => removeFromItem(item.codigo)} className="text-slate-500 hover:text-red-400 transition-colors shrink-0">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <p className="text-[10px] font-mono text-slate-500 mb-1.5">{item.codigo}</p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-green-400 font-bold text-sm">
                                                {item.mmBased ? `${formatarMoeda(item.preco)}/mm` : formatarMoeda(item.preco)}
                                            </span>
                                            {item.mmBased ? (
                                                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                                                    {item.quantity} mm
                                                </span>
                                            ) : (
                                                <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700">
                                                    <button onClick={() => updateQuantity(item.codigo, -1)} className="p-1 hover:text-sky-400 transition-colors"><Minus size={12} /></button>
                                                    <span className="w-7 text-center text-xs font-bold text-white">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.codigo, 1)} className="p-1 hover:text-sky-400 transition-colors"><Plus size={12} /></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* ── Detalhes do Pedido ─────────────────────────────────────── */}
                    {cart.length > 0 && (
                        <div className="px-5 pb-5 space-y-5 border-t border-slate-700/50 pt-4">

                            {/* Finalidade */}
                            <div>
                                <SectionHeader icon={Tag} label="Finalidade do Material" />
                                <RadioGroup
                                    options={[
                                        { value: 'Revenda', label: 'Revenda' },
                                        { value: 'Aplicação', label: 'Aplicação do Material' },
                                    ]}
                                    value={finalidade}
                                    onChange={setFinalidade}
                                    columns={2}
                                />
                            </div>

                            {/* Prioridade */}
                            <div>
                                <SectionHeader icon={Star} label="Prioridade" />
                                <RadioGroup
                                    options={PRIORIDADES}
                                    value={prioridade}
                                    onChange={setPrioridade}
                                    columns={3}
                                />
                            </div>

                            {/* Tipo de Frete */}
                            <div>
                                <SectionHeader icon={Truck} label="Tipo de Frete" />
                                <div className="grid grid-cols-1 gap-1.5">
                                    {TIPOS_FRETE.map(opt => {
                                        const active = tipoFrete === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setTipoFrete(opt.value)}
                                                className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-all flex items-center gap-2
                                                    ${active
                                                        ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                                                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                                                    }`}
                                            >
                                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${active ? 'border-sky-500' : 'border-slate-600'}`}>
                                                    {active && <span className="w-2 h-2 rounded-full bg-sky-400" />}
                                                </span>
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Campo condicional: Endereço de Entrega (CIF) */}
                                {tipoFrete === '0' && (
                                    <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label className="text-[10px] text-slate-500 block mb-1">Endereço de Entrega</label>
                                        <textarea
                                            value={enderecoEntrega}
                                            onChange={e => setEnderecoEntrega(e.target.value)}
                                            placeholder="Rua, número, bairro, cidade, estado, CEP..."
                                            rows={2}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500 transition-colors resize-none placeholder:text-slate-600"
                                        />
                                    </div>
                                )}

                                {/* Campos condicionais: Dados da Transportadora */}
                                {tipoFrete === '2' && (
                                    <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div>
                                            <label className="text-[10px] text-slate-500 block mb-1">Razão Social da Transportadora</label>
                                            <input
                                                type="text"
                                                value={transportadoraRazao}
                                                onChange={e => setTransportadoraRazao(e.target.value)}
                                                placeholder="Ex: Transportes ABC Ltda"
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500 transition-colors placeholder:text-slate-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 block mb-1">CNPJ da Transportadora</label>
                                            <input
                                                type="text"
                                                value={transportadoraCnpj}
                                                onChange={e => setTransportadoraCnpj(e.target.value)}
                                                placeholder="00.000.000/0000-00"
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500 transition-colors placeholder:text-slate-600"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Forma de Pagamento */}
                            <div>
                                <SectionHeader icon={CreditCard} label="Forma de Pagamento" />
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-slate-500 block mb-1">Valor da Entrada (R$)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0,00"
                                                value={valorEntrada}
                                                onChange={e => setValorEntrada(e.target.value)}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 block mb-1">Data da Entrada</label>
                                            <input
                                                type="date"
                                                min={today}
                                                value={dataEntrada}
                                                onChange={e => setDataEntrada(e.target.value)}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 block mb-1">Restante em quantas parcelas</label>
                                        <select
                                            value={parcelas}
                                            onChange={e => setParcelas(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500 transition-colors"
                                        >
                                            <option value="0">À vista (sem parcelamento)</option>
                                            {[...Array(11)].map((_, i) => (
                                                <option key={i + 2} value={i + 2}>{i + 2}x</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / Checkout */}
                {cart.length > 0 && (
                    <div className="p-5 bg-slate-800/80 border-t border-slate-700 space-y-3 shrink-0">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Total do Pedido</span>
                            <span className="text-2xl font-bold text-white">{formatarMoeda(totalPrice)}</span>
                        </div>

                        {checkoutStatus === 'success' ? (
                            <div className="bg-green-500/20 border border-green-500/50 text-green-400 p-4 rounded-xl flex items-center gap-3">
                                <CheckCircle size={20} />
                                <span className="text-sm font-bold">Requisição e Pedido criados no Omie!</span>
                            </div>
                        ) : checkoutStatus === 'error' ? (
                            <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-3">
                                <X size={20} className="flex-shrink-0" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold">Erro no Pedido</span>
                                    <span className="text-[11px] leading-tight opacity-90">{errorMessage}</span>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleCheckout}
                                disabled={
                                    isCheckingOut ||
                                    !selectedBranch ||
                                    (tipoFrete === '0' && !enderecoEntrega.trim()) ||
                                    (tipoFrete === '2' && (!transportadoraRazao.trim() || !transportadoraCnpj.trim()))
                                }
                                className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                {isCheckingOut ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Sincronizando B2B...
                                    </>
                                ) : (
                                    'FINALIZAR PEDIDO NO OMIE'
                                )}
                            </button>
                        )}
                        <p className="text-[10px] text-center text-slate-500">
                            Ao finalizar, uma Requisição de Compra será criada na filial <strong>{selectedBranch}</strong> e um Pedido de Venda na <strong>VerticalParts</strong>.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}
