import { RANK_ICON, POS_STYLE, imgSrc } from '../utils/game';
import { flagUrl } from '../utils/countries';

export function CountryFlag({ code, className = 'w-[20px] h-[14px]' }) {
    if (!code) return null;
    return (
        <img
            src={flagUrl(code, 40)}
            srcSet={`${flagUrl(code, 80)} 2x`}
            alt={code}
            title={code}
            loading="lazy"
            onError={(e) => {
                e.currentTarget.style.display = 'none';
            }}
            className={`${className} rounded-[3px] object-cover shadow shrink-0`}
        />
    );
}

export function RankBadge({ rank }) {
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
    return (
        <div
            onClick={onClick}
            className={`ff-card hoverable rank-${player.rank} rounded-3xl overflow-hidden group flex flex-col cursor-pointer`}
        >
            <div className="relative h-60 overflow-hidden bg-midnight-950">
                <div className="w-full h-full group-hover:scale-105 transition duration-500">
                    <PlayerAvatar player={player} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#050b1a] via-transparent to-black/40 pointer-events-none"></div>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-midnight-950/85 backdrop-blur-md border border-midnight-400/45 shadow-lg">
                    <span className="font-display font-bold text-midnight-200 text-sm">#{player.shirt_number}</span>
                </div>
                <div className="absolute top-3 left-3">
                    <OvrBadge ovr={player.ovr} />
                </div>
                <div className="absolute bottom-3 left-3">
                    <RankBadge rank={player.rank} />
                </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <h2 className="font-display text-base font-bold text-white group-hover:text-midnight-200 transition truncate">
                            {player.name}
                        </h2>
                        <span
                            className={`px-2.5 py-0.5 rounded-lg bg-gradient-to-r ${POS_STYLE[player.position]} border text-[10px] font-extrabold tracking-wider shrink-0`}
                        >
                            {player.position}
                        </span>
                    </div>
                    <p className="text-xs text-midnight-300 flex items-center gap-2">
                        <i className="fa-solid fa-shield-halved text-midnight-400/70 text-[10px]"></i>
                        <span className="truncate">{player.club}</span>
                    </p>
                </div>
                {footer ?? (
                    <div className="pt-3 border-t border-midnight-400/15 flex items-center justify-between text-xs text-midnight-300">
                        <span className="flex items-center gap-1.5 truncate">
                            <CountryFlag code={player.country_code} />
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

export function Modal({ open, onClose, children, maxWidth = 'max-w-2xl' }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md modal-anim">
            <div className={`ff-card rounded-3xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto p-6 md:p-8 relative shadow-2xl`}>
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 w-9 h-9 rounded-full bg-midnight-950/90 border border-midnight-400/30 text-midnight-300 hover:text-midnight-100 flex items-center justify-center transition z-10"
                >
                    <i className="fa-solid fa-xmark"></i>
                </button>
                {children}
            </div>
        </div>
    );
}

export function EmptyState({ icon = 'fa-user-slash', title, subtitle }) {
    return (
        <div className="text-center py-16 ff-card rounded-3xl max-w-lg mx-auto my-8 px-6">
            <div className="w-16 h-16 rounded-full bg-midnight-800/80 border border-midnight-400/30 flex items-center justify-center mx-auto text-midnight-300 text-2xl mb-4">
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-1">{title}</h3>
            {subtitle && <p className="text-xs text-midnight-300 max-w-xs mx-auto">{subtitle}</p>}
        </div>
    );
}

export function StatWidget({ icon, label, value, accent = 'text-white' }) {
    return (
        <div className="ff-card p-4 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-midnight-800/80 border border-midnight-400/30 flex items-center justify-center text-midnight-300 text-xl shrink-0">
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <div className="min-w-0">
                <span className="text-[10px] text-midnight-300 uppercase font-semibold tracking-wider">{label}</span>
                <h3 className={`text-2xl font-bold font-display truncate ${accent}`}>{value}</h3>
            </div>
        </div>
    );
}
