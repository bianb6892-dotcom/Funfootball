import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { EmptyState, Modal } from '../../components/common';
import { timeID } from '../../utils/game';

const hasReward = (m) => (Number(m.coin_amount) || 0) > 0 || (Number(m.token_amount) || 0) > 0 || m.player_id;
const isExpired = (m) => !!m.expires_at && new Date(m.expires_at).getTime() < Date.now();
const isUpcoming = (m) => !!m.available_from && new Date(m.available_from).getTime() > Date.now();
const claimable = (m) => hasReward(m) && !m.claimed_at && !isExpired(m) && !isUpcoming(m);

export function Mail() {
    const { refresh } = useAuth();
    const toast = useToast();
    const [mails, setMails] = useState([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [claimableCount, setClaimableCount] = useState(0);
    const [unread, setUnread] = useState(0);
    const [detail, setDetail] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = (p = page) => {
        api.mails(p).then(({ data }) => {
            setMails(data.data);
            setLastPage(data.last_page);
        }).catch(() => {});
        api.mailsUnread().then(({ data }) => {
            setClaimableCount(data.claimable);
            setUnread(data.unread);
        }).catch(() => {});
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);

    const open = async (m) => {
        setDetail(m);
        if (!m.is_read) {
            try {
                const { data } = await api.mailRead(m.id);
                setMails((list) => list.map((x) => (x.id === m.id ? data : x)));
                setDetail(data);
                setUnread((c) => Math.max(0, c - 1));
            } catch { /* abaikan */ }
        }
    };

    const markRead = async (m) => {
        try {
            const { data } = await api.mailRead(m.id);
            setMails((list) => list.map((x) => (x.id === m.id ? data : x)));
            setDetail((d) => (d && d.id === m.id ? data : d));
            setUnread((c) => Math.max(0, c - (m.is_read ? 0 : 1)));
            toast('Mail ditandai sudah dibaca.');
        } catch (e) {
            toast(e.response?.data?.message || 'Gagal menandai dibaca.', 'fa-circle-exclamation');
        }
    };

    const markUnread = async (m) => {
        try {
            const { data } = await api.mailUnread(m.id);
            setMails((list) => list.map((x) => (x.id === m.id ? data : x)));
            setDetail((d) => (d && d.id === m.id ? data : d));
            setUnread((c) => c + 1);
            toast('Mail ditandai belum dibaca.');
        } catch (e) {
            toast(e.response?.data?.message || 'Gagal menandai belum dibaca.', 'fa-circle-exclamation');
        }
    };

    const markAllRead = async () => {
        try {
            const { data } = await api.mailReadAll();
            toast(data.message);
            load();
        } catch (e) {
            toast(e.response?.data?.message || 'Gagal menandai semua.', 'fa-circle-exclamation');
        }
    };

    const claim = async (m) => {
        setBusy(true);
        try {
            const { data } = await api.mailClaim(m.id);
            setMails((list) => list.map((x) => (x.id === m.id ? data.mail : x)));
            setDetail(data.mail);
            setClaimableCount((c) => Math.max(0, c - 1));
            await refresh();
            toast(claimedMsg(data));
        } catch (e) {
            toast(e.response?.data?.message || 'Gagal mengklaim hadiah.', 'fa-circle-exclamation');
        } finally {
            setBusy(false);
        }
    };

    const claimAll = async () => {
        setBusy(true);
        try {
            const { data } = await api.mailClaimAll();
            await refresh();
            load();
            toast(
                `Mengklaim ${data.claimed} mail: +${Number(data.coins_claimed).toLocaleString('id-ID')} koin`
                + (Number(data.tokens_claimed) > 0 ? ` + ${Number(data.tokens_claimed).toLocaleString('id-ID')} token` : '')
                + (data.players?.length ? ` + ${data.players.length} pemain` : '')
                + (data.player_duplicates ? ` (${data.player_duplicates} pemain sudah dimiliki)` : '')
            );
        } catch (e) {
            toast(e.response?.data?.message || 'Gagal mengklaim semua.', 'fa-circle-exclamation');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="ff-card p-6 rounded-3xl flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <h2 className="font-display text-xl font-black ff-gradient-text">KOTAK SURAT</h2>
                    <p className="text-xs text-midnight-300 mt-1">Hadiah koin, token &amp; pemain dari admin. Buka mail lalu klaim hadiahnya.</p>
                </div>
                {unread > 0 && (
                    <button onClick={markAllRead} className="ff-outline-btn px-5 py-2.5 rounded-xl text-xs font-bold uppercase">
                        <i className="fa-solid fa-envelope-open-text mr-1"></i> Tandai Dibaca ({unread})
                    </button>
                )}
                {claimableCount > 0 && (
                    <button onClick={claimAll} disabled={busy} className="gold-btn px-5 py-2.5 rounded-xl text-xs font-bold uppercase disabled:opacity-50">
                        <i className="fa-solid fa-gift mr-1"></i> Klaim Semua ({claimableCount})
                    </button>
                )}
            </div>

            {mails.length === 0 ? (
                <EmptyState icon="fa-envelope-open-text" title="Kotak Surat Kosong" subtitle="Belum ada mail dari admin. Hadiah event & kompensasi muncul di sini." />
            ) : (
                <div className="space-y-3">
                    {mails.map((m) => (
                        <div
                            key={m.id}
                            onClick={() => open(m)}
                            className={`ff-card p-4 rounded-2xl flex items-center gap-4 cursor-pointer hoverable ${!m.is_read ? 'border-midnight-300/50' : ''}`}
                        >
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${!m.is_read ? 'bg-midnight-600/40 border-midnight-300/40 text-white' : 'bg-midnight-900/70 border-midnight-700 text-midnight-300'}`}>
                                <i className={`fa-solid ${m.is_read ? 'fa-envelope-open-text' : 'fa-envelope'} text-lg`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm truncate ${!m.is_read ? 'font-bold text-white' : 'font-semibold text-midnight-100'}`}>
                                    {m.subject}
                                </p>
                                <p className="text-[10px] text-midnight-300 truncate">
                                    {m.admin?.name || 'Admin'} &middot; {timeID(m.created_at)}
                                    {(m.available_from || m.expires_at) && (
                                        <> &middot; Berlaku {m.available_from ? timeID(m.available_from) : 'sekarang'} — {m.expires_at ? timeID(m.expires_at) : 'selamanya'}</>
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                                {Number(m.coin_amount) > 0 && (
                                    <span className="px-2 py-0.5 rounded-lg bg-yellow-500/15 border border-yellow-500/40 text-yellow-200 text-[10px] font-bold whitespace-nowrap">
                                        <i className="fa-solid fa-coins mr-1"></i>{Number(m.coin_amount).toLocaleString('id-ID')}
                                    </span>
                                )}
                                {Number(m.token_amount) > 0 && (
                                    <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 text-[10px] font-bold whitespace-nowrap">
                                        <i className="fa-solid fa-ticket mr-1"></i>{Number(m.token_amount).toLocaleString('id-ID')} token
                                    </span>
                                )}
                                {m.player && (
                                    <span className="px-2 py-0.5 rounded-lg bg-midnight-600/40 border border-midnight-300/40 text-white text-[10px] font-bold whitespace-nowrap">
                                        <i className="fa-solid fa-user mr-1"></i>{m.player.name} ({m.player.ovr})
                                    </span>
                                )}
                                {claimable(m) ? (
                                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold whitespace-nowrap">
                                        Klaim!
                                    </span>
                                ) : m.claimed_at ? (
                                    <span className="px-2 py-0.5 rounded-lg bg-midnight-900/70 border border-midnight-700 text-midnight-300 text-[10px] font-bold whitespace-nowrap">
                                        Diklaim
                                    </span>
                                ) : isUpcoming(m) ? (
                                    <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/40 text-sky-300 text-[10px] font-bold whitespace-nowrap">
                                        Mulai {timeID(m.available_from)}
                                    </span>
                                ) : isExpired(m) && (
                                    <span className="px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/40 text-red-400 text-[10px] font-bold whitespace-nowrap">
                                        Hangus
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
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

            <Modal open={!!detail} onClose={() => setDetail(null)} maxWidth="max-w-lg">
                {detail && (
                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] text-midnight-300 uppercase font-semibold">
                                {detail.admin?.name || 'Admin'} &middot; {timeID(detail.created_at)}
                            </p>
                            <h3 className="font-display text-xl font-bold text-white mt-1">{detail.subject}</h3>
                        </div>
                        {detail.body && (
                            <p className="text-sm text-midnight-100 whitespace-pre-line bg-midnight-950/60 border border-midnight-700/60 rounded-2xl p-4">
                                {detail.body}
                            </p>
                        )}
                        {(Number(detail.coin_amount) > 0 || Number(detail.token_amount) > 0 || detail.player) && (
                            <div className="bg-midnight-950/60 border border-gold-500/30 rounded-2xl p-4">
                                <p className="text-[10px] text-midnight-300 uppercase font-semibold mb-2">
                                    <i className="fa-solid fa-gift mr-1"></i>Lampiran hadiah
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {Number(detail.coin_amount) > 0 && (
                                        <span className="px-3 py-1.5 rounded-xl bg-yellow-500/15 border border-yellow-500/40 text-yellow-200 text-xs font-bold">
                                            <i className="fa-solid fa-coins mr-1"></i>{Number(detail.coin_amount).toLocaleString('id-ID')} koin
                                        </span>
                                    )}
                                    {Number(detail.token_amount) > 0 && (
                                        <span className="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 text-xs font-bold">
                                            <i className="fa-solid fa-ticket mr-1"></i>{Number(detail.token_amount).toLocaleString('id-ID')} token
                                        </span>
                                    )}
                                    {detail.player && (
                                        <span className="px-3 py-1.5 rounded-xl bg-midnight-600/40 border border-midnight-300/40 text-white text-xs font-bold">
                                            <i className="fa-solid fa-user mr-1"></i>{detail.player.name} ({detail.player.position} · OVR {detail.player.ovr})
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                        {(detail.available_from || detail.expires_at) && !detail.claimed_at && (
                            <p className={`text-[11px] ${isExpired(detail) ? 'text-red-400' : isUpcoming(detail) ? 'text-sky-300' : 'text-midnight-300'}`}>
                                <i className="fa-solid fa-hourglass-half mr-1"></i>
                                {isExpired(detail)
                                    ? 'Hadiah sudah hangus.'
                                    : isUpcoming(detail)
                                      ? `Hadiah berlaku mulai ${timeID(detail.available_from)}.`
                                      : `Berlaku ${detail.available_from ? `sejak ${timeID(detail.available_from)} ` : ''}sampai ${detail.expires_at ? timeID(detail.expires_at) : 'selamanya'}.`}
                            </p>
                        )}
                        <div className="flex justify-end gap-3 pt-1 flex-wrap">
                            {!detail.is_read ? (
                                <button onClick={() => markRead(detail)} className="ff-outline-btn px-4 py-2 rounded-xl text-xs">
                                    <i className="fa-solid fa-check mr-1"></i>Tandai Dibaca
                                </button>
                            ) : (
                                <button onClick={() => markUnread(detail)} className="ff-outline-btn px-4 py-2 rounded-xl text-xs">
                                    <i className="fa-solid fa-rotate-left mr-1"></i>Tandai Belum Dibaca
                                </button>
                            )}
                            {claimable(detail) ? (
                                <button onClick={() => claim(detail)} disabled={busy} className="gold-btn px-5 py-2 rounded-xl text-xs font-bold uppercase disabled:opacity-50">
                                    <i className="fa-solid fa-gift mr-1"></i>{busy ? 'Mengklaim...' : 'Klaim Hadiah'}
                                </button>
                            ) : hasReward(detail) && !detail.claimed_at ? (
                                <button
                                    disabled
                                    title={isUpcoming(detail) ? `Berlaku mulai ${timeID(detail.available_from)}` : isExpired(detail) ? 'Hadiah sudah hangus.' : 'Tidak bisa diklaim.'}
                                    className="px-5 py-2 rounded-xl text-xs font-bold uppercase bg-midnight-800 border border-midnight-700 text-midnight-300 opacity-70 cursor-not-allowed"
                                >
                                    <i className="fa-solid fa-gift mr-1"></i>
                                    {isUpcoming(detail) ? 'Belum Mulai' : isExpired(detail) ? 'Hangus' : 'Klaim Hadiah'}
                                </button>
                            ) : null}
                            {detail.claimed_at && (
                                <span className="text-[11px] text-emerald-300 self-center">
                                    <i className="fa-solid fa-circle-check mr-1"></i>Diklaim {timeID(detail.claimed_at)}
                                </span>
                            )}
                            <button onClick={() => setDetail(null)} className="ff-outline-btn px-4 py-2 rounded-xl text-xs">
                                Tutup
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

function claimedMsg(data) {
    const parts = [];
    if (data.coins_claimed > 0) parts.push(`+${Number(data.coins_claimed).toLocaleString('id-ID')} koin`);
    if (Number(data.tokens_claimed) > 0) parts.push(`+${Number(data.tokens_claimed).toLocaleString('id-ID')} token`);
    if (data.player) parts.push(data.player_duplicate ? `${data.player.name} (sudah dimiliki)` : `${data.player.name} (${data.player.ovr})`);
    return `Hadiah diklaim: ${parts.join(' + ') || '—'}`;
}
