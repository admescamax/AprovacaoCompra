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
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <PackageX size={28} className="text-amber-400" />
                        Peças Sem Estoque
                    </h2>
                    <p className="text-slate-400 mt-1">
                        {demandas.length === 0
                            ? 'Nenhuma demanda registrada.'
                            : `${demandas.length} produto${demandas.length > 1 ? 's' : ''} aguardando reposição.`}
                    </p>
                </div>
                {demandas.length > 0 && (
                    <button
                        onClick={limparTudo}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium"
                    >
                        <Trash2 size={15} />
                        Limpar lista
                    </button>
                )}
            </div>

            {/* Lista vazia */}
            {demandas.length === 0 && (
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-12 text-center">
                    <ClipboardList size={48} className="text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg font-medium">Lista vazia</p>
                    <p className="text-slate-600 text-sm mt-1">
                        Quando um produto sem estoque for solicitado, ele aparecerá aqui.
                    </p>
                </div>
            )}

            {/* Tabela de demandas */}
            {demandas.length > 0 && (
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/20 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-700/50 bg-slate-800/40">
                                <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Código</th>
                                <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Descrição</th>
                                <th className="text-center px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Qtd.</th>
                                <th className="text-right px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Data</th>
                                <th className="px-3 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {demandas.map((d, i) => (
                                <tr
                                    key={d.codigo}
                                    className={`border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-800/10'}`}
                                >
                                    <td className="px-5 py-3">
                                        <span className="font-mono text-amber-300 font-bold text-xs">{d.codigo}</span>
                                    </td>
                                    <td className="px-5 py-3 text-slate-300 text-xs max-w-[220px] truncate">
                                        {d.descricao || '—'}
                                    </td>
                                    <td className="px-5 py-3 text-center font-bold text-white">{d.quantidade}</td>
                                    <td className="px-5 py-3 text-right text-slate-500 text-xs">
                                        {d.data ? new Date(d.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <button
                                            onClick={() => remover(d.codigo)}
                                            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
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
