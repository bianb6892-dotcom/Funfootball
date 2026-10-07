import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { UserLayout, AdminLayout } from './components/Layout';
import { RequireAuth, RequireRole, GuestOnly } from './components/Guards';
import { Login, Register } from './pages/auth';
import { Dashboard } from './pages/user/Dashboard';
import { Roster } from './pages/user/Roster';
import { Gacha } from './pages/user/Gacha';
import { Collection } from './pages/user/Collection';
import { Lineup } from './pages/user/Lineup';
import { Match } from './pages/user/Match';
import { History } from './pages/user/History';
import { Profile } from './pages/user/Profile';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminPlayers } from './pages/admin/Players';
import { AdminGacha } from './pages/admin/Gacha';
import { AdminUsers } from './pages/admin/Users';
import { AdminMatches } from './pages/admin/Matches';

const userRoutes = [
    { path: '/', el: <Dashboard /> },
    { path: '/roster', el: <Roster /> },
    { path: '/gacha', el: <Gacha /> },
    { path: '/collection', el: <Collection /> },
    { path: '/lineup', el: <Lineup /> },
    { path: '/match', el: <Match /> },
    { path: '/history', el: <History /> },
    { path: '/profile', el: <Profile /> },
];

const adminRoutes = [
    { path: '/admin', el: <AdminDashboard /> },
    { path: '/admin/players', el: <AdminPlayers /> },
    { path: '/admin/gacha', el: <AdminGacha /> },
    { path: '/admin/users', el: <AdminUsers /> },
    { path: '/admin/matches', el: <AdminMatches /> },
    { path: '/profile', el: <Profile /> },
];

export default function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
                        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

                        {userRoutes.map((r) => (
                            <Route
                                key={r.path}
                                path={r.path}
                                element={
                                    <RequireRole role="user">
                                        <UserLayout>{r.el}</UserLayout>
                                    </RequireRole>
                                }
                            />
                        ))}

                        {adminRoutes.map((r) => (
                            <Route
                                key={r.path}
                                path={r.path}
                                element={
                                    <RequireRole role="admin">
                                        <AdminLayout>{r.el}</AdminLayout>
                                    </RequireRole>
                                }
                            />
                        ))}

                        <Route
                            path="*"
                            element={
                                <RequireAuth>
                                    <RoleRedirect />
                                </RequireAuth>
                            }
                        />
                    </Routes>
                </BrowserRouter>
            </ToastProvider>
        </AuthProvider>
    );
}

function RoleRedirect() {
    const { user } = useAuth();
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/'} replace />;
}
