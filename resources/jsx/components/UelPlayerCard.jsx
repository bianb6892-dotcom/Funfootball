import { OvrBadge, RankBadge, FootBadge, PlayerAvatar, CountryFlag } from './common';
import { POS_STYLE } from '../utils/game';
import { codeFor } from '../utils/countries';

/**
 * UelPlayerCard — template & ukuran IDENTIK kartu reguler (PlayerCard) & UCL.
 * Kulit UEL (Europa League, sesuai referensi): dasar hitam-coklat pekat +
 * garis diagonal oranye bertingkat di area foto + horizon glow oranye di
 * badan bawah + bingkai oranye + kilau menyapu oranye.
 * Murni presentasional: seluruh data pemain masuk lewat props.
 *
 * @param {object} player  Data pemain (sama seperti PlayerCard).
 * @param {function} [onClick]  Opsional — klik kartu.
 * @param {ReactNode} [footer]  Opsional — ganti baris bawah default.
 * @param {string} [className]  Kelas tambahan.
 */
export function UelPlayerCard({ player = {}, onClick, footer, className = '' }) {
    return (
        <div
            onClick={onClick}
            className={`ff-card hoverable rank-uel rounded-3xl overflow-hidden group flex flex-col cursor-pointer ${className}`}
        >
            <div className="relative h-60 overflow-hidden bg-midnight-950">
                <div className="pc-photo w-full h-full group-hover:scale-105 transition duration-500">
                    <PlayerAvatar player={player} />
                </div>
                <div className="pc-fade absolute inset-0 bg-gradient-to-t from-[#050b1a] via-transparent to-black/40 pointer-events-none"></div>
                {/* Lapisan garis diagonal Europa (CSS, di atas foto). */}
                <span className="uel-lines" aria-hidden="true"></span>
                <span className="uel-glow-line" aria-hidden="true"></span>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-midnight-950/85 backdrop-blur-md border border-midnight-400/45 shadow-lg">
                    <span className="font-display font-bold text-midnight-200 text-sm">#{player.shirt_number}</span>
                </div>
                <div className="absolute top-3 left-3">
                    <OvrBadge ovr={player.ovr} />
                </div>
                <div className="absolute bottom-3 left-3">
                    <RankBadge rank="uel" />
                </div>
                <div className="absolute bottom-3 right-3 uel-ball" title="UEFA Europa League" aria-hidden="true">
                    &#9670;
                </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between gap-3 uel-lower">
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
                        <span className="uel-star-b uel-b1 self-center" aria-hidden="true">&#9670;</span>
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
                        <span className="uel-star-b uel-b2" aria-hidden="true">&#9670;</span>
                        <span className="text-midnight-200 font-semibold flex items-center gap-1 text-[11px] shrink-0">
                            Lihat Stats <i className="fa-solid fa-chevron-right text-[9px]"></i>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
