import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequireAuth({ children }) {
    const { user, loading } = useAuth();
    if (loading)
        return <div className="min-h-screen flex items-center justify-center text-midnight-300">Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

export function RequireRole({ role, children }) {
    const { user, loading } = useAuth();
    if (loading)
        return <div className="min-h-screen flex items-center justify-center text-midnight-300">Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
    return children;
}

export function GuestOnly({ children }) {
    const { user, loading } = useAuth();
    if (loading)
        return <div className="min-h-screen flex items-center justify-center text-midnight-300">Loading...</div>;
    if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
    return children;
}
