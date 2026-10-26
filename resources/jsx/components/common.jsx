import { useEffect, useState } from 'react';
import { RANK_ICON, POS_STYLE, cardOf, imgSrc } from '../utils/game';
import { codeFor, flagUrl } from '../utils/countries';
import { FlashbackPlayerCard } from './FlashbackPlayerCard';
import { HalloweenPlayerCard } from './HalloweenPlayerCard';
import { UclPlayerCard } from './UclPlayerCard';
import { UelPlayerCard } from './UelPlayerCard';
import { UeclPlayerCard } from './UeclPlayerCard';

export function CountryFlag({ code, className = 'w-[20px] h-[14px]' }) {
    // Coba w40 → w20 (kegagalan transien tidak langsung menghilangkan bendera).
    // Semua gagal → lencana kode negara (tetap informatif, tidak kosong).
    const [step, setStep] = useState(0);
    if (!code) return null;
    if (step >= 2) {
        return (
            <span title={code} className={`${className} rounded-[3px] bg-midnight-700 border border-midnight-400/40 text-midnight-200 text-[8px] font-black flex items-center justify-center shrink-0 px-0.5`}>
                {String(code).slice(0, 2).toUpperCase()}
            </span>
        );
    }
    const w = step === 0 ? 40 : 20;
    return (
        <img
            src={flagUrl(code, w)}
            srcSet={step === 0 ? `${flagUrl(code, 80)} 2x` : undefined}
            alt={code}
            title={code}
            loading="lazy"
            onError={() => setStep((s) => s + 1)}
            className={`${className} rounded-[3px] object-cover shadow shrink-0 bg-midnight-800`}
        />
    );
}

export function RankBadge({ rank }) {
    // Badge POTW tampil sebagai penghargaan: ★ POTW (bukan rank reguler).
    if (rank === 'potw') {
        return (
            <span className="rank-badge potw">
                <i className="fa-solid fa-star text-[9px]"></i> ★ POTW
            </span>
        );
    }
    // Badge Flashback: kartu spesial midnight-blue (bukan rank reguler).
    if (rank === 'flashback') {
        return (
            <span className="rank-badge flashback">
                <i className="fa-solid fa-bolt text-[9px]"></i> Flashback
            </span>
        );
    }
    // Badge Halloween: kartu spesial event (ungu malam + hijau racun).
    if (rank === 'halloween') {
        return (
            <span className="rank-badge halloween">
                <i className="fa-solid fa-ghost text-[9px]"></i> Halloween
            </span>
        );
    }
    // Badge UCL: kartu spesial Champions League (navy + cyan).
    if (rank === 'ucl') {
        return (
            <span className="rank-badge ucl">
                <i className="fa-solid fa-trophy text-[9px]"></i> UCL
            </span>
        );
    }
    // Badge UEL: kartu spesial Europa League (hitam + oranye).
    if (rank === 'uel') {
        return (
            <span className="rank-badge uel">
                <i className="fa-solid fa-medal text-[9px]"></i> UEL
            </span>
        );
    }
    // Badge UECL: kartu spesial Conference League (hitam-hijau neon).
    // Sengaja dibedakan signifikan dari POTW (ikon award + label UECL).
    if (rank === 'uecl') {
        return (
            <span className="rank-badge uecl">
                <i className="fa-solid fa-award text-[9px]"></i> UECL
            </span>
        );
    }
    return (
        <span className={`rank-badge ${rank}`}>
            <i className={`fa-solid ${RANK_ICON[rank]} text-[9px]`}></i> {rank}
        </span>
    );
}

export function OvrBadge({ ovr, size = 'md' }) {
    const cls =
        size === 'lg'
            ? 'px-5 py-2 text-2xl'
            : 'px-3 py-1 text-sm';
    return (
        <div className={`ovr-badge ${cls} rounded-xl inline-flex items-center gap-1.5 shadow-lg`}>
            <i className="fa-solid fa-star text-[10px]"></i>
            <span className="font-display font-extrabold">{ovr}</span>
        </div>
    );
}

