import React, { useState, useEffect } from 'react';
import { Search, Package, LogOut, BarChart2, PackageX } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import vpLogo from '../assets/vp-logo.png';

function contarDemandas() {
    try { return JSON.parse(localStorage.getItem('escamax_demandas') || '[]').length; }
    catch { return 0; }
}

export default function Sidebar({ logout }) {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;
    const [totalDemandas, setTotalDemandas] = useState(contarDemandas);

    useEffect(() => {
        const handler = () => setTotalDemandas(contarDemandas());
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    return (
        <aside className="w-60 bg-white border-r border-[var(--vp-border)] flex flex-col z-20">
            <div className="px-5 py-4 border-b border-[var(--vp-border)] flex items-center bg-[var(--vp-bg-soft)]">
                <img src={vpLogo} alt="VerticalParts" className="w-full max-h-11 object-contain" />
            </div>

            <nav className="flex-1 p-3 space-y-1">
                <NavItem to="/" icon={<Search size={16} />} label="Consultar Peças" active={isActive('/')} />
                <NavItem to="/history" icon={<Package size={16} />} label="Histórico de Pedidos" active={isActive('/history')} />
                <NavItem
                    to="/sem-estoque"
                    icon={<PackageX size={16} />}
                    label="Peças Sem Estoque"
                    active={isActive('/sem-estoque')}
                    badge={totalDemandas > 0 ? totalDemandas : null}
                />
                <NavItem to="/dashboard" icon={<BarChart2 size={16} />} label="Dashboard" active={isActive('/dashboard')} />
            </nav>

            <div className="p-3 border-t border-[var(--vp-border)]">
                <button
                    onClick={logout}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-sm text-[var(--vp-text-label)] hover:text-[var(--vp-danger)] hover:bg-red-50 transition-colors"
                >
                    <LogOut size={16} />
                    <span className="text-[11px] font-black uppercase tracking-widest">Sair</span>
                </button>
            </div>
        </aside>
    );
}

function NavItem({ to, icon, label, active, badge }) {
    return (
        <Link
            to={to}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-sm border transition-colors ${active
                ? 'bg-[var(--vp-primary)]/10 text-[var(--vp-primary)] border-[var(--vp-primary)]/30'
                : 'text-[var(--vp-text-label)] border-transparent hover:text-[var(--vp-text)] hover:bg-gray-50'
                }`}
        >
            {icon}
            <span className="text-[11px] font-black uppercase tracking-widest flex-1">{label}</span>
            {badge != null && (
                <span className="bg-[var(--vp-warning)] text-white text-[10px] font-black px-1.5 py-0.5 rounded-sm leading-none">
                    {badge}
                </span>
            )}
        </Link>
    );
}
