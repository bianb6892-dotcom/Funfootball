import { OvrBadge, RankBadge, FootBadge, PlayerAvatar, CountryFlag } from './common';
import { POS_STYLE } from '../utils/game';
import { codeFor } from '../utils/countries';

/**
 * HalloweenPlayerCard — struktur, ukuran, dan komposisi IDENTIK kartu reguler
 * (PlayerCard) serta UCL/UEL/UECL. Hanya KULIT visual yang berbeda:
 * dasar hitam-ungu pekat + kabut racun hijau + bintang halus, bulan sabit,
 * sarang laba-laba, kelelawar, dan laba-laba menggantung di area foto;
 * emblem kuali (cauldron) di sudut serta aksen hijau limau di badan bawah.
 * Sengaja TANPA oranye diagonal/horizon seperti UEL agar mudah dibedakan.
 * Seluruh data pemain tetap masuk lewat props yang sama.
 *
 * @param {object} player  Data pemain (sama seperti PlayerCard).
 * @param {function} [onClick]  Opsional — klik kartu.
 * @param {ReactNode} [footer]  Opsional — ganti baris bawah default.
 * @param {string} [className]  Kelas tambahan.
 */
export function HalloweenPlayerCard({ player = {}, onClick, footer, className = '' }) {
    return (
        <div
            onClick={onClick}
            className={`ff-card hoverable rank-halloween rounded-3xl overflow-hidden group flex flex-col cursor-pointer ${className}`}
        >
            <div className="relative h-60 overflow-hidden bg-midnight-950">
                <div className="pc-photo w-full h-full group-hover:scale-105 transition duration-500">
                    <PlayerAvatar player={player} />
                </div>
                <div className="pc-fade absolute inset-0 bg-gradient-to-t from-[#120722] via-transparent to-black/40 pointer-events-none"></div>
                {/* Ornamen Halloween: bintang, sarang laba-laba (kiri atas & kanan bawah), kelelawar, dan laba-laba. */}
                <span className="hw-stars" aria-hidden="true"></span>
                <span className="hw-web hw-web-tl" aria-hidden="true">
                    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1">
                        <circle cx="64" cy="64" r="18"></circle>
                        <circle cx="64" cy="64" r="32"></circle>
                        <circle cx="64" cy="64" r="48"></circle>
                        <path d="M64 64 0 0M64 64 0 22M64 64 0 44M64 64 22 0M64 64 44 0"></path>
                    </svg>
                </span>
                <span className="hw-web hw-web-br" aria-hidden="true">
                    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1">
                        <circle cx="64" cy="64" r="18"></circle>
                        <circle cx="64" cy="64" r="32"></circle>
                        <circle cx="64" cy="64" r="48"></circle>
                        <path d="M64 64 0 0M64 64 0 22M64 64 0 44M64 64 22 0M64 64 44 0"></path>
                    </svg>
                </span>
                <span className="hw-bats" aria-hidden="true">
                    <svg className="hw-bat hw-bat-1" viewBox="0 0 24 20">
                        <path d="M12 4c-.8 0-1.5.6-1.8 1.4-.9-.6-2-.9-3.2-1.1.5 1.1.5 2.2 0 3.3 1.3.2 2.4.8 3.2 1.7-.9 1.1-2.2 1.8-3.7 2 1.1 1.4 2.6 2.3 4.3 2.6L12 17l1.2-3.1c1.7-.3 3.2-1.2 4.3-2.6-1.5-.2-2.8-.9-3.7-2 .8-.9 1.9-1.5 3.2-1.7-.5-1.1-.5-2.2 0-3.3-1.2.2-2.3.5-3.2 1.1C13.5 4.6 12.8 4 12 4z" />
                    </svg>
                    <svg className="hw-bat hw-bat-2" viewBox="0 0 24 20">
                        <path d="M12 4c-.8 0-1.5.6-1.8 1.4-.9-.6-2-.9-3.2-1.1.5 1.1.5 2.2 0 3.3 1.3.2 2.4.8 3.2 1.7-.9 1.1-2.2 1.8-3.7 2 1.1 1.4 2.6 2.3 4.3 2.6L12 17l1.2-3.1c1.7-.3 3.2-1.2 4.3-2.6-1.5-.2-2.8-.9-3.7-2 .8-.9 1.9-1.5 3.2-1.7-.5-1.1-.5-2.2 0-3.3-1.2.2-2.3.5-3.2 1.1C13.5 4.6 12.8 4 12 4z" />
                    </svg>
                    <svg className="hw-bat hw-bat-3" viewBox="0 0 24 20">
                        <path d="M12 4c-.8 0-1.5.6-1.8 1.4-.9-.6-2-.9-3.2-1.1.5 1.1.5 2.2 0 3.3 1.3.2 2.4.8 3.2 1.7-.9 1.1-2.2 1.8-3.7 2 1.1 1.4 2.6 2.3 4.3 2.6L12 17l1.2-3.1c1.7-.3 3.2-1.2 4.3-2.6-1.5-.2-2.8-.9-3.7-2 .8-.9 1.9-1.5 3.2-1.7-.5-1.1-.5-2.2 0-3.3-1.2.2-2.3.5-3.2 1.1C13.5 4.6 12.8 4 12 4z" />
                    </svg>
                </span>
                <span className="hw-spider" aria-hidden="true">
                    <svg viewBox="0 0 24 42">
                        <path d="M12 0v20" stroke="currentColor" strokeWidth="1" opacity="0.75" />
                        <ellipse cx="12" cy="27" rx="5.2" ry="4.2" fill="currentColor" />
                        <circle cx="12" cy="32.6" r="2.5" fill="currentColor" />
                        <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none">
                            <path d="M7 25.5c-3 -1 -4 -3.4 -4.4 -5.6" />
                            <path d="M17 25.5c3 -1 4 -3.4 4.4 -5.6" />
                            <path d="M7 29.5c-3.2 .4 -4.8 1.8 -5.8 3.8" />
                            <path d="M17 29.5c3.2 .4 4.8 1.8 5.8 3.8" />
                            <path d="M8 33.5c-2.4 1.4 -3.4 3 -3.8 5.2" />
                            <path d="M16 33.5c2.4 1.4 3.4 3 3.8 5.2" />
                        </g>
                    </svg>
                </span>
                <span className="hw-fog" aria-hidden="true"></span>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-midnight-950/85 backdrop-blur-md border border-midnight-400/45 shadow-lg">
                    <span className="font-display font-bold text-midnight-200 text-sm">#{player.shirt_number}</span>
                </div>
                <div className="absolute top-3 left-3">
                    <OvrBadge ovr={player.ovr} />
                </div>
                <div className="absolute bottom-3 left-3">
                    <RankBadge rank="halloween" />
                </div>
                <div className="absolute bottom-3 right-3 hw-pumpkin" title="Halloween" aria-hidden="true">
                    <svg viewBox="0 0 40 40">
                        <path d="M20.6 10.4c-.2-1.8.4-3.2 1.9-4" stroke="#84cc16" strokeWidth="2" fill="none" strokeLinecap="round" />
                        <ellipse cx="20" cy="23" rx="13" ry="11" fill="#f97316" />
                        <ellipse cx="12.6" cy="23" rx="5.4" ry="10.2" fill="#ea580c" />
                        <ellipse cx="27.4" cy="23" rx="5.4" ry="10.2" fill="#ea580c" />
                        <ellipse cx="20" cy="23" rx="6" ry="10.4" fill="#fb923c" />
                        <path d="M9.6 18.6l8.2 2.6-2.3 4.2z" fill="#1a0b2e" />
                        <path d="M30.4 18.6l-8.2 2.6 2.3 4.2z" fill="#1a0b2e" />
                        <path d="M12.2 20l4.8 1.5-1.2 2.1z" fill="#a3e635" />
                        <path d="M27.8 20l-4.8 1.5 1.2 2.1z" fill="#a3e635" />
                        <path d="M20 24.6l1.6 2.5h-3.2z" fill="#c2410c" />
                        <path d="M11.8 27.4c2.8 4.8 13.6 4.8 16.4 0-1.4 6.6-15 6.6-16.4 0z" fill="#1a0b2e" />
                        <path d="M14.4 28.9l1.7 2.9.9-3.2z" fill="#fb923c" />
                        <path d="M25.6 28.9l-1.7 2.9-.9-3.2z" fill="#fb923c" />
                        <path d="M19 29.4l1 2.8 1-2.8z" fill="#fb923c" />
                    </svg>
                </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between gap-3 hw-lower">
                <span className="hw-lower-web" aria-hidden="true">
                    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1">
                        <circle cx="0" cy="64" r="18"></circle>
                        <circle cx="0" cy="64" r="32"></circle>
                        <circle cx="0" cy="64" r="48"></circle>
                        <path d="M0 64 64 0M0 64 64 22M0 64 64 44M0 64 22 0M0 64 44 0"></path>
                    </svg>
                </span>
                <span className="hw-lower-ghost" aria-hidden="true">
                    <i className="fa-solid fa-ghost"></i>
                </span>
                <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                            <h2 className="font-display text-base font-bold text-white group-hover:text-lime-200 transition truncate">
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
                        <i className="fa-solid fa-shield-halved text-lime-300/70 text-[10px]"></i>
                        <span className="truncate">{player.club}</span>
                    </p>
                </div>
                {footer ?? (
                    <div className="pt-3 border-t border-lime-300/20 flex items-center justify-between text-xs text-midnight-300">
                        <span className="flex items-center gap-1.5 truncate">
                            <CountryFlag code={codeFor(player)} />
                            <span className="truncate">{player.nationality || '—'}</span>
                        </span>
                        <span className="text-lime-200 font-semibold flex items-center gap-1 text-[11px] shrink-0">
                            Lihat Stats <i className="fa-solid fa-chevron-right text-[9px]"></i>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
