import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { StatWidget, RankBadge, OvrBadge } from '../../components/common';
import { timeID } from '../../utils/game';

export function AdminDashboard() {
    const [d, setD] = useState(null);

    useEffect(() => {
        api.adminDashboard().then(({ data }) => setD(data)).catch(() => {});
    }, []);

    if (!d) return <p className="text-midnight-300 text-sm">Memuat dashboard...</p>;

    return (
        <div className="space-y-6">
            <div className="ff-card p-6 rounded-3xl">
                <h2 className="font-display text-xl font-black ff-gradient-text">ADMIN DASHBOARD</h2>
                <p className="text-xs text-midnight-300 mt-1">Ringkasan ekosistem FOOTBALL-FUN.</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-5">
                    <StatWidget icon="fa-user-group" label="Total Users" value={d.total_users} />
                    <StatWidget icon="fa-users" label="Total Players" value={d.total_players} />
                    <StatWidget icon="fa-dice" label="Total Gacha" value={d.total_gacha} />
                    <StatWidget icon="fa-trophy" label="Total Match" value={d.total_matches} />
                    <StatWidget icon="fa-coins" label="Coins Flow" value={Number(d.coins_distributed).toLocaleString('id-ID')} accent="text-gold-300" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="ff-card p-5 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-display font-bold text-midnight-200 text-sm uppercase">Top OVR Players</h3>
                        <Link to="/admin/players" className="text-[11px] text-midnight-300 hover:text-white">Kelola</Link>
                    </div>
                    <div className="space-y-2">
                        {d.top_players.map((p) => (
                            <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-midnight-950/60 border border-midnight-700/50">
                                <OvrBadge ovr={p.ovr} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white truncate">{p.name}</p>
                                    <p className="text-[10px] text-midnight-300">{p.club} &middot; {p.position}</p>
                                </div>
                                <RankBadge rank={p.rank} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="ff-card p-5 rounded-2xl">
                        <h3 className="font-display font-bold text-midnight-200 text-sm uppercase mb-4">Recent Gacha</h3>
                        <div className="space-y-2">
                            {d.recent_gacha.map((g) => (
                                <div key={g.id} className="flex items-center gap-3 text-xs">
                                    <RankBadge rank={g.rank_rolled} />
                                    <span className="text-white font-semibold truncate flex-1">{g.player_name || g.player?.name || 'Pemain dihapus'}</span>
                                    <span className="text-midnight-300 shrink-0">{g.pack?.name}</span>
                                </div>
                            ))}
                            {d.recent_gacha.length === 0 && <p className="text-xs text-midnight-300">Belum ada.</p>}
                        </div>
                    </div>
                    <div className="ff-card p-5 rounded-2xl">
                        <h3 className="font-display font-bold text-midnight-200 text-sm uppercase mb-4">Recent Matches</h3>
                        <div className="space-y-2 text-xs">
                            {d.recent_matches.map((m) => (
                                <div key={m.id} className="flex items-center justify-between text-midnight-100">
                                    <span className="font-display font-bold">{m.challenger_score} - {m.opponent_score}</span>
                                    <span className="text-midnight-300">OVR {m.challenger_ovr} vs {m.opponent_ovr}</span>
                                    <span className="text-midnight-300">{timeID(m.played_at)}</span>
                                </div>
                            ))}
                            {d.recent_matches.length === 0 && <p className="text-xs text-midnight-300">Belum ada.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
