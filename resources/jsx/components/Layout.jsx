import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const userNav = [
    { to: '/', label: 'Dashboard', icon: 'fa-gauge-high' },
    { to: '/roster', label: 'Roster', icon: 'fa-users' },
    { to: '/gacha', label: 'Gacha', icon: 'fa-dice' },
    { to: '/collection', label: 'Koleksi', icon: 'fa-bookmark' },
    { to: '/lineup', label: 'Line-Up', icon: 'fa-chess-board' },
    { to: '/match', label: 'Match / PvP', icon: 'fa-trophy' },
    { to: '/history', label: 'Riwayat', icon: 'fa-clock-rotate-left' },
];

const adminNav = [
    { to: '/admin', label: 'Dashboard', icon: 'fa-gauge-high' },
    { to: '/admin/players', label: 'Players', icon: 'fa-users' },
    { to: '/admin/gacha', label: 'Gacha', icon: 'fa-dice' },
    { to: '/admin/users', label: 'Users', icon: 'fa-user-group' },
    { to: '/admin/matches', label: 'Matches', icon: 'fa-trophy' },
];

function Shell({ nav, children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const linkCls = ({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
            isActive
                ? 'bg-gradient-to-r from-midnight-600 to-midnight-400 text-white shadow-lg'
                : 'text-midnight-300 hover:bg-midnight-800 hover:text-midnight-100'
        }`;

    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-30 bg-midnight-950/85 backdrop-blur-xl border-b border-midnight-400/25 px-4 lg:px-8 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                    <Link to={user?.role === 'admin' ? '/admin' : '/'} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-midnight-700 via-midnight-500 to-midnight-300 p-[1.5px] shadow-lg">
                            <div className="w-full h-full bg-midnight-950 rounded-[10px] flex items-center justify-center">
                                <i className="fa-solid fa-futbol text-midnight-300"></i>
                            </div>
                        </div>
                        <div>
                            <h1 className="font-display text-lg font-black tracking-wider ff-gradient-text">
                                FOOTBALL-FUN
                            </h1>
                            <p className="text-[9px] text-midnight-300 tracking-[0.3em] uppercase font-semibold">
                                Midnight Edition
                            </p>
                        </div>
                    </Link>
                    <div className="flex items-center gap-2">
                        {user?.role !== 'admin' && (
                            <div className="coin-display px-4 py-2 rounded-xl flex items-center gap-2">
                                <i className="fa-solid fa-coins text-gold-400"></i>
                                <span className="font-display font-extrabold text-sm">
                                    {(user?.coins ?? 0).toLocaleString('id-ID')}
                                </span>
                            </div>
                        )}
                        <span className="hidden sm:block text-[11px] text-midnight-300 font-semibold">
                            {user?.team_name || user?.name}
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-midnight-800 border border-midnight-700 text-[9px] uppercase">
                                {user?.role}
                            </span>
                        </span>
                        <Link
                            to="/profile"
                            className="w-9 h-9 rounded-full bg-midnight-800 border border-midnight-400/40 flex items-center justify-center text-midnight-200 hover:border-midnight-300 transition"
                            title="Profile"
                        >
                            <i className="fa-solid fa-user text-sm"></i>
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="w-9 h-9 rounded-full bg-midnight-800 border border-midnight-700 flex items-center justify-center text-midnight-300 hover:text-red-400 transition"
                            title="Logout"
                        >
                            <i className="fa-solid fa-right-from-bracket text-sm"></i>
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-6 flex flex-col lg:flex-row gap-6 pb-16">
                <aside className="lg:w-56 shrink-0">
                    <nav className="flex lg:flex-col gap-1.5 overflow-x-auto pb-1 lg:sticky lg:top-24">
                        {nav.map((n) => (
                            <NavLink key={n.to} to={n.to} end={n.to === '/' || n.to === '/admin'} className={linkCls}>
                                <i className={`fa-solid ${n.icon} w-4 text-center`}></i>
                                <span className="whitespace-nowrap">{n.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </aside>
                <main className="flex-1 min-w-0">{children}</main>
            </div>
        </div>
    );
}

export function UserLayout({ children }) {
    return <Shell nav={userNav}>{children}</Shell>;
}

export function AdminLayout({ children }) {
    return <Shell nav={adminNav}>{children}</Shell>;
}
