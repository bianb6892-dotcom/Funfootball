import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const userNav = [
    { to: '/', label: 'Dashboard', icon: 'fa-gauge-high' },
    { to: '/roster', label: 'Roster', icon: 'fa-users' },
    { to: '/gacha', label: 'Gacha', icon: 'fa-dice' },
    { to: '/collection', label: 'Koleksi', icon: 'fa-bookmark' },
    { to: '/lineup', label: 'Line-Up', icon: 'fa-chess-board' },
    { to: '/match', label: 'Match / PvP', icon: 'fa-trophy' },
    { to: '/fun-match', label: 'Fun Match', icon: 'fa-gamepad' },
    { to: '/events', label: 'Event', icon: 'fa-calendar-days' },
    { to: '/history', label: 'Riwayat', icon: 'fa-clock-rotate-left' },
    { to: '/mail', label: 'Mail', icon: 'fa-envelope', badgeKey: 'mail' },
];

const adminNav = [
    { to: '/admin', label: 'Dashboard', icon: 'fa-gauge-high' },
    { to: '/admin/players', label: 'Players', icon: 'fa-users' },
    { to: '/admin/gacha', label: 'Gacha', icon: 'fa-dice' },
    { to: '/admin/users', label: 'Users', icon: 'fa-user-group' },
    { to: '/admin/matches', label: 'Matches', icon: 'fa-trophy' },
    { to: '/admin/fun-teams', label: 'Fun Teams', icon: 'fa-gamepad' },
    { to: '/admin/events', label: 'Events', icon: 'fa-calendar-days' },
    { to: '/admin/mail', label: 'Mail', icon: 'fa-envelope' },
];

