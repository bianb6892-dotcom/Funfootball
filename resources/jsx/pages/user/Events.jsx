import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { timeID } from '../../utils/game';

const STATUS = {
    live: ['LIVE', 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'],
    upcoming: ['SEGERA', 'bg-sky-500/15 border-sky-400/40 text-sky-300'],
    ended: ['SELESAI', 'bg-midnight-800 border-midnight-700 text-midnight-300'],
    inactive: ['NONAKTIF', 'bg-red-500/15 border-red-500/40 text-red-300'],
};

export function Events() {
    const [events, setEvents] = useState([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);

    useEffect(() => {
        api.events({ page }).then(({ data }) => {
            setEvents(data.data);
            setLastPage(data.last_page);
        }).catch(() => {});
    }, [page]);

    return (
        <div className="space-y-6">
            <div className="ff-card p-6 rounded-3xl text-center">
                <i className="fa-solid fa-calendar-star text-gold-400 text-3xl mb-3 inline-block"></i>
                <h2 className="font-display text-2xl font-black ff-gradient-text mb-1">EVENT CHALLENGE</h2>
                <p className="text-xs text-midnight-300 max-w-lg mx-auto">
                    Lawan XI spesial racikan admin + mini-game latihan (free kick, penalti, dribble).
                    Tiap percobaan memakai token — klaim token harian di Dashboard. Menang = hadiah koin/token/pemain (sekali per tier).
                </p>
            </div>

            <div className="space-y-2">
                {events.map((e) => {
                    const [label, cls] = e.is_completed
                        ? ['SELESAI', 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300']
                        : (STATUS[e.status] || [e.status, '']);
                    return (
                        <Link key={e.id} to={`/events/${e.id}`}
                            className="ff-card p-4 rounded-2xl flex flex-wrap items-center gap-3 hover:border-midnight-400 transition block">
                            <div className="flex-1 min-w-[220px]">
                                <p className="text-sm font-bold text-white">
                                    {e.name}
                                    <span className={`ml-2 px-2 py-0.5 rounded-full border text-[9px] font-black ${cls}`}>{label}</span>
                                    {e.is_completed
                                        ? <span className="ml-2 text-[10px] text-emerald-300"><i className="fa-solid fa-circle-check mr-0.5"></i>Semua tier selesai</span>
                                        : e.reward_claimed && <span className="ml-2 text-[10px] text-gold-300"><i className="fa-solid fa-gift mr-0.5"></i>Hadiah diklaim</span>}
                                </p>
                                <p className="text-[11px] text-midnight-300 mt-0.5">
                                    {timeID(e.starts_at)} &rarr; {timeID(e.ends_at)} &middot; {e.formation}
                                </p>
                                {(e.rules || []).length > 0 && (
                                    <p className="text-[11px] text-midnight-200 mt-1">
                                        <i className="fa-solid fa-scale-balanced mr-1"></i>
                                        {(e.rules || []).map((r) => r.text).join(' • ')}
                                    </p>
                                )}
                                <p className="text-[11px] text-gold-300/90 mt-1">
                                    <i className="fa-solid fa-gift mr-1"></i>
                                    {Number(e.reward_coins || 0).toLocaleString('id-ID')} koin{e.reward_tokens ? ` + ${e.reward_tokens} token` : ''}{e.reward_player ? ` + ${e.reward_player.name} (OVR ${e.reward_player.ovr})` : ''}{e.reward_pack ? ` + ${e.reward_pack_draws || 0}x ${e.reward_pack.name}` : ''}
                                    <span className="ml-2 text-sky-300"><i className="fa-solid fa-ticket mr-0.5"></i>{e.token_cost ?? 1}/main</span>
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[11px] text-midnight-300">
                                    {e.my_wins || 0}/{e.my_attempts || 0} menang
                                    {e.max_tier ? ` · Tier ${Math.min(e.my_wins || 0, e.max_tier)}/${e.max_tier}` : ''}
                                </p>
                                <span className="gold-btn inline-block px-4 py-2 rounded-xl text-[10px] font-bold uppercase mt-1">Lihat</span>
                            </div>
                        </Link>
                    );
                })}
                {events.length === 0 && <p className="text-xs text-midnight-300 text-center py-6">Belum ada event.</p>}
            </div>

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
        </div>
    );
}
