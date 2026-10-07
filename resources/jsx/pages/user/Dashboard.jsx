import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { StatWidget, PlayerCard } from '../../components/common';
import { PlayerDetail } from '../../components/PlayerModals';

export function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [lineup, setLineup] = useState(null);
    const [detail, setDetail] = useState(null);

    useEffect(() => {
        api.players({ per_page: 4, sort: 'ovr-desc' }).then(({ data }) => setStats(data));
        api.lineup().then(({ data }) => setLineup(data)).catch(() => {});
    }, []);

    return (
        <div className="space-y-6">
            <div className="ff-card p-6 rounded-3xl">
                <h2 className="font-display text-xl font-black ff-gradient-text">
                    {user?.team_name || 'TIM SAYA'}
                </h2>
                <p className="text-xs text-midnight-300 mt-1">
                    Kelola koleksi, bangun line-up, dan tantang manajer lain.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
                    <StatWidget icon="fa-star" label="Team OVR" value={lineup?.team_ovr ?? 0} />
                    <StatWidget icon="fa-bookmark" label="Koleksi" value={user?.user_players_count ?? 0} />
                    <StatWidget icon="fa-users" label="Line-Up" value={`${lineup?.filled ?? 0}/11`} />
                    <StatWidget icon="fa-coins" label="Coins" value={(user?.coins ?? 0).toLocaleString('id-ID')} accent="text-gold-300" />
                </div>
            </div>

            <div className="ff-card p-6 rounded-3xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-bold text-midnight-200 text-sm uppercase tracking-wider">
                        <i className="fa-solid fa-crown mr-1 text-gold-400"></i> Pemain Top Rating
                    </h3>
                    <Link to="/roster" className="text-[11px] text-midnight-300 hover:text-white">
                        Lihat roster <i className="fa-solid fa-arrow-right"></i>
                    </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                    {(stats?.data || []).map((p) => (
                        <PlayerCard key={p.id} player={p} onClick={() => setDetail(p)} />
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { to: '/gacha', icon: 'fa-dice', title: 'Gacha Pack', desc: 'Buka pack & dapatkan pemain' },
                    { to: '/lineup', icon: 'fa-chess-board', title: 'Atur Line-Up', desc: 'Bangun starting XI + bench' },
                    { to: '/match', icon: 'fa-trophy', title: 'Tantang PvP', desc: 'Uji kekuatan timmu' },
                ].map((c) => (
                    <Link key={c.to} to={c.to} className="ff-card hoverable p-5 rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-midnight-800 border border-midnight-400/30 flex items-center justify-center text-gold-400 text-xl shrink-0">
                            <i className={`fa-solid ${c.icon}`}></i>
                        </div>
                        <div>
                            <h4 className="font-display font-bold text-white text-sm">{c.title}</h4>
                            <p className="text-[11px] text-midnight-300">{c.desc}</p>
                        </div>
                    </Link>
                ))}
            </div>

            <PlayerDetail player={detail} onClose={() => setDetail(null)} />
        </div>
    );
}
