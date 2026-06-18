import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // In a real app, we would validate the token here
            setUser({ email: 'adm@escamax.com.br' });
            setIsAuthenticated(true);
        }
        setLoading(false);
    }, []);

    const login = async (email) => {
        if (email !== 'adm@escamax.com.br') {
            throw new Error('Acesso não autorizado para este e-mail.');
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao solicitar código');
            }

            return true;
        } catch (error) {
            console.error("Login Request Error:", error);
            throw error;
        }
    };

    const verifyCode = async (email, code) => {
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Código inválido');
            }

            localStorage.setItem('token', data.token);
            setUser(data.user);
            setIsAuthenticated(true);
            return true;
        } catch (error) {
            console.error("Auth Error:", error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
    };

    const value = {
        user,
        isAuthenticated,
        login,
        verifyCode,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
