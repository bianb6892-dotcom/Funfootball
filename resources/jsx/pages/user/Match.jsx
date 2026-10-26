import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LiveMatch } from '../../components/LiveMatch';
import { MatchEvents } from '../../components/MatchEvents';
import { PackReward } from '../../components/PackReward';
import { RankBadge } from '../../components/common';
import { errMsg } from '../../utils/game';

export function Match() {
    const { user, refresh } = useAuth();
    const toast = useToast();
    const [opponents, setOpponents] = useState([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [fighting, setFighting] = useState(null);
    const [live, setLive] = useState(null); // data match yang sedang disiarkan live
    const [result, setResult] = useState(null);
    const [reward, setReward] = useState(null); // { pack, draws } → overlay buka pack

    useEffect(() => {
        api.opponents(page).then(({ data }) => {
            setOpponents(data.data);
            setLastPage(data.last_page);
        }).catch(() => {});
    }, [page]);

    const challenge = async (opp) => {
        setFighting(opp.id);
        setResult(null);
        setLive(null);
        setReward(null);
        try {
            const { data } = await api.challenge(opp.id);
            // Hasil sudah dihitung server; jalankan siaran live-nya dulu.
            setLive({ ...data, opp });
        } catch (err) {
            toast(errMsg(err, 'Tantangan gagal.'), 'fa-circle-exclamation');
        } finally {
            setFighting(null);
        }
    };

    // Dipanggil dari layar "Peluit akhir": tampilkan hasil, lalu bila menang
    // dan ada hadiah pack → langsung ke animasi membuka pack.
    const finishLive = () => {
        if (!live) return;
        setResult(live);
        setLive(null);
        if (live.result === 'challenger_win' && live.reward_draws?.length) {
            setReward({ pack: live.reward_pack, draws: live.reward_draws });
        }
        refresh().catch(() => {});
    };

    const closeReward = () => {
        setReward(null);
        refresh().catch(() => {});
    };

    const verdict = (m) => {
        if (m.result === 'draw') return { text: 'DRAW', cls: 'text-midnight-200' };
        const iWin = (m.result === 'challenger_win' && m.challenger_id === user.id) ||
            (m.result === 'opponent_win' && m.opponent_id === user.id);
        return iWin ? { text: 'WIN', cls: 'text-emerald-300' } : { text: 'LOSS', cls: 'text-red-400' };
    };

    return (
        <div className="space-y-6">
            <div className="ff-card p-6 rounded-3xl text-center">
                <i className="fa-solid fa-trophy text-gold-400 text-3xl mb-3 inline-block"></i>
                <h2 className="font-display text-2xl font-black ff-gradient-text mb-1">PVP ARENA</h2>
                <p className="text-xs text-midnight-300 max-w-lg mx-auto">
                    Tantang manajer lain. Hasil dihitung server dari Team OVR + formasi + faktor acak kecil.
                    Pastikan starting XI-mu sudah lengkap (11 pemain tersimpan).
                </p>
            </div>

            {live && (
                <LiveMatch
                    details={live.snapshot?.details}
                    home={user.team_name}
                    away={live.opp.team_name}
                    onDone={finishLive}
                />
            )}

            {result && !live && (
                <div className="ff-card p-6 rounded-3xl text-center">
                    <h3 className="font-display font-bold text-midnight-200 text-sm uppercase tracking-wider mb-4">Hasil Pertandingan</h3>
                    <div className="flex items-center justify-center gap-6 flex-wrap">
                        <TeamScore name={user.team_name} ovr={result.challenger_ovr} score={result.challenger_score} />
                        <span className="font-display text-2xl font-black text-midnight-300">VS</span>
                        <TeamScore name={result.opp.team_name} ovr={result.opponent_ovr} score={result.opponent_score} />
                    </div>
                    <p className={`font-display text-3xl font-black mt-4 ${verdict({ ...result, challenger_id: user.id }).cls}`}>
                        {verdict({ ...result, challenger_id: user.id }).text}
                    </p>
                    {result.result === 'challenger_win' && result.reward_draws?.length > 0 && !reward && (
                        <div className="mt-4 rounded-2xl border border-gold-500/40 bg-gold-500/10 p-4 flex items-center gap-3 text-left flex-wrap">
                            <i className="fa-solid fa-gift text-gold-300 text-2xl shrink-0"></i>
                            <div className="flex-1 min-w-[180px]">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gold-300">Hadiah kemenangan: {result.reward_pack?.name || 'Pack'}</p>
                                <p className="text-xs text-white font-bold mt-0.5">
                                    {result.reward_draws[0]?.name} (OVR {result.reward_draws[0]?.ovr}) <RankBadge rank={result.reward_draws[0]?.rank_rolled} />
                                </p>
                            </div>
                            <button onClick={() => setReward({ pack: result.reward_pack, draws: result.reward_draws })} className="gold-btn px-5 py-2.5 rounded-xl text-[11px] font-black uppercase">
                                <i className="fa-solid fa-box-open mr-1"></i> Buka Hadiah
                            </button>
                        </div>
                    )}
                    <p className="text-[11px] text-midnight-300 mt-3">Snapshot line-up tersimpan di riwayat.</p>
                    <div className="mt-4 text-left">
                        <MatchEvents details={result.snapshot?.details} home={user.team_name} away={result.opp.team_name} />
                    </div>
                </div>
            )}

            {reward && (
                <PackReward pack={reward.pack} draws={reward.draws} onClose={closeReward} />
            )}

            <div className="ff-card p-5 rounded-2xl">
                <h3 className="font-display font-bold text-midnight-200 text-sm uppercase tracking-wider mb-4">
                    <i className="fa-solid fa-user-group mr-1"></i> Pilih Lawan
                </h3>
                <div className="space-y-2">
                    {opponents.map((o) => (
                        <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl bg-midnight-950/60 border border-midnight-700/50">
                            <div className="w-10 h-10 rounded-full bg-midnight-800 border border-midnight-400/40 flex items-center justify-center text-midnight-200 shrink-0">
                                <i className="fa-solid fa-user"></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{o.team_name || o.name}</p>
                                <p className="text-[10px] text-midnight-300">{o.user_players_count} pemain dikoleksi</p>
                            </div>
                            <button
                                onClick={() => challenge(o)}
                                disabled={fighting === o.id}
                                className="gold-btn px-4 py-2 rounded-xl text-[10px] font-bold uppercase disabled:opacity-50"
                            >
                                {fighting === o.id ? 'Bertanding...' : 'Tantang'}
                            </button>
                        </div>
                    ))}
                    {opponents.length === 0 && (
                        <p className="text-xs text-midnight-300 text-center py-4">Belum ada lawan tersedia.</p>
                    )}
                </div>
                {lastPage > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-4">
                        <button disabled={page <= 1} onClick={() => setPage((x) => x - 1)} className="ff-outline-btn px-4 py-2 rounded-xl text-xs disabled:opacity-40">
                            <i className="fa-solid fa-chevron-left"></i>
                        </button>
                        <span className="text-xs text-midnight-300">{page} / {lastPage}</span>
                        <button disabled={page >= lastPage} onClick={() => setPage((x) => x + 1)} className="ff-outline-btn px-4 py-2 rounded-xl text-xs disabled:opacity-40">
                            <i className="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function TeamScore({ name, ovr, score }) {
    return (
        <div className="text-center">
            <p className="font-display font-bold text-white">{name}</p>
            <p className="text-[11px] text-midnight-300">Team OVR {ovr}</p>
            <p className="font-display text-5xl font-black text-gold-300 mt-1">{score}</p>
        </div>
    );
}
