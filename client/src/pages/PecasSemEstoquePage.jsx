import React, { useState, useEffect } from 'react';
import { Trash2, PackageX, ClipboardList } from 'lucide-react';

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
        <div className="max-w-3xl mx-auto space-y-5">
            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="font-display text-2xl text-black flex items-center gap-2">
                        <PackageX size={22} className="text-amber-500" />
                        Peças Sem Estoque
                    </h2>
                    <p className="text-sm text-neutral-500 mt-0.5">
                        {demandas.length === 0
                            ? 'Nenhuma demanda registrada.'
                            : `${demandas.length} produto${demandas.length > 1 ? 's' : ''} aguardando reposição.`}
                    </p>
                </div>
                {demandas.length > 0 && (
                    <button
                        onClick={limparTudo}
                        className="flex items-center gap-2 px-3 py-2 rounded bg-red-50 border border-red-200 text-danger hover:bg-red-100 transition-colors text-xs font-bold uppercase tracking-[0.08em]"
                    >
                        <Trash2 size={14} />
                        Limpar lista
                    </button>
                )}
            </div>

            {/* Lista vazia */}
            {demandas.length === 0 && (
                <div className="rounded-xl border border-neutral-200 bg-white shadow-card p-12 text-center">
                    <ClipboardList size={48} className="text-neutral-300 mx-auto mb-4" />
                    <p className="font-display text-xl text-black">Lista vazia</p>
                    <p className="text-neutral-400 text-sm mt-1">
                        Quando um produto sem estoque for solicitado, ele aparecerá aqui.
                    </p>
                </div>
            )}

            {/* Tabela de demandas */}
            {demandas.length > 0 && (
                <div className="rounded-xl border border-neutral-200 bg-white shadow-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-neutral-200 bg-neutral-50">
                                <th className="text-left px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-[0.1em]">Código</th>
                                <th className="text-left px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-[0.1em]">Descrição</th>
                                <th className="text-center px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-[0.1em]">Qtd.</th>
                                <th className="text-right px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-[0.1em]">Data</th>
                                <th className="px-3 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {demandas.map((d) => (
                                <tr
                                    key={d.codigo}
                                    className="border-b border-neutral-200 hover:bg-neutral-50 transition-colors"
                                >
                                    <td className="px-5 py-3">
                                        <span className="font-mono text-amber-700 font-bold text-xs">{d.codigo}</span>
                                    </td>
                                    <td className="px-5 py-3 text-neutral-600 text-xs max-w-[220px] truncate">
                                        {d.descricao || '—'}
                                    </td>
                                    <td className="px-5 py-3 text-center font-bold text-black">{d.quantidade}</td>
                                    <td className="px-5 py-3 text-right text-neutral-400 text-xs">
                                        {d.data ? new Date(d.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <button
                                            onClick={() => remover(d.codigo)}
                                            className="p-1.5 rounded text-neutral-400 hover:text-danger hover:bg-red-50 transition-colors"
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
