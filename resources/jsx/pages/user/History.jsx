import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { EmptyState, Modal } from '../../components/common';
import { timeID } from '../../utils/game';

export function History() {
    const { user } = useAuth();
    const [matches, setMatches] = useState([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [detail, setDetail] = useState(null);

    useEffect(() => {
        api.matches(page).then(({ data }) => {
            setMatches(data.data);
            setLastPage(data.last_page);
        }).catch(() => {});
    }, [page]);

    const row = (m) => {
        const iAmChallenger = m.challenger_id === user.id;
        const myScore = iAmChallenger ? m.challenger_score : m.opponent_score;
        const opScore = iAmChallenger ? m.opponent_score : m.challenger_score;
        const myOvr = iAmChallenger ? m.challenger_ovr : m.opponent_ovr;
        const opOvr = iAmChallenger ? m.opponent_ovr : m.challenger_ovr;
        const outcome = m.result === 'draw' ? 'DRAW' : myScore > opScore ? 'WIN' : 'LOSS';
        const cls = outcome === 'WIN' ? 'text-emerald-300 border-emerald-500/50 bg-emerald-500/10'
            : outcome === 'LOSS' ? 'text-red-400 border-red-500/50 bg-red-500/10'
            : 'text-midnight-200 border-midnight-400/40 bg-midnight-400/10';
        return { myScore, opScore, myOvr, opOvr, outcome, cls };
    };

    return (
        <div className="space-y-6">
            <div className="ff-card p-6 rounded-3xl">
                <h2 className="font-display text-xl font-black ff-gradient-text">RIWAYAT PERTANDINGAN</h2>
                <p className="text-xs text-midnight-300 mt-1">Semua laga PvP dan Fun Match yang kamu mainkan.</p>
            </div>

            {matches.length === 0 ? (
                <EmptyState icon="fa-trophy" title="Belum Ada Pertandingan" subtitle="Tantang manajer lain di halaman Match / PvP, atau lawan tim besar di Fun Match." />
            ) : (
                <div className="space-y-3">
                    {matches.map((m) => {
                        const r = row(m);
                        const isFun = !m.opponent_id;
                        return (
                            <div
                                key={m.id}
                                onClick={() => setDetail(m)}
                                className="ff-card p-4 rounded-2xl flex items-center gap-4 cursor-pointer hoverable"
                            >
                                <span className="flex flex-col gap-1 shrink-0">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-wider border ${r.cls}`}>
                                        {r.outcome}
                                    </span>
                                    {isFun && (
                                        <span className="px-3 py-1 rounded-lg text-[9px] font-black tracking-wider border border-cyan-300/50 bg-cyan-500/10 text-cyan-200" title={`Fun Match vs ${m.snapshot?.fun_team?.name || 'Tim CPU'} (${m.snapshot?.difficulty_label || m.difficulty || ''})`}>
                                            <i className="fa-solid fa-gamepad mr-1"></i>FUN
                                        </span>
                                    )}
                                </span>
                                <div className="flex-1 text-center">
                                    <p className="font-display font-extrabold text-xl text-white">
                                        {r.myScore} <span className="text-midnight-300 text-sm">-</span> {r.opScore}
                                    </p>
                                    <p className="text-[10px] text-midnight-300">
                                        {isFun ? `vs ${m.snapshot?.fun_team?.name || 'Tim CPU'}` : null}{isFun ? ' · ' : null}
                                        OVR {r.myOvr} vs {r.opOvr} &middot; {timeID(m.played_at)}
                                    </p>
                                </div>
                                <i className="fa-solid fa-chevron-right text-midnight-300 text-xs"></i>
                            </div>
                        );
                    })}
                </div>
            )}

            {lastPage > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button disabled={page <= 1} onClick={() => setPage((x) => x - 1)} className="ff-outline-btn px-4 py-2 rounded-xl text-xs disabled:opacity-40">
                        <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <span className="text-xs text-midnight-300">{page} / {lastPage}</span>
                    <button disabled={page >= lastPage} onClick={() => setPage((x) => x + 1)} className="ff-outline-btn px-4 py-2 rounded-xl text-xs disabled:opacity-40">
                        <i className="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            )}

            <Modal open={!!detail} onClose={() => setDetail(null)} maxWidth="max-w-3xl">
                {detail && (
                    <div>
                        <h3 className="font-display text-xl font-black ff-gradient-text text-center mb-4">
                            {detail.challenger_score} - {detail.opponent_score}
                        </h3>
                        <p className="text-center text-[11px] text-midnight-300 mb-5">
                            {!detail.opponent_id && (
                                <span className="text-cyan-200 font-bold">
                                    <i className="fa-solid fa-gamepad mr-1"></i>
                                    Fun Match vs {detail.snapshot?.fun_team?.name || 'Tim CPU'} &middot; Level {detail.snapshot?.difficulty_label || detail.difficulty || '—'} &middot;
                                </span>
                            )}{' '}
                            OVR {detail.challenger_ovr} vs {detail.opponent_ovr} &middot; {timeID(detail.played_at)}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {['challenger', 'opponent'].map((side) => (
                                <div key={side} className="bg-midnight-950/60 rounded-2xl border border-midnight-700/60 p-4">
                                    <h4 className="font-display font-bold text-sm text-midnight-200 uppercase mb-1">
                                        {side === 'challenger' ? 'Penatang' : 'Lawan'} ({detail.snapshot?.[side]?.formation})
                                    </h4>
                                    <p className="text-[11px] text-midnight-300 mb-3">Team OVR {detail.snapshot?.[side]?.ovr}</p>
                                    <div className="space-y-1.5">
                                        {(detail.snapshot?.[side]?.xi || []).map((p, i) => (
                                            <div key={i} className="flex items-center justify-between text-[11px] bg-midnight-900/70 rounded-lg px-3 py-1.5">
                                                <span className="text-white font-semibold truncate">{p.name}</span>
                                                <span className="text-midnight-300 shrink-0 ml-2">{p.pos} &middot; {p.ovr}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
