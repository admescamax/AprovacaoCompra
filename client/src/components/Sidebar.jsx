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
        <aside className="w-64 glass-panel border-r border-slate-700/50 flex flex-col z-20">
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center">
                <img src={vpLogo} alt="VerticalParts" className="w-full max-h-12 object-contain" />
            </div>

            <nav className="flex-1 p-4 space-y-2">
                <NavItem to="/" icon={<Search size={20} />} label="Consultar Peças" active={isActive('/')} />
                <NavItem to="/history" icon={<Package size={20} />} label="Histórico de Pedidos" active={isActive('/history')} />
                <NavItem
                    to="/sem-estoque"
                    icon={<PackageX size={20} />}
                    label="Peças Sem Estoque"
                    active={isActive('/sem-estoque')}
                    badge={totalDemandas > 0 ? totalDemandas : null}
                />
                <NavItem to="/dashboard" icon={<BarChart2 size={20} />} label="Dashboard" active={isActive('/dashboard')} />
            </nav>

            <div className="p-4 border-t border-slate-700/50">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Sair</span>
                </button>
            </div>
        </aside>
    );
}

function NavItem({ to, icon, label, active, badge }) {
    return (
        <Link
            to={to}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active
                ? 'bg-accent/10 text-accent border border-accent/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
        >
            {icon}
            <span className="font-medium flex-1">{label}</span>
            {badge != null && (
                <span className="bg-amber-500 text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                    {badge}
                </span>
            )}
        </Link>
    );
}
