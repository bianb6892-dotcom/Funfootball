import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('ff_user')) || null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!localStorage.getItem('ff_token')) {
            setLoading(false);
            return;
        }
        try {
            const { data } = await api.me();
            setUser(data);
            localStorage.setItem('ff_user', JSON.stringify(data));
        } catch {
            localStorage.removeItem('ff_token');
            localStorage.removeItem('ff_user');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const login = async (payload) => {
        const { data } = await api.login(payload);
        localStorage.setItem('ff_token', data.token);
        localStorage.setItem('ff_user', JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    };

    const register = async (payload) => {
        const { data } = await api.register(payload);
        localStorage.setItem('ff_token', data.token);
        localStorage.setItem('ff_user', JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    };

    const logout = async () => {
        try {
            await api.logout();
        } catch {
            /* token invalid — tetap logout lokal */
        }
        localStorage.removeItem('ff_token');
        localStorage.removeItem('ff_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
