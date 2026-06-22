import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SearchPage from './pages/SearchPage';
import HistoryPage from './pages/HistoryPage';
import DashboardPage from './pages/DashboardPage';
import PecasSemEstoquePage from './pages/PecasSemEstoquePage';
import Sidebar from './components/Sidebar';

const PAGE_TITLES = {
    '/': 'Consultar Peças',
    '/history': 'Histórico de Pedidos',
    '/sem-estoque': 'Peças Sem Estoque',
    '/dashboard': 'Dashboard',
};

function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}

function Layout({ children }) {
    const { logout } = useAuth();
    const location = useLocation();
    const title = PAGE_TITLES[location.pathname] || 'Portal Escamax';
    return (
        <div className="flex h-screen overflow-hidden bg-white text-black">
            <Sidebar logout={logout} />
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Topbar branca */}
                <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-6">
                    <h1 className="text-sm font-semibold text-black">{title}</h1>
                    <span className="vp-eyebrow">Portal B2B Escamax</span>
                </header>
                <main className="flex-1 overflow-y-auto bg-neutral-50 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <SearchPage />
                        </Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/history"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <HistoryPage />
                        </Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <DashboardPage />
                        </Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/sem-estoque"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <PecasSemEstoquePage />
                        </Layout>
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}
