import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { OvrBadge, RankBadge } from '../../components/common';
import { RANK_ICON, errMsg, timeID } from '../../utils/game';

const PACK_STYLE = {
    bronze: { icon: 'fa-box', box: 'from-amber-700 to-amber-900 border-amber-500/40', text: 'text-white', badge: null },
    silver: { icon: 'fa-box', box: 'from-slate-400 to-slate-700 border-slate-300/40', text: 'text-white', badge: null },
    gold: { icon: 'fa-box-open', box: 'from-gold-400 to-gold-600 border-gold-300/60', text: 'text-gold-300', badge: 'HOT', pulse: true },
    diamond: { icon: 'fa-gem', box: 'from-cyan-400 via-sky-500 to-blue-600 border-cyan-300/60', text: 'text-cyan-300', badge: 'ELITE', pulse: true },
};

export function Gacha() {
    const { refresh } = useAuth();
    const toast = useToast();
    const [packs, setPacks] = useState([]);
    const [history, setHistory] = useState([]);
    const [opening, setOpening] = useState(null); // pack slug being opened
    const [result, setResult] = useState(null);

    const load = async () => {
        const [{ data: p }, { data: h }] = await Promise.all([api.packs(), api.gachaHistory()]);
        setPacks(p);
        setHistory(h.data || h);
    };

    useEffect(() => {
        load().catch(() => {});
    }, []);

    const openPack = async (pack) => {
        setOpening(pack);
        setResult(null);
        try {
            const { data } = await api.draw(pack.slug);
            setTimeout(() => {
                setOpening(null);
                setResult({ ...data, pack });
                refresh();
                load().catch(() => {});
            }, 1800);
        } catch (err) {
            setOpening(null);
            toast(errMsg(err, 'Gacha gagal.'), 'fa-circle-exclamation');
        }
    };

    return (
        <div className="space-y-6">
            <div className="ff-card p-6 rounded-3xl text-center">
                <i className="fa-solid fa-dice text-midnight-300 text-3xl mb-3 pack-pulse inline-block"></i>
                <h2 className="font-display text-2xl font-black ff-gradient-text mb-1">PACK GACHA</h2>
                <p className="text-xs text-midnight-300 max-w-lg mx-auto">
                    Buka pack untuk mendapatkan pemain random. Pemain masuk ke koleksimu.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {packs.map((pack) => {
                    const st = PACK_STYLE[pack.slug] || PACK_STYLE.bronze;
                    return (
                        <div key={pack.id} className="pack-card" onClick={() => openPack(pack)}>
                            <div className="pack-inner p-5 text-center relative">
                                {st.badge && (
                                    <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-black ${
                                        pack.slug === 'gold' ? 'bg-gold-500 text-midnight-950' : 'bg-cyan-400 text-midnight-950'
                                    }`}>
                                        {st.badge}
                                    </div>
                                )}
                                <div className={`w-20 h-20 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-br ${st.box} border shadow-lg ${st.pulse ? 'pack-pulse' : ''}`}>
                                    <i className={`fa-solid ${st.icon} text-3xl ${pack.slug === 'gold' ? 'text-midnight-950' : 'text-white'}`}></i>
                                </div>
                                <h3 className={`font-display font-bold text-lg ${st.text === 'text-white' ? 'text-white' : st.text}`}>
                                    {pack.name}
                                </h3>
                                <div className="space-y-1 text-[10px] text-midnight-300 mb-4 mt-3">
                                    {Object.entries(pack.rates || {})
                                        .filter(([, v]) => v > 0)
                                        .map(([rank, v]) => (
                                            <div key={rank} className="flex justify-between capitalize">
                                                <span>{rank}</span>
                                                <span className="font-bold">{v}%</span>
                                            </div>
                                        ))}
                                </div>
                                <div className="coin-display px-3 py-2 rounded-xl inline-flex items-center gap-1.5 text-xs font-bold">
                                    <i className="fa-solid fa-coins"></i>
                                    <span>{Number(pack.price).toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="ff-card p-5 rounded-2xl">
                <h3 className="font-display font-bold text-midnight-200 text-sm uppercase tracking-wider mb-4">
                    <i className="fa-solid fa-clock-rotate-left mr-1"></i> Riwayat Gacha
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                    {history.length === 0 && (
                        <p className="text-xs text-midnight-300 text-center py-4">Belum ada riwayat. Buka pack pertama kamu!</p>
                    )}
                    {history.map((h) => (
                        <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl bg-midnight-950/60 border border-midnight-700/50">
                            <RankBadge rank={h.rank_rolled} />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{h.player_name || h.player?.name || 'Pemain dihapus'}</p>
                                <p className="text-[10px] text-midnight-300">
                                    {h.pack?.name} &middot; {timeID(h.created_at)}
                                    {!h.player && ' \u00B7 arsip'}
                                </p>
                            </div>
                            {(h.player?.ovr ?? h.ovr) ? (
                                <OvrBadge ovr={h.player?.ovr ?? h.ovr} />
                            ) : (
                                <span className="text-[9px] text-midnight-300 uppercase shrink-0">—</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* overlay opening */}
            <div className={`gacha-overlay ${opening || result ? 'show' : ''}`}>
                <div className="text-center max-w-3xl w-full">
                    {opening && !result && (
                        <div>
                            <div className={`w-40 h-40 mx-auto rounded-3xl flex items-center justify-center text-6xl mb-6 relative pack-pulse bg-gradient-to-br ${(PACK_STYLE[opening.slug] || PACK_STYLE.bronze).box} border border-midnight-400/50`}>
                                <i className={`fa-solid ${(PACK_STYLE[opening.slug] || PACK_STYLE.bronze).icon} text-white`}></i>
                            </div>
                            <h2 className="font-display text-2xl font-black ff-gradient-text mb-2">MEMBUKA PACK...</h2>
                        </div>
                    )}
                    {result && (
                        <div>
                            <RevealCard player={result.player} rank={result.rank_rolled} />
                            <div className="mt-6 space-y-3">
                                <p className="text-sm text-midnight-100">
                                    Mendapatkan pemain <RankBadge rank={result.rank_rolled} /> — sisa coins:{' '}
                                    <span className="text-gold-300 font-bold">{Number(result.coins).toLocaleString('id-ID')}</span>
                                </p>
                                <div className="flex items-center justify-center gap-3 flex-wrap">
                                    <button onClick={() => openPack(result.pack)} className="gold-btn px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider">
                                        <i className="fa-solid fa-dice mr-1"></i> Gacha Lagi
                                    </button>
                                    <button onClick={() => { setResult(null); }} className="ff-outline-btn px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider">
                                        Tutup
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function RevealCard({ player, rank }) {
    return (
        <div className={`max-w-sm mx-auto p-6 rounded-3xl border-2 relative reveal-flip rank-${rank}`}>
            {(rank === 'gold' || rank === 'diamond') && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                    {Array.from({ length: 14 }).map((_, i) => (
                        <div
                            key={i}
                            className="sparkle"
                            style={{ left: `${(i * 67) % 100}%`, top: '100%', animationDelay: `${(i % 5) * 0.3}s` }}
                        ></div>
                    ))}
                </div>
            )}
            <div className="relative z-10">
                <div className="mb-3">
                    <RankBadge rank={rank} />
                </div>
                <h3 className="font-display text-2xl font-black text-white mb-1">{player.name}</h3>
                <p className="text-xs text-midnight-200 font-semibold mb-3">
                    {player.club} &middot; {player.position} &middot; #{player.shirt_number}
                </p>
                <OvrBadge ovr={player.ovr} size="lg" />
            </div>
        </div>
    );
}

export { RANK_ICON };
