import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { OvrBadge, RankBadge } from '../../components/common';
import { POS_STYLE, RANK_ICON, errMsg, timeID } from '../../utils/game';
import { codeFor, flagFallbackUrls } from '../../utils/countries';

export const PACK_STYLE = {
    bronze: { icon: 'fa-box', box: 'from-amber-700 to-amber-900 border-amber-500/40', text: 'text-white', badge: null },
    silver: { icon: 'fa-box', box: 'from-slate-400 to-slate-700 border-slate-300/40', text: 'text-white', badge: null },
    gold: { icon: 'fa-box-open', box: 'from-gold-400 to-gold-600 border-gold-300/60', text: 'text-gold-300', badge: 'HOT', pulse: true },
    diamond: { icon: 'fa-gem', box: 'from-violet-400 via-purple-600 to-purple-900 border-purple-300/60', text: 'text-purple-200', badge: 'ELITE', pulse: true },
    potw: { icon: 'fa-star', box: 'from-[#59C749] to-[#1e6b15] border-[#59C749]/60', text: 'text-[#7ee86a]', badge: 'POTW ★', pulse: true },
    halloween: { icon: 'fa-ghost', box: 'from-[#3b1454] to-[#0a1a12] border-lime-300/60', text: 'text-lime-200', badge: 'HALLOWEEN', pulse: true },
    ucl: { icon: 'fa-trophy', box: 'from-[#101d68] to-[#060b30] border-cyan-300/60', text: 'text-cyan-200', badge: 'UCL', pulse: true },
    uel: { icon: 'fa-medal', box: 'from-[#7c2d12] to-[#140800] border-orange-300/60', text: 'text-orange-200', badge: 'UEL', pulse: true },
    uecl: { icon: 'fa-award', box: 'from-[#022c1c] to-[#010b06] border-emerald-300/60', text: 'text-emerald-200', badge: 'UECL', pulse: true },
};
// Pack buatan admin (slug bebas) memakai gaya netral + banner bila ada.
export const PACK_FALLBACK = { icon: 'fa-box-open', box: 'from-midnight-600 to-midnight-800 border-midnight-400/40', text: 'text-white', badge: null };