function Shell({ nav, children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [unreadMail, setUnreadMail] = useState(0);
    // Sidebar bisa di-hide agar konten (termasuk card pemain) lebih lega.
    // Ukuran card sendiri tidak diubah — hanya ruang tampilnya yang meluas.
    const [sideOpen, setSideOpen] = useState(() => {
        try {
            return localStorage.getItem('ff_sidebar') !== '0';
        } catch {
            return true;
        }
    });
    // Mode collapsed (menyusut menjadi rel ikon) — hanya berlaku di desktop.
    // Di mobile sidebar selalu tampil sebagai drawer penuh.
    const [mini, setMini] = useState(() => {
        try {
            return localStorage.getItem('ff_sidebar_mini') === '1';
        } catch {
            return false;
        }
    });

    const toggleSidebar = () => {
        setSideOpen((v) => {
            try {
                localStorage.setItem('ff_sidebar', v ? '0' : '1');
            } catch { /* abaikan */ }
            return !v;
        });
    };

    const toggleMini = () => {
        setMini((v) => {
            try {
                localStorage.setItem('ff_sidebar_mini', v ? '0' : '1');
            } catch { /* abaikan */ }
            return !v;
        });
    };

    const closeSidebar = () => {
        setSideOpen(false);
        try {
            localStorage.setItem('ff_sidebar', '0');
        } catch { /* abaikan */ }
    };

    // Badge jumlah mail belum dibaca (hanya untuk user biasa).
    useEffect(() => {
        if (user?.role !== 'user') return;
        let alive = true;
        const fetchUnread = () => {
            api.mailsUnread().then(({ data }) => {
                if (alive) setUnreadMail(data.unread || 0);
            }).catch(() => {});
        };
        fetchUnread();
        const t = setInterval(fetchUnread, 60000);
        return () => { alive = false; clearInterval(t); };
    }, [user?.role]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Link navigasi: ikon dalam kotak berukuran konsisten, menu aktif memakai
    // aksen biru (bar kiri + latar biru) yang jelas namun tidak berlebihan.
    // Kelas ff-side-item menandai item untuk sistem collapse + tooltip sidebar.
    const linkCls = ({ isActive }) =>
        `ff-nav-link ff-side-item group relative flex items-center gap-3 pl-3 pr-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-950 ${
            isActive
                ? 'bg-midnight-600/25 text-white shadow-[inset_0_1px_0_rgba(124,140,255,0.15)]'
                : 'text-midnight-300 hover:bg-midnight-800/80 hover:text-midnight-100'
        }`;

    // Inisial avatar dari nama tim / nama user.
    const profileInitial = ((user?.team_name || user?.name || 'F').trim()[0] || 'F').toUpperCase();

    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-30 bg-midnight-950/85 backdrop-blur-xl border-b border-midnight-400/25">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3 px-4 lg:px-8 h-16">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <button
                            onClick={toggleSidebar}
                            title={sideOpen ? 'Sembunyikan menu' : 'Tampilkan menu'}
                            aria-label={sideOpen ? 'Sembunyikan menu navigasi' : 'Tampilkan menu navigasi'}
                            aria-expanded={sideOpen}
                            className="w-10 h-10 rounded-xl bg-midnight-800 border border-midnight-700 flex items-center justify-center text-midnight-300 hover:text-white hover:border-midnight-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-400/70 transition shrink-0"
                        >
                            <i className={`fa-solid ${sideOpen ? 'fa-eye-slash' : 'fa-bars'} text-sm w-4 text-center`}></i>
                        </button>
                        <Link to={user?.role === 'admin' ? '/admin' : '/'} className="flex items-center gap-2.5 sm:gap-3 min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-400/70">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-midnight-700 via-midnight-500 to-midnight-300 p-[1.5px] shadow-lg shrink-0">
                            <div className="w-full h-full bg-midnight-950 rounded-[10px] flex items-center justify-center">
                                <i className="fa-solid fa-futbol text-midnight-300"></i>
                            </div>
                        </div>
                        <div className="min-w-0">
                            <h1 className="font-display text-base sm:text-lg font-black tracking-wider ff-gradient-text leading-tight truncate">
                                FOOTBALL-FUN
                            </h1>
                            <p className="text-[9px] text-midnight-300 tracking-[0.3em] uppercase font-semibold leading-tight">
                                Midnight Edition
                            </p>
                        </div>
                    </Link>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {user?.role !== 'admin' && (
                            <>
                                <div className="coin-display px-2.5 sm:px-4 py-2 rounded-xl flex items-center gap-1.5 sm:gap-2" title="Token event (untuk masuk challenge)">
                                    <i className="fa-solid fa-ticket text-sky-400 w-4 text-center"></i>
                                    <span className="font-display font-extrabold text-sm tabular-nums">
                                        {(user?.event_tokens ?? 0).toLocaleString('id-ID')}
                                    </span>
                                </div>
                                <div className="coin-display px-2.5 sm:px-4 py-2 rounded-xl flex items-center gap-1.5 sm:gap-2" title="Koin">
                                    <i className="fa-solid fa-coins text-gold-400 w-4 text-center"></i>
                                    <span className="font-display font-extrabold text-sm tabular-nums">
                                        {(user?.coins ?? 0).toLocaleString('id-ID')}
                                    </span>
                                </div>
                            </>
                        )}
                        <span className="hidden md:flex items-center text-[11px] text-midnight-300 font-semibold min-w-0">
                            <span className="truncate max-w-[140px]">{user?.team_name || user?.name}</span>
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-midnight-800 border border-midnight-700 text-[9px] uppercase shrink-0">
                                {user?.role}
                            </span>
                        </span>
                        <Link
                            to="/profile"
                            aria-label="Profil"
                            className="w-10 h-10 rounded-full bg-midnight-800 border border-midnight-400/40 flex items-center justify-center text-midnight-200 hover:border-midnight-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-400/70 transition shrink-0"
                            title="Profile"
                        >
                            <i className="fa-solid fa-user text-sm w-4 text-center"></i>
                        </Link>
                        <button
                            onClick={handleLogout}
                            aria-label="Keluar"
                            className="w-10 h-10 rounded-full bg-midnight-800 border border-midnight-700 flex items-center justify-center text-midnight-300 hover:text-red-400 hover:border-red-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 transition shrink-0"
                            title="Logout"
                        >
                            <i className="fa-solid fa-right-from-bracket text-sm w-4 text-center"></i>
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5 lg:mt-6 flex flex-col lg:flex-row gap-5 lg:gap-6 pb-16">
                {sideOpen && (
                <>
                    {/* Overlay drawer khusus mobile — klik untuk menutup. */}
                    <div
                        onClick={closeSidebar}
                        aria-hidden="true"
                        className="ff-side-overlay fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                    />
                    <aside
                        aria-label="Navigasi utama"
                        className={`shrink-0 min-w-0 z-50
                            max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:w-[280px] max-lg:z-50 max-lg:p-3 max-lg:transition-transform max-lg:duration-300 max-lg:ease-out
                            lg:sticky lg:top-[5.5rem] lg:h-[calc(100vh-104px)] lg:transition-[width] lg:duration-300 lg:ease-[cubic-bezier(0.22,1,0.36,1)]
                            ${mini ? 'side-mini lg:w-[78px]' : 'lg:w-60'}`}
                    >
                    <nav className={`ff-card ff-side rounded-2xl p-2 flex flex-col gap-1 h-full max-h-full max-lg:overflow-y-auto ${mini ? 'lg:overflow-visible' : 'lg:overflow-y-auto lg:overflow-x-visible'}`}>
                        {/* Profil pengguna di atas sidebar. */}
                        <Link
                            to="/profile"
                            onClick={() => { if (window.innerWidth < 1024) closeSidebar(); }}
                            title="Profil"
                            aria-label="Profil pengguna"
                            className="ff-side-profile group relative flex items-center gap-3 p-2 rounded-xl hover:bg-midnight-800/80 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-400/70"
                        >
                            <span aria-hidden="true" className="w-10 h-10 rounded-full bg-gradient-to-tr from-midnight-600 to-midnight-300 p-[1.5px] shadow-lg shrink-0">
                                <span className="w-full h-full bg-midnight-950 rounded-full flex items-center justify-center font-display font-black text-midnight-200">
                                    {profileInitial}
                                </span>
                            </span>
                            <span className="ff-side-fade flex-1 min-w-0 text-left">
                                <span className="block text-xs font-bold text-white truncate">{user?.team_name || user?.name}</span>
                                <span className="mt-0.5 inline-block px-2 py-px rounded-full bg-midnight-800 border border-midnight-700 text-[9px] uppercase tracking-wider text-midnight-300">
                                    {user?.role}
                                </span>
                            </span>
                            <span className="ff-tip" role="tooltip">Profil</span>
                        </Link>
                        <p className="ff-side-heading hidden lg:block px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-midnight-300/70 overflow-hidden">
                            Menu
                        </p>
                        {nav.map((n) => (
                            <NavLink
                                key={n.to}
                                to={n.to}
                                end={n.to === '/' || n.to === '/admin'}
                                className={linkCls}
                                onClick={() => { if (window.innerWidth < 1024) closeSidebar(); }}
                            >
                                {({ isActive }) => (
                                    <>
                                        <span
                                            aria-hidden="true"
                                            className={`ff-side-bar w-1 self-stretch rounded-full shrink-0 transition-colors duration-200 ${isActive ? 'bg-midnight-400 shadow-[0_0_8px_rgba(124,140,255,0.8)]' : 'bg-transparent group-hover:bg-midnight-700'}`}
                                        />
                                        <span className={`relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 ${isActive ? 'bg-midnight-500/30 text-white' : 'bg-midnight-900/60 text-midnight-300 group-hover:text-midnight-100'}`}>
                                            <i className={`fa-solid ${n.icon} text-[13px] w-4 text-center`}></i>
                                            {n.badgeKey === 'mail' && unreadMail > 0 && (
                                                <span className="ff-mail-dot min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-extrabold tabular-nums hidden items-center justify-center shrink-0">
                                                    {unreadMail > 99 ? '99+' : unreadMail}
                                                </span>
                                            )}
                                        </span>
                                        <span className="ff-side-label whitespace-nowrap flex-1 text-left">{n.label}</span>
                                        {n.badgeKey === 'mail' && unreadMail > 0 && (
                                            <span className="ff-mail-badge ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold tabular-nums flex items-center justify-center shrink-0">
                                                {unreadMail > 99 ? '99+' : unreadMail}
                                            </span>
                                        )}
                                        <span className="ff-tip" role="tooltip">{n.label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                        {/* Utilitas bawah: logout + tombol collapse (mt-auto agar menempel bawah). */}
                        <div className="mt-auto pt-2 border-t border-midnight-400/15 flex flex-col gap-1">
                            <button
                                onClick={handleLogout}
                                title="Keluar"
                                aria-label="Keluar"
                                className="ff-nav-link ff-side-item group relative flex items-center gap-3 pl-3 pr-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-midnight-300 hover:bg-midnight-800/80 hover:text-red-400 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 w-full"
                            >
                                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-midnight-900/60 group-hover:text-red-400 transition-colors duration-200">
                                    <i className="fa-solid fa-right-from-bracket text-[13px] w-4 text-center"></i>
                                </span>
                                <span className="ff-side-label whitespace-nowrap flex-1 text-left">Keluar</span>
                                <span className="ff-tip" role="tooltip">Keluar</span>
                            </button>
                            <button
                                onClick={toggleMini}
                                title={mini ? 'Perluas sidebar' : 'Sempitkan sidebar'}
                                aria-label={mini ? 'Perluas sidebar' : 'Sempitkan sidebar'}
                                aria-expanded={!mini}
                                className="hidden lg:flex items-center justify-center gap-2 py-1.5 rounded-xl text-midnight-300 hover:text-white hover:bg-midnight-800/80 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-400/70"
                            >
                                <i className={`fa-solid fa-chevron-left text-xs transition-transform duration-300 ${mini ? 'rotate-180' : ''}`}></i>
                                <span className="ff-side-label text-[10px] font-bold uppercase tracking-[0.2em]">Sempit</span>
                            </button>
                        </div>
                    </nav>
                </aside>
                </>
                )}
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
