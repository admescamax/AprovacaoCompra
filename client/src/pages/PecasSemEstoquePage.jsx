import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, PackageX, ClipboardList } from 'lucide-react';

function lerDemandas() {
    try { return JSON.parse(localStorage.getItem('escamax_demandas') || '[]'); }
    catch { return []; }
}

export default function PecasSemEstoquePage() {
    const [demandas, setDemandas] = useState(lerDemandas);

    useEffect(() => {
        const handler = () => setDemandas(lerDemandas());
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const remover = (codigo) => {
        const novas = demandas.filter(d => d.codigo !== codigo);
        localStorage.setItem('escamax_demandas', JSON.stringify(novas));
        window.dispatchEvent(new Event('storage'));
        setDemandas(novas);
    };

    const limparTudo = () => {
        localStorage.removeItem('escamax_demandas');
        window.dispatchEvent(new Event('storage'));
        setDemandas([]);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-sm font-black text-black uppercase tracking-tight flex items-center gap-2">
                        <PackageX size={18} className="text-[var(--vp-warning)]" />
                        Peças Sem Estoque
                    </h2>
                    <p className="text-[10px] font-black text-[var(--vp-text-label)] uppercase tracking-widest mt-1">
                        {demandas.length === 0
                            ? 'Nenhuma demanda registrada.'
                            : `${demandas.length} produto${demandas.length > 1 ? 's' : ''} aguardando reposição.`}
                    </p>
                </div>
                {demandas.length > 0 && (
                    <button
                        onClick={limparTudo}
                        className="flex items-center gap-2 px-3 py-2 rounded-sm bg-red-50 border border-red-200 text-[var(--vp-danger)] hover:bg-red-100 transition-colors text-[10px] font-black uppercase tracking-widest"
                    >
                        <Trash2 size={14} />
                        Limpar lista
                    </button>
                )}
            </div>

            {/* Lista vazia */}
            {demandas.length === 0 && (
                <div className="vp-panel p-12 text-center">
                    <ClipboardList size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-black text-sm font-black uppercase tracking-tight">Lista vazia</p>
                    <p className="text-gray-400 text-[10px] font-bold mt-1">
                        Quando um produto sem estoque for solicitado, ele aparecerá aqui.
                    </p>
                </div>
            )}

            {/* Tabela de demandas */}
            {demandas.length > 0 && (
                <div className="vp-panel overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--vp-border)] bg-[var(--vp-bg-soft)]">
                                <th className="text-left px-5 py-3 text-[10px] font-black text-[var(--vp-text-label)] uppercase tracking-widest">Código</th>
                                <th className="text-left px-5 py-3 text-[10px] font-black text-[var(--vp-text-label)] uppercase tracking-widest">Descrição</th>
                                <th className="text-center px-5 py-3 text-[10px] font-black text-[var(--vp-text-label)] uppercase tracking-widest">Qtd.</th>
                                <th className="text-right px-5 py-3 text-[10px] font-black text-[var(--vp-text-label)] uppercase tracking-widest">Data</th>
                                <th className="px-3 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {demandas.map((d) => (
                                <tr
                                    key={d.codigo}
                                    className="border-b border-[var(--vp-border)] hover:bg-gray-50 transition-colors"
                                >
                                    <td className="px-5 py-3">
                                        <span className="font-mono text-[var(--vp-warning)] font-black text-xs">{d.codigo}</span>
                                    </td>
                                    <td className="px-5 py-3 text-gray-600 font-bold text-xs max-w-[220px] truncate">
                                        {d.descricao || '—'}
                                    </td>
                                    <td className="px-5 py-3 text-center font-black text-black">{d.quantidade}</td>
                                    <td className="px-5 py-3 text-right text-gray-400 font-bold text-xs">
                                        {d.data ? new Date(d.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <button
                                            onClick={() => remover(d.codigo)}
                                            className="p-1.5 rounded-sm text-gray-400 hover:text-[var(--vp-danger)] hover:bg-red-50 transition-colors"
                                            title="Remover da lista"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
