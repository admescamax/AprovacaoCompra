import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const { login, verifyCode } = useAuth();
    const navigate = useNavigate();

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(email);
            setStep(2);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleCodeSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await verifyCode(email, code);
            navigate('/');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--vp-bg)] relative overflow-hidden px-4">
            <div className="vp-panel p-8 w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="text-sm font-black text-center text-black uppercase tracking-tight mb-1">
                    Portal Escamax
                </h2>
                <p className="text-[10px] font-black text-[var(--vp-text-label)] text-center uppercase tracking-widest mb-8">
                    Acesso Exclusivo Administrativo
                </p>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-[var(--vp-danger)] p-3 rounded-sm mb-4 text-xs font-black text-center">
                        {error}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-[var(--vp-text-label)] uppercase tracking-widest leading-none">E-mail</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white border border-[var(--vp-border)] rounded-sm px-3 py-2 text-xs font-black text-black focus:outline-none focus:ring-1 focus:ring-[var(--vp-primary)] focus:border-[var(--vp-primary)] transition-all"
                                placeholder="adm@escamax.com.br"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-[var(--vp-primary)] hover:bg-[var(--vp-primary-dark)] text-white text-xs font-black uppercase tracking-widest py-2.5 rounded-sm transition-colors"
                        >
                            Solicitar Acesso
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleCodeSubmit} className="space-y-4">
                        <div className="text-center mb-4">
                            <p className="text-[10px] font-black text-[var(--vp-text-label)] uppercase tracking-widest">Código enviado para</p>
                            <p className="text-black font-black text-xs mt-1">{email}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-[var(--vp-text-label)] uppercase tracking-widest leading-none">Código de 6 dígitos</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full bg-white border border-[var(--vp-border)] rounded-sm px-4 py-2 text-black text-center text-2xl font-black tracking-widest focus:outline-none focus:ring-1 focus:ring-[var(--vp-primary)] focus:border-[var(--vp-primary)] transition-all"
                                placeholder="000000"
                                maxLength="6"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-[var(--vp-primary)] hover:bg-[var(--vp-primary-dark)] text-white text-xs font-black uppercase tracking-widest py-2.5 rounded-sm transition-colors"
                        >
                            Validar Token
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="w-full text-[var(--vp-text-label)] text-[10px] font-black uppercase tracking-widest hover:text-black transition-colors"
                        >
                            Voltar
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
