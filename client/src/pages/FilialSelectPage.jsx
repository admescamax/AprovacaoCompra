import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, ArrowRight } from 'lucide-react';

const FILIAIS = [
    { id: 'BRASILIA',      label: 'Brasília',      estado: 'DF', descricao: 'Escamax Brasília' },
    { id: 'FLORIANOPOLIS', label: 'Florianópolis',  estado: 'SC', descricao: 'Escamax Florianópolis' },
    { id: 'PICARRAS',      label: 'Piçarras',       estado: 'SC', descricao: 'Escamax Piçarras' },
    { id: 'SALVADOR',      label: 'Salvador',       estado: 'BA', descricao: 'Escamax Salvador' },
    { id: 'SAOPAULO',      label: 'São Paulo',      estado: 'SP', descricao: 'Escamax São Paulo' },
];

export default function FilialSelectPage() {
    const { selectFilial, filial: filialAtual } = useAuth();
    const navigate = useNavigate();

    const handleSelect = (filial) => {
        selectFilial(filial);
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">

            {/* Logo + título */}
            <div className="mb-10 flex flex-col items-center gap-3">
                <img src="/logo-white.png" alt="VerticalParts" className="h-9 object-contain" />
                <div className="text-center">
                    <p className="vp-eyebrow">Portal B2B Escamax</p>
                    <h1 className="mt-1 font-display text-2xl text-white">
                        {filialAtual ? 'Trocar de filial' : 'Selecione sua filial'}
                    </h1>
                    <p className="mt-1 text-sm text-neutral-500">
                        Sua seleção define qual conta Omie receberá o pedido de compra.
                    </p>
                </div>
            </div>

            {/* Cards de filial */}
            <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                {FILIAIS.map((f) => {
                    const ativa = filialAtual?.id === f.id;
                    return (
                        <button
                            key={f.id}
                            onClick={() => handleSelect(f)}
                            className={`group relative flex items-center gap-4 rounded-xl border px-5 py-4 text-left transition-all
                                ${ativa
                                    ? 'border-primary bg-primary/10'
                                    : 'border-surface-border bg-surface-card hover:border-primary hover:bg-primary/5'
                                }`}
                        >
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
                                ${ativa ? 'bg-primary text-black' : 'bg-surface text-primary'}`}>
                                <MapPin className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className={`text-sm font-bold truncate ${ativa ? 'text-primary' : 'text-white group-hover:text-primary'} transition-colors`}>
                                    {f.label}
                                </p>
                                <p className="text-[11px] text-neutral-500">{f.descricao}</p>
                            </div>
                            <div className={`shrink-0 transition-opacity ${ativa ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                {ativa
                                    ? <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Ativa</span>
                                    : <ArrowRight className="h-4 w-4 text-primary" />
                                }
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Link para voltar se já tem filial */}
            {filialAtual && (
                <button
                    onClick={() => navigate(-1)}
                    className="mt-6 text-xs text-neutral-500 hover:text-white transition-colors"
                >
                    ← Voltar sem alterar
                </button>
            )}
        </div>
    );
}
