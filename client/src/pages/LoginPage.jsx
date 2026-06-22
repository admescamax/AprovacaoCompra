import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, KeyRound, ArrowRight, AlertCircle, Check, Loader2 } from 'lucide-react';

const FEATURES = [
    'Catálogo de peças e estoque em tempo real',
    'Requisição de compra integrada ao Omie',
    'Histórico e acompanhamento de pedidos',
];

export default function LoginPage() {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, verifyCode } = useAuth();
    const navigate = useNavigate();

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email);
            setStep(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCodeSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await verifyCode(email, code);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[1fr_1.05fr]">

            {/* ── Painel esquerdo — marca ─────────────────────────── */}
            <div
                className="relative hidden flex-col justify-between overflow-hidden bg-surface p-8 text-white lg:flex lg:p-14"
                style={{ background: 'radial-gradient(circle at 30% 20%, #1c1c1c, #000 65%)' }}
            >
                {/* Grade sutil dourada */}
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(245,196,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(245,196,0,0.05) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                        maskImage: 'radial-gradient(circle at 30% 30%, #000 40%, transparent 80%)',
                    }}
                />
                {/* Círculo decorativo */}
                <div className="pointer-events-none absolute right-[-120px] top-1/2 h-[360px] w-[360px] -translate-y-1/2 rounded-full border-2 border-primary/20" />

                <div className="relative z-10">
                    <img src="/logo-white.png" alt="VerticalParts" className="h-9 object-contain" />
                </div>

                <div className="relative z-10">
                    <span className="vp-eyebrow !text-primary">Acesso corporativo</span>
                    <h1 className="mt-4 font-display text-3xl leading-[1.1] md:text-4xl lg:text-[44px]">
                        Portal de compras<br />da <span className="text-primary">Escamax.</span>
                    </h1>
                    <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
                        Consulte estoque, monte requisições e acompanhe pedidos junto à VerticalParts em um só lugar.
                    </p>

                    <ul className="mt-8 flex flex-col gap-3.5">
                        {FEATURES.map((f) => (
                            <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                                <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={3} />
                                {f}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="relative z-10 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                    © {new Date().getFullYear()} VerticalParts · Escamax
                </div>
            </div>

            {/* ── Painel direito — formulário ─────────────────────── */}
            <div className="flex items-center justify-center bg-white p-8 lg:p-14">
                <div className="w-full max-w-[440px]">
                    {/* Logo no topo (mobile/branco) */}
                    <img src="/logo-color.png" alt="VerticalParts" className="mb-8 h-8 object-contain lg:hidden" />

                    <div className="mb-8">
                        <span className="vp-eyebrow">Portal Escamax</span>
                        <h2 className="mt-3 font-display text-3xl leading-tight text-black">
                            {step === 1 ? 'Entrar na plataforma' : 'Verificar acesso'}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                            {step === 1
                                ? 'Use seu e-mail corporativo autorizado para receber o código de acesso.'
                                : <>Enviamos um código de 6 dígitos para <strong className="text-black">{email}</strong>.</>}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 flex items-start gap-2.5 rounded border-l-[3px] border-red-600 bg-red-50 p-3.5 text-sm text-red-700">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {step === 1 ? (
                        <form onSubmit={handleEmailSubmit}>
                            <div className="mb-4">
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-700">E-mail</label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                                        <Mail className="h-4 w-4" />
                                    </span>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                        required
                                        placeholder="adm@escamax.com.br"
                                        className="w-full rounded border border-neutral-200 bg-white py-3.5 pl-11 pr-3.5 text-sm text-black outline-none transition focus:border-primary focus:ring-[3px] focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded bg-primary px-6 text-sm font-bold text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-primary-light hover:shadow-brand active:translate-y-0 active:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 disabled:!translate-y-0"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Solicitar Acesso
                                {!loading && <ArrowRight className="h-4 w-4" />}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleCodeSubmit}>
                            <div className="mb-4">
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-700">Código de 6 dígitos</label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                                        <KeyRound className="h-4 w-4" />
                                    </span>
                                    <input
                                        type="text"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        inputMode="numeric"
                                        maxLength="6"
                                        required
                                        placeholder="000000"
                                        className="w-full rounded border border-neutral-200 bg-white py-3.5 pl-11 pr-3.5 text-center text-2xl font-bold tracking-[0.4em] text-black outline-none transition focus:border-primary focus:ring-[3px] focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded bg-primary px-6 text-sm font-bold text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-primary-light hover:shadow-brand active:translate-y-0 active:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 disabled:!translate-y-0"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Validar Token
                                {!loading && <ArrowRight className="h-4 w-4" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setStep(1); setError(''); }}
                                className="mt-6 w-full text-center text-[13px] font-semibold text-neutral-600 transition-colors hover:text-black"
                            >
                                ← Usar outro e-mail
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