export function Gacha() {
    const { refresh } = useAuth();
    const toast = useToast();
    const [packs, setPacks] = useState([]);
    const [history, setHistory] = useState([]);
    const [opening, setOpening] = useState(null); // pack slug being opened
    const [result, setResult] = useState(null);
    const [stage, setStage] = useState(0); // reveal satu-per-satu: 0 bendera → 1 club → 2 posisi → 3 OVR+nama

    // Rank single-pull saat ini (untuk mematikan animasi bronze/silver).
    const singleRank = result && !result.players ? (result.player?.card || result.rank_rolled) : null;
    const singleAnimated = singleRank !== 'bronze' && singleRank !== 'silver';

    // Tahapan reveal ala FC Mobile, satu per satu dengan jeda 2.2s agar
    // tiap transisi (1.1s) selesai penuh sebelum tahap berikut mulai.
    // Bronze/silver: langsung tampil semua tanpa animasi & tanpa timer.
    useEffect(() => {
        if (!result || result.players) {
            setStage(0);
            return;
        }
        if (!singleAnimated) {
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
    }, [result, singleAnimated]);

    const load = async () => {
        const [{ data: p }, { data: h }] = await Promise.all([api.packs(), api.gachaHistory()]);
        setPacks(p);
        setHistory(h.data || h);
    };

    useEffect(() => {
        load().catch(() => {});
    }, []);

    const openPack = async (pack, count = 1) => {
        setOpening(pack);
        setResult(null);
        try {
            const { data } = await api.draw(pack.slug, count);
            setTimeout(() => {
                setOpening(null);
                setResult({ ...data, pack, count, nonce: Date.now() });
                refresh();
                load().catch(() => {});
            }, 2600);
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-5 items-stretch">
                {packs.map((pack) => {
                    const st = PACK_STYLE[pack.slug] || PACK_FALLBACK;
                    const badgeCls = pack.slug === 'gold'
                        ? 'bg-gold-500 text-midnight-950'
                        : pack.slug === 'potw'
                            ? 'bg-[#59C749] text-midnight-950'
                            : 'bg-cyan-400 text-midnight-950';
                    return (
                        <div key={pack.id} className="pack-card min-w-0">
                            <div className="pack-inner p-5 pb-4 text-center">
                                {st.badge && (
                                    <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-black z-10 ${badgeCls}`}>
                                        {st.badge}
                                    </div>
                                )}
                                {pack.banner_url ? (
                                    <img src={pack.banner_url} alt={pack.name} className={`w-full h-28 rounded-2xl object-cover border shadow-lg ${st.pulse ? 'pack-pulse' : ''}`} loading="lazy" />
                                ) : (
                                <div className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center bg-gradient-to-br ${st.box} border shadow-lg shrink-0 ${st.pulse ? 'pack-pulse' : ''}`}>
                                    <i className={`fa-solid ${st.icon} text-3xl ${pack.slug === 'gold' ? 'text-midnight-950' : 'text-white'}`}></i>
                                </div>
                                )}
                                <div className="min-h-[3.5rem] flex flex-col items-center justify-center mt-3 px-8">
                                    <h3 className={`font-display font-bold text-lg leading-tight ${st.text === 'text-white' ? 'text-white' : st.text}`}>
                                        {pack.name}
                                    </h3>
                                    {pack.slug === 'potw' && (
                                        <p className="text-[10px] text-[#7ee86a] leading-tight mt-0.5">Hanya pemain ★ POTW</p>
                                    )}
                                    {Array.isArray(pack.allowed_ranks) && pack.allowed_ranks.length > 0 && pack.slug !== 'potw' && (
                                        <p className="text-[10px] text-midnight-300 leading-tight mt-0.5 capitalize">
                                            Isi: {pack.allowed_ranks.map((r) => (r === 'potw' ? '★ POTW' : r === 'flashback' ? 'Flashback' : r === 'halloween' ? 'Halloween' : r === 'ucl' ? 'UCL' : r === 'uel' ? 'UEL' : r === 'uecl' ? 'UECL' : r)).join(' · ')}
                                        </p>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-start space-y-1.5 text-[10px] text-midnight-300 mt-2 leading-relaxed">
                                    {Object.entries(pack.rates || {})
                                        .filter(([, v]) => v > 0)
                                        .map(([rank, v]) => (
                                            <div key={rank} className="flex justify-between gap-2 capitalize">
                                                <span className="truncate">{rank}</span>
                                                <span className="font-bold shrink-0">{v}%</span>
                                            </div>
                                        ))}
                                </div>
                                <div className="pack-buy">
                                    <button onClick={() => openPack(pack, 1)} className="coin-display px-2 py-2 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-bold hover:brightness-125 transition leading-tight">
                                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                            <i className="fa-solid fa-coins"></i>
                                            {Number(pack.price).toLocaleString('id-ID')}
                                        </span>
                                        <span className="opacity-70 text-[10px]">Gacha 1x</span>
                                    </button>
                                    <button onClick={() => openPack(pack, 5)} className="gold-btn px-2 py-2 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-bold transition leading-tight" title={`Gacha 5 sekaligus (${Number(pack.price * 5).toLocaleString('id-ID')} coins)`}>
                                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                            <i className="fa-solid fa-coins"></i>
                                            {Number(pack.price * 5).toLocaleString('id-ID')}
                                        </span>
                                        <span className="opacity-70 text-[10px]">Gacha 5x</span>
                                    </button>
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
                        <div className="relative">
                            <div className="fc-beams"></div>
                            {opening.banner_url ? (
                                <img src={opening.banner_url} alt={opening.name} className="w-64 h-36 mx-auto rounded-3xl object-cover border border-midnight-400/50 mb-6 relative fc-shake shadow-2xl" />
                            ) : (
                            <div className={`w-40 h-40 mx-auto rounded-3xl flex items-center justify-center text-6xl mb-6 relative fc-shake bg-gradient-to-br ${(PACK_STYLE[opening.slug] || PACK_FALLBACK).box} border border-midnight-400/50`}>
                                <i className={`fa-solid ${(PACK_STYLE[opening.slug] || PACK_FALLBACK).icon} text-white`}></i>
                            </div>
                            )}
                            <h2 className="font-display text-2xl font-black ff-gradient-text mb-2">MEMBUKA PACK...</h2>
                            <p className="text-[11px] tracking-[0.3em] uppercase text-midnight-300">Walkout loading</p>
                        </div>
                    )}
                    {result && (
                        <div>
                            {result.players ? (
                                <div>
                                    <h3 className="font-display text-2xl font-black ff-gradient-text mb-4">
                                        GACHA x{result.count} — {result.pack.name}
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-w-3xl mx-auto">
                                        {result.players.map((pl, i) => (
                                            <div key={pl.result_id} className={`p-3 rounded-2xl border rank-${pl.card || pl.rank_rolled || 'bronze'} text-center reveal-step`} style={{ animationDelay: `${i * 0.12}s` }}>
                                                <p className="text-xs font-bold text-white truncate">{pl.name}</p>
                                                <p className="text-[10px] text-midnight-200 font-semibold mb-2">OVR {pl.ovr}</p>
                                                <RankBadge rank={pl.card || pl.rank_rolled} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <RevealCard key={result.nonce} player={result.player} rank={result.player?.card || result.rank_rolled} stage={stage} animated={singleAnimated} onSkip={() => setStage(3)} />
                            )}
                            <div className="mt-6 space-y-3">
                                <p className="text-sm text-midnight-100">
                                    {result.players
                                        ? <>Mendapatkan {result.players.length} pemain — sisa coins: </>
                                        : <>Mendapatkan pemain <RankBadge rank={result.player?.card || result.rank_rolled} /> — sisa coins: </>}
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

/* Kartu reveal ala FC Mobile: bendera → club → posisi → OVR, satu per satu.
   - Semua elemen tetap mounted, visibilitas via .is-visible (transition GPU
     1.1s) sehingga tidak ada snap/re-mount dan layout tidak lompat.
   - Bronze/silver (animated=false): tanpa animasi, semua langsung tampil.
   - Bendera dijamin muncul via FlagImg (preload + fallback berlapis). */
export function RevealCard({ player, rank, stage = 3, animated = true, onSkip }) {
    const fill = stage === 0 ? '25%' : stage === 1 ? '50%' : stage === 2 ? '75%' : '100%';
    const isWalkout = animated && (rank === 'gold' || rank === 'diamond' || rank === 'legend' || rank === 'potw' || rank === 'flashback' || rank === 'halloween' || rank === 'ucl' || rank === 'uel' || rank === 'uecl');
    const showOvrCount = animated && stage >= 3;
    const ovr = useFcCountUp(player?.ovr || 0, showOvrCount, animated);
    const skippable = animated && stage < 3 && onSkip;

    const confettiColors =
        rank === 'diamond' ? ['#c4b5fd', '#ffffff', '#a78bfa', '#7c3aed']
        : rank === 'legend' ? ['#f7e7b4', '#ffffff', '#c9b37e', '#9aa0a8']
        : rank === 'gold' ? ['#f3c760', '#fff3b0', '#e6b631', '#ffffff']
        : rank === 'potw' ? ['#59C749', '#d6ffc9', '#ffffff', '#a5f09a']
        : rank === 'flashback' ? ['#5B7CFF', '#C5D0E8', '#ffffff', '#3157D5']
        : rank === 'halloween' ? ['#a3e635', '#4ade80', '#a855f7', '#3b1454']
        : rank === 'ucl' ? ['#22d3ee', '#a5f3fc', '#ffffff', '#101d68']
        : rank === 'uel' ? ['#fb923c', '#ffedd5', '#ffffff', '#7c2d12']
        : rank === 'uecl' ? ['#00ffa3', '#d1ffe8', '#ffffff', '#022c1c']
        : ['#7c8cff', '#b9c8f2', '#ffffff', '#5b7cff'];

    return (
        <div
            onClick={skippable ? onSkip : undefined}
            title={skippable ? 'Ketuk kartu untuk lewati animasi' : undefined}
            className={`${animated ? 'fc-walkout' : ''} max-w-[320px] mx-auto px-5 py-4 rounded-3xl border-2 relative rank-${rank} min-h-[380px] flex flex-col items-center justify-start overflow-hidden ${!animated ? 'fc-no-anim' : ''} ${skippable ? 'cursor-pointer' : ''}`}
        >
            {animated && <div className="fc-beams"></div>}
            {animated && <div className="fc-shine"></div>}
            {isWalkout && stage >= 3 && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <span
                            key={i}
                            className="fc-confetti"
                            style={{
                                left: `${6 + i * 9}%`,
                                background: confettiColors[i % confettiColors.length],
                                animationDelay: `${(i % 5) * 0.28}s`,
                                ['--drift']: `${(i % 2 === 0 ? 1 : -1) * (12 + (i * 7) % 30)}px`,
                            }}
                        />
                    ))}
                </div>
            )}

            <div className="relative z-10 flex flex-col items-center w-full">
                <div className="mb-1.5">
                    <RankBadge rank={rank} />
                </div>

                {/* STAGE 0 — Bendera / negara (selalu dirender agar tak ada kedip kosong) */}
                <div className={`gacha-flag-wrap flex flex-col items-center ${animated && stage >= 1 ? 'is-minimized' : ''}`}>
                    <div className={`fc-item from-left ${stage >= 0 ? 'is-visible' : ''} flex flex-col items-center`}>
                        <FlagImg player={player} compact />
                        <p className="text-[11px] text-midnight-100 font-bold mt-1.5 tracking-[0.25em] uppercase">{player.nationality || '—'}</p>
                    </div>
                </div>

                {/* Garis tipis */}
                <div className="w-32 h-px my-2 bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>

                {/* STAGE 1 — Club saja */}
                <div className="min-h-[28px] flex items-center justify-center w-full">
                    <div className={`fc-item from-right ${stage >= 1 ? 'is-visible' : ''} flex items-center gap-2`}>
                        <span className="text-[13px] text-white font-bold truncate">{player.club || '—'}</span>
                    </div>
                </div>

                {/* STAGE 2 — Posisi saja */}
                <div className="min-h-[32px] flex items-center justify-center w-full">
                    <div className={`fc-item from-left ${stage >= 2 ? 'is-visible' : ''} flex items-center gap-2`}>
                        <span className={`px-3 py-0.5 rounded-lg bg-gradient-to-r ${POS_STYLE[player.position] || POS_STYLE.MF} border font-bold text-[11px] uppercase tracking-widest`}>
                            {player.position || '—'}
                        </span>
                    </div>
                </div>

                {/* STAGE 3 — OVR + nama sebaris */}
                <div className="min-h-[96px] flex items-start justify-center w-full">
                    <div className={`fc-item ${stage >= 3 ? 'is-visible' : ''} flex flex-col items-center`}>
                        <div className="flex items-end gap-1.5">
                            <span className={`${animated ? 'fc-ovr-pop' : ''} font-display text-5xl font-black text-white leading-none tabular-nums`}>{ovr}</span>
                            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-midnight-200 pb-1.5">OVR</span>
                        </div>
                        <h3 className="font-display text-xl font-black text-white mt-1 text-center leading-tight truncate max-w-[260px]">{player.name}</h3>
                        <p className="text-[11px] text-midnight-200 font-semibold">#{player.shirt_number}</p>
                    </div>
                </div>

                {/* Progress bar saja */}
                <div className="w-full mt-2 select-none">
                    <div className="gacha-stage-track h-[3px] rounded-full bg-white/10 overflow-hidden">
                        <div className="gacha-stage-fill h-full rounded-full bg-gradient-to-r from-midnight-400 via-white to-gold-300" style={{ width: fill }}></div>
                    </div>
                    {skippable && (
                        <p className="text-[9px] text-midnight-300 mt-1.5 animate-pulse">Ketuk untuk lewati…</p>
                    )}
                </div>
            </div>
        </div>
    );
}

/* Bendera anti-gagal: preload + fallback w160→w80→w40 + placeholder kode
   negara sehingga gambar tidak pernah kosong/kedip. */
function FlagImg({ player, compact = false }) {
    const code = codeFor(player);
    const urls = flagFallbackUrls(code);
    const [idx, setIdx] = useState(0);
    useEffect(() => { setIdx(0); }, [code]);
    useEffect(() => {
        urls.forEach((u) => { const im = new Image(); im.src = u; });
    }, [urls.join('|')]);
    const sizeCls = compact ? 'w-24 h-[60px]' : 'w-32 h-20';
    if (!urls.length || idx >= urls.length) {
        return (
            <div className={`fc-flag-img relative ${sizeCls} rounded-xl border border-white/20 flex flex-col items-center justify-center gap-1 bg-midnight-800`}>
                <i className="fa-solid fa-flag text-midnight-300 text-xl"></i>
                <span className="text-[10px] font-black tracking-[0.2em] text-white">{String(code || '—').toUpperCase()}</span>
            </div>
        );
    }
    return (
        <img
            src={urls[idx]}
            onError={() => setIdx((i) => i + 1)}
            alt={player?.nationality || code || 'flag'}
            draggable={false}
            width={compact ? 96 : 128}
            height={compact ? 60 : 80}
            className={`fc-flag-img relative ${sizeCls} rounded-xl object-cover border border-white/20`}
        />
    );
}

/* OVR counting ala FC Mobile: 65 → target dalam ~2s dengan easeOutExpo via rAF.
   rAF membuat angka naik mulus setiap frame, bukan lompat per detik.
   Bronze/silver (animated=false): langsung angka final tanpa counting. */
function useFcCountUp(target, active, animated = true) {
    const finalVal = Number(target) || 0;
    const [val, setVal] = useState(animated ? 65 : finalVal);
    const raf = useRef(0);
    useEffect(() => {
        if (!animated) {
            setVal(finalVal);
            return;
        }
        if (!active) {
            setVal(65);
            return;
        }
        const from = 65;
        const to = Number(target) || 65;
        if (to <= from) {
            setVal(to);
            return;
        }
        const dur = 2000;
        const t0 = performance.now();
        const tick = (now) => {
            const p = Math.min(1, (now - t0) / dur);
            const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p); // easeOutExpo
            setVal(Math.round(from + (to - from) * eased));
            if (p < 1) raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [target, active, animated, finalVal]);
    return val;
}

export { RANK_ICON };
