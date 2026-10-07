import { useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { StatWidget } from '../../components/common';
import { timeID } from '../../utils/game';

export function Profile() {
    const { user, refresh, logout } = useAuth();

    useEffect(() => {
        refresh().catch(() => {});
    }, [refresh]);

    return (
        <div className="space-y-6">
            <div className="ff-card p-6 rounded-3xl flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-midnight-700 to-midnight-400 flex items-center justify-center text-3xl text-white shrink-0">
                    <i className="fa-solid fa-user"></i>
                </div>
                <div className="min-w-0">
                    <h2 className="font-display text-2xl font-black text-white truncate">{user?.team_name}</h2>
                    <p className="text-xs text-midnight-300">{user?.name} &middot; {user?.email}</p>
                    <span className="inline-block mt-2 px-3 py-0.5 rounded-full bg-midnight-800 border border-midnight-700 text-[10px] uppercase font-bold text-midnight-200">
                        {user?.role}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatWidget icon="fa-coins" label="Coins" value={(user?.coins ?? 0).toLocaleString('id-ID')} accent="text-gold-300" />
                <StatWidget icon="fa-bookmark" label="Koleksi" value={user?.user_players_count ?? 0} />
                <StatWidget icon="fa-calendar" label="Bergabung" value={user?.created_at ? timeID(user.created_at).split(',')[0] : '—'} />
            </div>

            <button
                onClick={async () => {
                    await logout();
                    window.location.href = '/login';
                }}
                className="ff-outline-btn px-5 py-2.5 rounded-xl text-xs font-bold uppercase w-full sm:w-auto"
            >
                <i className="fa-solid fa-right-from-bracket mr-1"></i> Logout
            </button>
        </div>
    );
}