export function FootBadge({ foot, size = 'md' }) {
    // Badge kaki utama: tiap jenis kaki punya warna + ikon sendiri (lihat .foot-badge di app.css).
    // Kiri = sepatu biru, Kanan = sepatu hijau dicerminkan, Dua kaki = ikon shuffle emas.
    const f = String(foot || 'right').toLowerCase();
    const meta =
        f === 'left'
            ? { cls: 'foot-left', label: 'Kiri', icon: <i className="fa-solid fa-shoe-prints"></i> }
            : f === 'both'
              ? { cls: 'foot-both', label: 'Dua kaki', icon: <i className="fa-solid fa-shuffle"></i> }
              : { cls: 'foot-right', label: 'Kanan', icon: <i className="fa-solid fa-shoe-prints foot-mirror"></i> };
    return (
        <span className={`foot-badge ${meta.cls}${size === 'xs' ? ' xs' : ''}`} title={`Kaki utama: ${meta.label}`}>
            {meta.icon} {meta.label}
        </span>
    );
}

export function PlayerAvatar({ player, className = 'w-full h-full' }) {
    const src = imgSrc(player);
    if (src) return <img src={src} alt={player.name} className={`${className} object-cover object-top`} />;
    return (
        <div className={`${className} flex items-center justify-center text-5xl text-midnight-400/40 bg-midnight-950`}>
            <i className="fa-solid fa-user"></i>
        </div>
    );
}

