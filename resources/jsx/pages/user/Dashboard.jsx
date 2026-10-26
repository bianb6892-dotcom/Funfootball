import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatWidget, PlayerCard } from '../../components/common';
import { PlayerDetail } from '../../components/PlayerModals';
import { errMsg } from '../../utils/game';

export function Dashboard() {
    const { user, refresh } = useAuth();
    const toast = useToast();
    const [stats, setStats] = useState(null);
    const [lineup, setLineup] = useState(null);
    const [detail, setDetail] = useState(null);
    const [daily, setDaily] = useState(null);
    const [claiming, setClaiming] = useState(false);

    useEffect(() => {
        api.players({ per_page: 4, sort: 'ovr-desc' }).then(({ data }) => setStats(data));
        api.lineup().then(({ data }) => setLineup(data)).catch(() => {});
        api.dailyStatus().then(({ data }) => setDaily(data)).catch(() => {});
    }, []);

    const claimDaily = async () => {
        setClaiming(true);
        try {
            const { data } = await api.dailyClaim();
            setDaily(data);
            toast(`+${data.tokens_granted} token diklaim! Streak ${data.streak} hari.`, 'fa-ticket');
            try { await refresh(); } catch { /* abaikan */ }
        } catch (err) {
            toast(errMsg(err, 'Klaim gagal.'), 'fa-circle-exclamation');
        } finally {
            setClaiming(false);
        }
    };

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

            <div className="ff-card p-6 rounded-3xl flex flex-wrap items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 text-xl shrink-0">
                    <i className="fa-solid fa-ticket"></i>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider">
                        Klaim Harian Token
                    </h3>
                    <p className="text-[11px] text-midnight-300 mt-0.5">
                        {daily
                            ? (daily.can_claim
                                ? `Siap diklaim: +${daily.claim_amount} token (streak ${daily.next_streak} hari). Token dipakai untuk masuk challenge event.`
                                : `Sudah diklaim hari ini (streak ${daily.streak} hari). Besok dapat +${daily.claim_amount} token.`)
                            : 'Memuat status klaim...'}
                    </p>
                </div>
                <button
                    onClick={claimDaily}
                    disabled={claiming || !daily?.can_claim}
                    className="gold-btn px-5 py-2.5 rounded-xl text-xs font-black uppercase disabled:opacity-50"
                >
                    {claiming ? 'Mengklaim...' : daily?.can_claim ? `Klaim +${daily?.claim_amount ?? 3}` : 'Sudah Diklaim'}
                </button>
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
