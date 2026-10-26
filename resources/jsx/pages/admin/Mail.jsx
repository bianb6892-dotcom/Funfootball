import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { EmptyState, PlayerAvatar, RankBadge } from '../../components/common';
import { timeID, errMsg, cardOf } from '../../utils/game';

const emptyForm = { send_to: 'user', user_id: '', subject: '', body: '', coin_amount: '', token_amount: '', player_id: '', available_from: '', expires_at: '' };

export function AdminMail() {
    const toast = useToast();
    const [form, setForm] = useState(emptyForm);
    const [sending, setSending] = useState(false);
    const [users, setUsers] = useState([]);
    const [userQ, setUserQ] = useState('');
    const [players, setPlayers] = useState([]);
    const [playerQ, setPlayerQ] = useState('');
    const [picked, setPicked] = useState(null); // objek pemain terpilih (tetap tampil walau hasil cari berubah)
    const [mails, setMails] = useState([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [search, setSearch] = useState('');
    const [readFilter, setReadFilter] = useState('');
    const [summary, setSummary] = useState(null);

    const loadHistory = (p = 1, q = '', r = readFilter) => {
        api.adminMails({ page: p, search: q || undefined, is_read: r === '' ? undefined : r }).then(({ data }) => {
            setMails(data.data);
            setLastPage(data.last_page);
            if (data.summary) setSummary(data.summary);
        }).catch(() => {});
    };

    useEffect(() => { loadHistory(page, search); /* eslint-disable-next-line */ }, [page]);

    // Cari user tujuan (debounce sederhana).
    useEffect(() => {
        if (form.send_to !== 'user') return;
        const t = setTimeout(() => {
            api.adminUsers({ search: userQ || undefined }).then(({ data }) => setUsers(data.data)).catch(() => {});
        }, 300);
        return () => clearTimeout(t);
    }, [userQ, form.send_to]);

    // Cari pemain lampiran (tampilkan 12 teratas sejak awal agar bisa diklik langsung).
    useEffect(() => {
        const t = setTimeout(() => {
            api.players({ search: playerQ || undefined, per_page: 12 }).then(({ data }) => setPlayers(data.data)).catch(() => {});
        }, 300);
        return () => clearTimeout(t);
    }, [playerQ]);

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const pickedPlayer = form.player_id
        ? (picked && String(picked.id) === String(form.player_id) ? picked : players.find((p) => String(p.id) === String(form.player_id)) || null)
        : null;
    const pickedUser = form.user_id ? users.find((u) => String(u.id) === String(form.user_id)) : null;

    const pickPlayer = (p) => {
        setForm({ ...form, player_id: p.id });
        setPicked(p);
    };

    const clearPlayer = () => {
        setForm({ ...form, player_id: '' });
        setPicked(null);
    };

    const send = async () => {
        if (!form.subject.trim()) { toast('Subjek wajib diisi.', 'fa-circle-exclamation'); return; }
        if (form.send_to === 'user' && !form.user_id) { toast('Pilih user tujuan.', 'fa-circle-exclamation'); return; }
        if (form.available_from && form.expires_at && new Date(form.available_from) >= new Date(form.expires_at)) {
            toast('"Berlaku dari" harus sebelum "hangus pada".', 'fa-circle-exclamation'); return;
        }
        setSending(true);
        try {
            const payload = {
                send_to: form.send_to,
                subject: form.subject.trim(),
                body: form.body.trim() || undefined,
            };
            if (form.send_to === 'user') payload.user_id = form.user_id;
            if (form.coin_amount !== '' && Number(form.coin_amount) > 0) payload.coin_amount = Number(form.coin_amount);
            if (form.token_amount !== '' && Number(form.token_amount) > 0) payload.token_amount = Number(form.token_amount);
            if (form.player_id) payload.player_id = form.player_id;
            if (form.available_from) payload.available_from = new Date(form.available_from).toISOString();
            if (form.expires_at) payload.expires_at = new Date(form.expires_at).toISOString();
            const { data } = await api.adminSendMail(payload);
            toast(data.message);
            setForm(emptyForm);
            setUserQ(''); setPlayerQ(''); setPicked(null);
            setPage(1); loadHistory(1, search);
        } catch (e) {
            toast(errMsg(e, 'Gagal mengirim mail.'), 'fa-circle-exclamation');
        } finally {
            setSending(false);
        }
    };

    const remove = async (id) => {
        if (!window.confirm('Hapus mail ini? Hadiah yang belum diklaim ikut hilang.')) return;
        try {
            const { data } = await api.adminDeleteMail(id);
            toast(data.message);
            loadHistory(page, search);
        } catch (e) {
            toast(errMsg(e), 'fa-circle-exclamation');
        }
    };

    const inputCls = 'w-full bg-midnight-950 text-sm text-white p-3 rounded-xl border border-midnight-700 focus:border-midnight-300 outline-none';

    return (
        <div className="space-y-6">
            <div className="ff-card p-6 rounded-3xl">
                <h2 className="font-display text-xl font-black ff-gradient-text">KIRIM MAIL</h2>
                <p className="text-xs text-midnight-300 mt-1">Kirim koin, token event, dan/atau pemain ke satu user atau semua user. Atur masa berlaku dari "berlaku dari" sampai "hangus pada".</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1">Penerima</label>
                        <div className="flex gap-2 mb-2">
                            {[{ v: 'user', l: 'Satu user' }, { v: 'all', l: 'Semua user' }].map((o) => (
                                <button
                                    key={o.v}
                                    onClick={() => setForm({ ...form, send_to: o.v })}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold border ${form.send_to === o.v ? 'bg-midnight-600/50 border-midnight-300/50 text-white' : 'border-midnight-700 text-midnight-300'}`}
                                >
                                    {o.l}
                                </button>
                            ))}
                        </div>
                        {form.send_to === 'user' ? (
                            <>
                                <input value={userQ} onChange={(e) => setUserQ(e.target.value)} placeholder="Cari nama / email user..." className={inputCls} />
                                <select value={form.user_id} onChange={set('user_id')} className={`${inputCls} mt-2 cursor-pointer`}>
                                    <option value="">— Pilih user —</option>
                                    {users.map((u) => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.email}) — {Number(u.coins).toLocaleString('id-ID')} koin</option>
                                    ))}
                                </select>
                            </>
                        ) : (
                            <p className="text-xs text-midnight-300 bg-midnight-950/60 border border-midnight-700/60 rounded-xl p-3">
                                <i className="fa-solid fa-users mr-1"></i>Mail dibuat untuk setiap user (broadcast).
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1">Subjek</label>
                        <input value={form.subject} onChange={set('subject')} placeholder="Hadiah event akhir pekan!" className={inputCls} maxLength={150} />
                        <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1 mt-3">Berlaku dari (opsional)</label>
                        <ExpiryPicker value={form.available_from} onChange={(v) => setForm({ ...form, available_from: v })} allowPast={false} placeholder="Langsung berlaku..." defaultHour={0} defaultMinute={0} />
                        <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1 mt-3">Hangus pada (opsional)</label>
                        <ExpiryPicker value={form.expires_at} onChange={(v) => setForm({ ...form, expires_at: v })} defaultHour={23} defaultMinute={59} />
                    </div>
                </div>

                <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1 mt-4">Isi pesan (opsional)</label>
                <textarea value={form.body} onChange={set('body')} rows={3} placeholder="Terima kasih sudah bermain..." className={`${inputCls} resize-y`} maxLength={2000} />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                        <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1">
                            <i className="fa-solid fa-coins mr-1"></i>Koin (opsional)
                        </label>
                        <input type="number" min={0} max={1000000} value={form.coin_amount} onChange={set('coin_amount')} placeholder="0 = tanpa koin" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1">
                            <i className="fa-solid fa-ticket mr-1"></i>Token event (opsional)
                        </label>
                        <input type="number" min={0} max={1000000} value={form.token_amount} onChange={set('token_amount')} placeholder="0 = tanpa token" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1">
                            <i className="fa-solid fa-id-card mr-1"></i>Kartu pemain (opsional)
                        </label>
                        {pickedPlayer ? (
                            <div className="flex items-center gap-3 bg-midnight-950/60 border border-yellow-500/40 rounded-2xl p-2">
                                <div className="w-12 h-14 rounded-xl overflow-hidden bg-midnight-950 shrink-0">
                                    <PlayerAvatar player={pickedPlayer} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white truncate">{pickedPlayer.name}</p>
                                    <p className="text-[10px] text-midnight-300">{pickedPlayer.position} · OVR {pickedPlayer.ovr}</p>
                                </div>
                                <button type="button" onClick={clearPlayer} className="ff-outline-btn px-3 py-1.5 rounded-xl text-[10px] shrink-0">
                                    Ganti
                                </button>
                            </div>
                        ) : (
                            <>
                                <input value={playerQ} onChange={(e) => setPlayerQ(e.target.value)} placeholder="Ketik nama pemain lalu ketuk kartunya..." className={inputCls} />
                                {players.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 max-h-64 overflow-y-auto pr-1">
                                        {players.map((p) => {
                                            const sel = String(form.player_id) === String(p.id);
                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => pickPlayer(p)}
                                                    className={`relative rounded-2xl overflow-hidden border-2 text-left transition ${sel ? 'border-yellow-300 shadow-[0_0_14px_rgba(240,205,86,0.5)]' : 'border-midnight-700 hover:border-midnight-400'}`}
                                                >
                                                    <div className="h-24 bg-midnight-950">
                                                        <PlayerAvatar player={p} />
                                                    </div>
                                                    <div className="p-2 bg-midnight-900/90">
                                                        <p className="text-[11px] font-bold text-white truncate">{p.name}</p>
                                                        <p className="text-[10px] text-midnight-300">{p.position} · OVR {p.ovr}</p>
                                                    </div>
                                                    <span className="absolute top-1.5 left-1.5"><RankBadge rank={cardOf(p)} /></span>
                                                    {sel && (
                                                        <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-yellow-400 text-black flex items-center justify-center text-[11px]">
                                                            <i className="fa-solid fa-check"></i>
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-midnight-300 mt-2">Tidak ada pemain yang cocok.</p>
                                )}
                            </>
                        )}
                        {pickedUser && <p className="text-[10px] text-midnight-300 mt-1">Tujuan: {pickedUser.name}</p>}
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    <button onClick={send} disabled={sending} className="gold-btn px-6 py-2.5 rounded-xl text-xs font-bold uppercase disabled:opacity-50">
                        <i className="fa-solid fa-paper-plane mr-1"></i>{sending ? 'Mengirim...' : form.send_to === 'all' ? 'Kirim ke Semua' : 'Kirim Mail'}
                    </button>
                </div>
            </div>

            <div className="ff-card p-6 rounded-3xl">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                    <h3 className="font-display text-lg font-bold text-white">RIWAYAT TERKIRIM</h3>
                    <div className="ml-auto flex items-center gap-2 flex-wrap">
                        <select
                            value={readFilter}
                            onChange={(e) => { setReadFilter(e.target.value); setPage(1); loadHistory(1, search, e.target.value); }}
                            className="bg-midnight-950 text-xs text-white px-3 py-2 rounded-xl border border-midnight-700 outline-none cursor-pointer"
                        >
                            <option value="">Semua status baca</option>
                            <option value="1">Sudah dibaca</option>
                            <option value="0">Belum dibaca</option>
                        </select>
                        <input
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); loadHistory(1, e.target.value); }}
                            placeholder="Cari subjek..."
                            className="bg-midnight-950 text-xs text-white px-3 py-2 rounded-xl border border-midnight-700 outline-none w-48"
                        />
                    </div>
                </div>
                {summary && (
                    <p className="text-[11px] text-midnight-300 mb-4">
                        <i className="fa-solid fa-envelope-open-text mr-1"></i>
                        {summary.total} mail &middot; {summary.read} sudah dibaca &middot; {summary.unread} belum dibaca
                    </p>
                )}

                {mails.length === 0 ? (
                    <EmptyState icon="fa-envelope" title="Belum Ada Mail" subtitle="Mail yang dikirim admin tercatat di sini." />
                ) : (
                    <div className="space-y-2">
                        {mails.map((m) => (
                            <div key={m.id} className="bg-midnight-950/60 border border-midnight-700/60 rounded-2xl p-3 flex items-center gap-3 flex-wrap">
                                <div className="flex-1 min-w-[180px]">
                                    <p className="text-sm font-semibold text-white truncate">{m.subject}</p>
                                    <p className="text-[10px] text-midnight-300">
                                        Ke: {m.user?.name || `#${m.user_id}`} &middot; oleh {m.admin?.name || 'Admin'} &middot; {timeID(m.created_at)}
                                    </p>
                                    {(m.available_from || m.expires_at) && (
                                        <p className="text-[10px] text-midnight-400">
                                            <i className="fa-solid fa-clock mr-1"></i>
                                            {m.available_from ? timeID(m.available_from) : 'Sekarang'} — {m.expires_at ? timeID(m.expires_at) : 'selamanya'}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
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
                                            {m.player.name} ({m.player.ovr})
                                        </span>
                                    )}
                                    {m.is_read ? (
                                        <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/40 text-sky-300 text-[10px] font-bold">Dibaca</span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-300 text-[10px] font-bold">Belum dibaca</span>
                                    )}
                                    {m.claimed_at ? (
                                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">Diklaim</span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-lg bg-midnight-900/70 border border-midnight-700 text-midnight-300 text-[10px] font-bold">Aktif</span>
                                    )}
                                    <button onClick={() => remove(m.id)} className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/40 text-red-400 text-[11px] hover:bg-red-500/20" title="Hapus">
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {lastPage > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-4">
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
        </div>
    );
}

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const pad2 = (n) => String(n).padStart(2, '0');
const toLocalValue = (y, m, d, h, mi) => `${y}-${pad2(m + 1)}-${pad2(d)}T${pad2(h)}:${pad2(mi)}`;
const parseLocal = (v) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v || '');
    if (!m) return null;
    return { y: +m[1], mo: +m[2] - 1, d: +m[3], h: +m[4], mi: +m[5] };
};

/** Pilih tanggal (berlaku dari / hangus pada) lewat kalender popup (ketuk untuk buka) + jam & menit. */
function ExpiryPicker({ value, onChange, placeholder, defaultHour = 23, defaultMinute = 59 }) {
    const [open, setOpen] = useState(false);
    const now = new Date();
    const cur = parseLocal(value);
    const [vy, setVy] = useState(cur?.y ?? now.getFullYear());
    const [vm, setVm] = useState(cur?.mo ?? now.getMonth());

    const openPicker = () => {
        const c = parseLocal(value);
        const t = new Date();
        setVy(c?.y ?? t.getFullYear());
        setVm(c?.mo ?? t.getMonth());
        setOpen(true);
    };

    const pickDay = (d) => {
        onChange(toLocalValue(vy, vm, d, cur?.h ?? defaultHour, cur?.mi ?? defaultMinute));
    };

    const pickTime = (h, mi) => {
        const base = parseLocal(value);
        const t = new Date();
        onChange(toLocalValue(base?.y ?? vy, base?.mo ?? vm, base?.d ?? t.getDate(), h, mi));
    };

    const moveMonth = (dir) => {
        let y = vy, m = vm + dir;
        if (m < 0) { m = 11; y -= 1; }
        if (m > 11) { m = 0; y += 1; }
        setVy(y); setVm(m);
    };

    const firstDow = (new Date(vy, vm, 1).getDay() + 6) % 7; // Senin dulu
    const dim = new Date(vy, vm + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) cells.push(d);
    const isPast = (d) => new Date(vy, vm, d, 23, 59, 59).getTime() < now.getTime();
    const isSel = (d) => !!cur && cur.y === vy && cur.mo === vm && cur.d === d;
    const isToday = (d) => vy === now.getFullYear() && vm === now.getMonth() && d === now.getDate();
    const canPrev = vy > now.getFullYear() || (vy === now.getFullYear() && vm > now.getMonth());

    const curH = cur?.h ?? defaultHour;
    const curMi = cur?.mi ?? defaultMinute;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => (open ? setOpen(false) : openPicker())}
                className="w-full bg-midnight-950 text-sm p-3 rounded-xl border border-midnight-700 focus:border-midnight-300 outline-none flex items-center gap-2 cursor-pointer text-left"
            >
                <i className="fa-solid fa-calendar-days text-midnight-300"></i>
                <span className={`flex-1 ${value ? 'text-white' : 'text-midnight-300/60'}`}>
                    {value ? timeID(value) : (placeholder || 'Ketuk untuk pilih tanggal...')}
                </span>
                {value && (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); onChange(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') onChange(''); }}
                        className="w-6 h-6 rounded-full bg-midnight-800 text-midnight-300 flex items-center justify-center text-[10px] hover:text-white"
                        title="Hapus tanggal"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </span>
                )}
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute z-50 mt-2 left-0 w-[300px] max-w-[calc(100vw-3rem)] bg-midnight-950 border border-midnight-400/40 rounded-2xl p-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-3">
                            <button type="button" disabled={!canPrev} onClick={() => moveMonth(-1)} className="w-8 h-8 rounded-lg bg-midnight-800 text-midnight-200 disabled:opacity-30 hover:bg-midnight-700">
                                <i className="fa-solid fa-chevron-left text-xs"></i>
                            </button>
                            <p className="font-display font-bold text-white text-sm">{MONTHS_ID[vm]} {vy}</p>
                            <button type="button" onClick={() => moveMonth(1)} className="w-8 h-8 rounded-lg bg-midnight-800 text-midnight-200 hover:bg-midnight-700">
                                <i className="fa-solid fa-chevron-right text-xs"></i>
                            </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {DAYS_ID.map((d) => (
                                <span key={d} className="text-center text-[9px] font-bold text-midnight-400 uppercase">{d}</span>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {cells.map((d, i) => d === null ? <span key={`e-${i}`} /> : (
                                <button
                                    key={d}
                                    type="button"
                                    disabled={isPast(d)}
                                    onClick={() => pickDay(d)}
                                    className={`h-9 rounded-lg text-xs font-bold transition ${
                                        isSel(d)
                                            ? 'bg-gradient-to-br from-[#f0cd56] to-[#8a6414] text-[#3a2800] shadow'
                                            : isPast(d)
                                              ? 'text-midnight-600 opacity-40 cursor-not-allowed'
                                              : isToday(d)
                                                ? 'border border-midnight-300 text-white hover:bg-midnight-800'
                                                : 'text-midnight-100 hover:bg-midnight-800'
                                    }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                            <label className="text-[10px] text-midnight-300 uppercase font-semibold">Jam</label>
                            <select value={curH} onChange={(e) => pickTime(Number(e.target.value), curMi)} className="flex-1 bg-midnight-800 text-xs text-white p-2 rounded-lg border border-midnight-700 outline-none cursor-pointer">
                                {Array.from({ length: 24 }, (_, h) => (
                                    <option key={h} value={h}>{pad2(h)}</option>
                                ))}
                            </select>
                            <span className="text-midnight-300 font-bold">:</span>
                            <select value={curMi} onChange={(e) => pickTime(curH, Number(e.target.value))} className="flex-1 bg-midnight-800 text-xs text-white p-2 rounded-lg border border-midnight-700 outline-none cursor-pointer">
                                {[...new Set([curMi, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])].sort((a, b) => a - b).map((m) => (
                                    <option key={m} value={m}>{pad2(m)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-between mt-3">
                            <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="text-[11px] text-midnight-300 hover:text-red-400 px-2 py-1">
                                Hapus tanggal
                            </button>
                            <button type="button" onClick={() => setOpen(false)} className="gold-btn px-5 py-1.5 rounded-xl text-[11px] font-bold uppercase">
                                OK
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