export function PlayerCard({ player, onClick, footer }) {
    const card = cardOf(player);
    // Kartu Flashback memakai komponen portrait khusus (midnight blue + panah diagonal).
    if (card === 'flashback') {
        return <FlashbackPlayerCard player={player} onClick={onClick} />;
    }
    // Kartu Halloween memakai kulit event (hitam-ungu + labu oranye).
    if (card === 'halloween') {
        return <HalloweenPlayerCard player={player} onClick={onClick} footer={footer} />;
    }
    // Kartu UCL memakai komponen perisai khusus (navy starball + bingkai ungu-cyan).
    if (card === 'ucl') {
        return <UclPlayerCard player={player} onClick={onClick} footer={footer} />;
    }
    // Kartu UEL memakai kulit Europa (hitam-oranye garis diagonal).
    if (card === 'uel') {
        return <UelPlayerCard player={player} onClick={onClick} footer={footer} />;
    }
    // Kartu UECL memakai kulit Conference (hitam-hijau gelombang neon,
    // dibedakan signifikan dari POTW yang hijau terang datar).
    if (card === 'uecl') {
        return <UeclPlayerCard player={player} onClick={onClick} footer={footer} />;
    }
    return (
        <div
            onClick={onClick}
            className={`ff-card hoverable rank-${card} rounded-3xl overflow-hidden group flex flex-col cursor-pointer`}
        >
            <div className="relative h-60 overflow-hidden bg-midnight-950">
                <div className="pc-photo w-full h-full group-hover:scale-105 transition duration-500">
                    <PlayerAvatar player={player} />
                </div>
                <div className="pc-fade absolute inset-0 bg-gradient-to-t from-[#050b1a] via-transparent to-black/40 pointer-events-none"></div>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-midnight-950/85 backdrop-blur-md border border-midnight-400/45 shadow-lg">
                    <span className="font-display font-bold text-midnight-200 text-sm">#{player.shirt_number}</span>
                </div>
                <div className="absolute top-3 left-3">
                    <OvrBadge ovr={player.ovr} />
                </div>
                <div className="absolute bottom-3 left-3">
                    <RankBadge rank={card} />
                </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                            <h2 className="font-display text-base font-bold text-white group-hover:text-midnight-200 transition truncate">
                                {player.name}
                            </h2>
                            <div className="mt-1.5">
                                <FootBadge foot={player?.preferred_foot} size="xs" />
                            </div>
                        </div>
                        <div className="shrink-0 pt-0.5">
                            <span
                                className={`px-2.5 py-0.5 rounded-lg bg-gradient-to-r ${POS_STYLE[player.position] || POS_STYLE.MF} border text-[10px] font-extrabold tracking-wider`}
                            >
                                {player.position}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-midnight-300 flex items-center gap-2">
                        <i className="fa-solid fa-shield-halved text-midnight-400/70 text-[10px]"></i>
                        <span className="truncate">{player.club}</span>
                    </p>
                </div>
                {footer ?? (
                    <div className="pt-3 border-t border-midnight-400/15 flex items-center justify-between text-xs text-midnight-300">
                        <span className="flex items-center gap-1.5 truncate">
                            <CountryFlag code={codeFor(player)} />
                            <span className="truncate">{player.nationality || '—'}</span>
                        </span>
                        <span className="text-midnight-200 font-semibold flex items-center gap-1 text-[11px] shrink-0">
                            Lihat Stats <i className="fa-solid fa-chevron-right text-[9px]"></i>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export function StatRow({ label, value, weight }) {
    return (
        <div className="bg-midnight-950/60 p-3 rounded-xl border border-midnight-700/60">
            <div className="flex justify-between text-xs mb-1.5">
                <span className="text-midnight-300 font-medium">{label}</span>
                <div className="flex items-center gap-2">
                    {weight != null && (
                        <span className="text-midnight-400 text-[10px] font-bold">{Math.round(weight * 100)}%</span>
                    )}
                    <span className="text-midnight-200 font-bold">{value}</span>
                </div>
            </div>
            <div className="w-full bg-midnight-800 h-2 rounded-full overflow-hidden">
                <div
                    className="bg-gradient-to-r from-midnight-600 via-midnight-400 to-midnight-300 h-full rounded-full"
                    style={{ width: `${value}%` }}
                ></div>
            </div>
        </div>
    );
}

export function Modal({ open, onClose, children, maxWidth = 'max-w-2xl', label }) {
    // Hook selalu dipanggil dalam urutan yang sama; efek aktif hanya saat terbuka.
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md modal-anim">
            <div
                role="dialog"
                aria-modal="true"
                aria-label={label || 'Dialog'}
                className={`ff-card ff-modal-pop rounded-3xl w-full ${maxWidth} max-h-[90vh] max-h-[90dvh] overflow-y-auto p-5 sm:p-6 md:p-8 relative shadow-2xl`}
            >
                <button
                    onClick={onClose}
                    aria-label="Tutup dialog"
                    className="absolute top-4 right-4 sm:top-5 sm:right-5 w-10 h-10 rounded-full bg-midnight-950/90 border border-midnight-400/30 text-midnight-300 hover:text-midnight-100 hover:border-midnight-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-400/70 flex items-center justify-center transition z-10"
                >
                    <i className="fa-solid fa-xmark"></i>
                </button>
                {children}
            </div>
        </div>
    );
}

export function EmptyState({ icon = 'fa-user-slash', title, subtitle, action }) {
    return (
        <div className="text-center py-12 sm:py-16 ff-card rounded-3xl max-w-lg mx-auto my-6 sm:my-8 px-6">
            <div className="w-16 h-16 rounded-2xl bg-midnight-800/80 border border-midnight-400/30 flex items-center justify-center mx-auto text-midnight-300 text-2xl mb-4">
                <i className={`fa-solid ${icon} w-6 text-center`}></i>
            </div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-white mb-1 text-balance">{title}</h3>
            {subtitle && <p className="text-xs text-midnight-300 max-w-xs mx-auto text-pretty">{subtitle}</p>}
            {action && <div className="mt-5 flex justify-center">{action}</div>}
        </div>
    );
}

export function StatWidget({ icon, label, value, accent = 'text-white' }) {
    return (
        <div className="ff-card p-3.5 sm:p-4 rounded-2xl flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-midnight-800/80 border border-midnight-400/30 flex items-center justify-center text-midnight-300 text-lg sm:text-xl shrink-0">
                <i className={`fa-solid ${icon} w-5 text-center`}></i>
            </div>
            <div className="min-w-0">
                <span className="text-[10px] text-midnight-300 uppercase font-semibold tracking-wider">{label}</span>
                <h3 className={`text-xl sm:text-2xl font-bold font-display truncate tabular-nums ${accent}`}>{value}</h3>
            </div>
        </div>
    );
}
