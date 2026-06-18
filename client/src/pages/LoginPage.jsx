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
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/30 blur-[120px]"></div>
            </div>

            <div className="glass-panel p-8 rounded-2xl w-full max-w-md z-10 mx-4">
                <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                    Portal Escamax
                </h2>
                <p className="text-slate-400 text-center mb-8">Acesso Exclusivo Administrativo</p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-3 rounded-lg mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">E-mail</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                                placeholder="adm@escamax.com.br"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-accent hover:bg-sky-500 text-slate-900 font-bold py-2 rounded-lg transition-all shadow-lg shadow-accent/20"
                        >
                            Solicitar Acesso
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleCodeSubmit} className="space-y-4">
                        <div className="text-center mb-4">
                            <p className="text-sm text-slate-400">Código enviado para</p>
                            <p className="text-white font-medium">{email}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Código de 6 dígitos</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                                placeholder="000000"
                                maxLength="6"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-accent hover:bg-sky-500 text-slate-900 font-bold py-2 rounded-lg transition-all shadow-lg shadow-accent/20"
                        >
                            Validar Token
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="w-full text-slate-400 text-sm hover:text-white transition-colors"
                        >
                            Voltar
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
