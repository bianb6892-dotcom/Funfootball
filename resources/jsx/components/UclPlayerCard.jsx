import { OvrBadge, RankBadge, FootBadge, PlayerAvatar, CountryFlag } from './common';
import { POS_STYLE } from '../utils/game';
import { codeFor } from '../utils/countries';

/**
 * UclPlayerCard — template & ukuran IDENTIK kartu reguler (PlayerCard).
 * Pembeda hanya KULIT UCL: dasar navy starball + pola titik bintang +
 * emblem lingkaran bintang + aksen bintang + bingkai cyan + kilau menyapu.
 * Murni presentasional: seluruh data pemain masuk lewat props.
 *
 * @param {object} player  Data pemain (sama seperti PlayerCard).
 * @param {function} [onClick]  Opsional — klik kartu.
 * @param {ReactNode} [footer]  Opsional — ganti baris bawah default.
 * @param {string} [className]  Kelas tambahan.
 */
export function UclPlayerCard({ player = {}, onClick, footer, className = '' }) {
    return (
        <div
            onClick={onClick}
            className={`ff-card hoverable rank-ucl rounded-3xl overflow-hidden group flex flex-col cursor-pointer ${className}`}
        >
            <div className="relative h-60 overflow-hidden bg-midnight-950">
                <div className="pc-photo w-full h-full group-hover:scale-105 transition duration-500">
                    <PlayerAvatar player={player} />
                </div>
                <div className="pc-fade absolute inset-0 bg-gradient-to-t from-[#050b1a] via-transparent to-black/40 pointer-events-none"></div>
                {/* Aksen bintang khas UCL di area foto. */}
                <span className="ucl-twinkle ucl-t1" aria-hidden="true">★</span>
                <span className="ucl-twinkle ucl-t2" aria-hidden="true">★</span>
                <span className="ucl-twinkle ucl-t3" aria-hidden="true">★</span>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-midnight-950/85 backdrop-blur-md border border-midnight-400/45 shadow-lg">
                    <span className="font-display font-bold text-midnight-200 text-sm">#{player.shirt_number}</span>
                </div>
                <div className="absolute top-3 left-3">
                    <OvrBadge ovr={player.ovr} />
                </div>
                <div className="absolute bottom-3 left-3">
                    <RankBadge rank="ucl" />
                </div>
                <div className="absolute bottom-3 right-3 ucl-ball" title="UEFA Champions League" aria-hidden="true">
                    ★
                </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between gap-3 ucl-lower">
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
                        <span className="ucl-star-b ucl-b1 self-center" aria-hidden="true">★</span>
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
                        <span className="ucl-star-b ucl-b2" aria-hidden="true">★</span>
                        <span className="text-midnight-200 font-semibold flex items-center gap-1 text-[11px] shrink-0">
                            Lihat Stats <i className="fa-solid fa-chevron-right text-[9px]"></i>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
