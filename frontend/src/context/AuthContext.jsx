/**
 * AuthContext — JWT-based authentication state management.
 * Stores token in localStorage, exposes login/logout/register helpers.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('ft_token'));
    const [loading, setLoading] = useState(true);

    // On mount, if token exists, decode user info from it
    useEffect(() => {
        if (token) {
            try {
                // JWT payload is base64-encoded in the second segment
                const payload = JSON.parse(atob(token.split('.')[1]));
                const storedUser = JSON.parse(localStorage.getItem('ft_user') || 'null');
                if (payload.exp * 1000 > Date.now() && storedUser) {
                    setUser(storedUser);
                } else {
                    // Token expired
                    logout();
                }
            } catch {
                logout();
            }
        }
        setLoading(false);
    }, []);

    const saveAuth = useCallback((tokenValue, userData) => {
        localStorage.setItem('ft_token', tokenValue);
        localStorage.setItem('ft_user', JSON.stringify(userData));
        setToken(tokenValue);
        setUser(userData);
    }, []);

    const login = useCallback(async (email, password) => {
        const res = await api.post('/api/auth/login', { email, password });
        saveAuth(res.data.token, res.data.user);
        return res.data;
    }, [saveAuth]);

    const register = useCallback(async (name, email, password) => {
        const res = await api.post('/api/auth/register', { name, email, password });
        saveAuth(res.data.token, res.data.user);
        return res.data;
    }, [saveAuth]);

    const logout = useCallback(() => {
        localStorage.removeItem('ft_token');
        localStorage.removeItem('ft_user');
        setToken(null);
        setUser(null);
    }, []);

    const value = {
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
