import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RevealCard, PACK_STYLE, PACK_FALLBACK } from '../pages/user/Gacha';
import { RankBadge } from './common';
import { cardOf } from '../utils/game';

/**
 * PackReward — overlay hadiah pack otomatis (mis. menang PvP).
 * Alur: pack berguncang ("MEMBUKA...") → reveal ala FC Mobile
 * (bendera → club → posisi → OVR) memakai RevealCard yang sama
 * dengan halaman Gacha sehingga animasinya identik.
 */
export function PackReward({ pack, draws, onClose }) {
    const draw = draws?.[0] || null;
    const player = draw || null;
    const rank = player ? cardOf(player) || player.rank_rolled : null;
    const animated = rank !== 'bronze' && rank !== 'silver';

    const [opening, setOpening] = useState(true);
    const [stage, setStage] = useState(0);

    useEffect(() => {
        setOpening(true);
        setStage(0);
        const t = setTimeout(() => setOpening(false), 2600);
        return () => clearTimeout(t);
    }, [draw?.result_id]);

    useEffect(() => {
        if (opening || !player) return;
        if (!animated) {
            setStage(3);
            return;
        }
        setStage(0);
        const t1 = setTimeout(() => setStage(1), 2200);
        const t2 = setTimeout(() => setStage(2), 4400);
        const t3 = setTimeout(() => setStage(3), 6600);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [opening, player?.result_id, animated]);

    if (!player) return null;
    const st = PACK_STYLE[pack?.slug] || PACK_FALLBACK;

    return (
        <div className="gacha-overlay show">
            <div className="text-center max-w-3xl w-full">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-300 mb-1">
                    <i className="fa-solid fa-trophy mr-1"></i> Hadiah Kemenangan — {pack?.name || 'Pack'}
                </p>
                {opening ? (
                    <div className="relative">
                        <div className="fc-beams"></div>
                        <div className={`w-40 h-40 mx-auto rounded-3xl flex items-center justify-center text-6xl mb-6 relative fc-shake bg-gradient-to-br ${st.box} border border-midnight-400/50`}>
                            <i className={`fa-solid ${st.icon} text-white`}></i>
                        </div>
                        <h2 className="font-display text-2xl font-black ff-gradient-text mb-2">MEMBUKA HADIAH...</h2>
                        <p className="text-[11px] tracking-[0.3em] uppercase text-midnight-300">Gratis — masuk koleksi</p>
                    </div>
                ) : (
                    <div>
                        <RevealCard
                            key={player.result_id}
                            player={player}
                            rank={rank}
                            stage={stage}
                            animated={animated}
                            onSkip={animated && stage < 3 ? () => setStage(3) : undefined}
                        />
                        <div className="mt-6 space-y-3">
                            <p className="text-sm text-midnight-100">
                                Mendapatkan pemain <RankBadge rank={rank} /> — gratis!
                            </p>
                            <div className="flex items-center justify-center gap-3 flex-wrap">
                                <Link to="/collection" onClick={onClose} className="gold-btn px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider">
                                    <i className="fa-solid fa-bookmark mr-1"></i> Lihat Koleksi
                                </Link>
                                <button onClick={onClose} className="ff-outline-btn px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider">
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
