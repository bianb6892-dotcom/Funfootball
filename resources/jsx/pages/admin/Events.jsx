import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { COUNTRIES, countryName, flagUrl, normalizeCode } from '../../utils/countries';
import { cardLabel, errMsg, timeID } from '../../utils/game';

const OPERATORS = [
    { id: 'eq', label: 'Tepat (pas N)' },
    { id: 'lte', label: 'Maksimal (≤ N)' },
    { id: 'gte', label: 'Minimal (≥ N)' },
];

const RANKS = ['bronze', 'silver', 'gold', 'diamond', 'legend', 'potw'];

const CARD_FILTERS = [
    { id: 'ALL', label: 'Semua' },
    { id: 'BASIC', label: 'Basic' },
    { id: 'UCL', label: 'UCL' },
    { id: 'UEL', label: 'UEL' },
    { id: 'UECL', label: 'UECL' },
    { id: 'UEFA', label: 'UEFA' },
    { id: 'POTW', label: 'POTW' },
    { id: 'FLASHBACK', label: 'Flashback' },
    { id: 'HALLOWEEN', label: 'Halloween' },
    { id: 'LEGEND', label: 'Legend' },
];

const CHALLENGE_TYPES = [
    { id: 'match', label: 'Full Match 11v11' },
    { id: 'free_kick', label: 'Latihan Free Kick' },
    { id: 'penalty', label: 'Latihan Penalti' },
    { id: 'dribble', label: 'Latihan Dribble' },
];

const STATUS_LABEL = {
    live: ['LIVE', 'text-emerald-300'],
    upcoming: ['SEGERA', 'text-sky-300'],
    ended: ['SELESAI', 'text-midnight-300'],
    inactive: ['NONAKTIF', 'text-red-400'],
};

// Nilai datetime-local <-> ISO untuk input tanggal.
const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const p2 = (n) => String(n).padStart(2, '0');
const fmtLocal = (d) => `${d.y}-${p2(d.m)}-${p2(d.d)}T${p2(d.h)}:${p2(d.mi)}`;
const parseLocalInput = (v) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(v || ''));
    if (!m) return null;
    return { y: +m[1], m: +m[2], d: +m[3], h: +m[4], mi: +m[5] };
};
const todayDraft = () => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate(), h: 12, mi: 0 };
};
const fmtID = (d) => {
    try {
        return new Date(d.y, d.m - 1, d.d, d.h, d.mi).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return fmtLocal(d).replace('T', ' '); }
};

/* Kalender popup + jam: pengganti datetime-local bawaan agar konsisten di semua browser. */
function DateTimePicker({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(() => parseLocalInput(value) || todayDraft());

    const openIt = () => {
        setDraft(parseLocalInput(value) || todayDraft());
        setOpen(true);
    };
    const set = (patch) => {
        setDraft((prev) => {
            const next = { ...prev, ...patch };
            // Jepit tanggal ke jumlah hari bulan yang dipilih.
            const dim = new Date(next.y, next.m, 0).getDate();
            if (next.d > dim) next.d = dim;
            onChange(fmtLocal(next));
            return next;
        });
    };
    const moveMonth = (dir) => {
        setDraft((prev) => {
            const dt = new Date(prev.y, prev.m - 1 + dir, 1);
            const next = { ...prev, y: dt.getFullYear(), m: dt.getMonth() + 1 };
            const dim = new Date(next.y, next.m, 0).getDate();
            if (next.d > dim) next.d = dim;
            onChange(fmtLocal(next));
            return next;
        });
    };

    const dim = new Date(draft.y, draft.m, 0).getDate();
    const lead = (new Date(draft.y, draft.m - 1, 1).getDay() + 6) % 7; // Senin dulu
    const today = new Date();
    const isToday = (d) => draft.y === today.getFullYear() && draft.m === today.getMonth() + 1 && d === today.getDate();

    return (
        <div className="relative mt-1">
            <button
                type="button"
                onClick={() => (open ? setOpen(false) : openIt())}
                className="w-full flex items-center gap-2 bg-midnight-950/80 text-sm text-white px-4 py-2.5 rounded-xl border border-midnight-700 hover:border-midnight-400 text-left transition"
            >
                <i className="fa-solid fa-calendar-days text-midnight-300 shrink-0"></i>
                <span className={value ? '' : 'text-midnight-300/60'}>{value && draft ? fmtID(parseLocalInput(value) || draft) : 'Pilih tanggal…'}</span>
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute z-50 mt-2 left-0 w-[280px] max-w-[calc(100vw-3rem)] ff-card rounded-2xl p-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-2">
                            <button type="button" onClick={() => moveMonth(-1)} className="w-8 h-8 rounded-lg bg-midnight-800 text-midnight-200 hover:text-white"><i className="fa-solid fa-chevron-left text-xs"></i></button>
                            <p className="text-xs font-black uppercase tracking-wider text-white">{MONTHS_ID[draft.m - 1]} {draft.y}</p>
                            <button type="button" onClick={() => moveMonth(1)} className="w-8 h-8 rounded-lg bg-midnight-800 text-midnight-200 hover:text-white"><i className="fa-solid fa-chevron-right text-xs"></i></button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {DAYS_ID.map((d) => <span key={d} className="text-center text-[9px] font-bold text-midnight-300 py-1">{d}</span>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: lead }).map((_, i) => <span key={`b${i}`} />)}
                            {Array.from({ length: dim }).map((_, i) => {
                                const d = i + 1;
                                const sel = d === draft.d;
                                return (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => set({ d })}
                                        className={`h-8 rounded-lg text-xs font-bold transition ${sel ? 'bg-gradient-to-r from-midnight-600 to-midnight-400 text-white shadow' : isToday(d) ? 'border border-midnight-400/60 text-white' : 'text-midnight-200 hover:bg-midnight-800'}`}
                                    >
                                        {d}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                            <label className="flex-1">
                                <span className="text-[9px] font-bold uppercase text-midnight-300">Jam</span>
                                <select value={draft.h} onChange={(e) => set({ h: Number(e.target.value) })} className="mt-0.5 w-full bg-midnight-800 text-xs text-white px-2 py-2 rounded-lg border border-midnight-700">
                                    {Array.from({ length: 24 }).map((_, h) => <option key={h} value={h}>{p2(h)}</option>)}
                                </select>
                            </label>
                            <span className="text-white font-black mt-4">:</span>
                            <label className="flex-1">
                                <span className="text-[9px] font-bold uppercase text-midnight-300">Menit</span>
                                <select value={draft.mi} onChange={(e) => set({ mi: Number(e.target.value) })} className="mt-0.5 w-full bg-midnight-800 text-xs text-white px-2 py-2 rounded-lg border border-midnight-700">
                                    {Array.from({ length: 60 }).map((_, m) => <option key={m} value={m}>{p2(m)}</option>)}
                                </select>
                            </label>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="flex-1 ff-outline-btn py-2 rounded-xl text-[11px]">Hapus</button>
                            <button type="button" onClick={() => setOpen(false)} className="flex-1 gold-btn py-2 rounded-xl text-[11px] font-bold uppercase">Pilih</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export function AdminEvents() {
    const toast = useToast();
    const [events, setEvents] = useState([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [editing, setEditing] = useState(null); // null | 'new' | event-detail
    const [formations, setFormations] = useState({});

    const load = async () => {
        const { data } = await api.adminEvents({ page });
        setEvents(data.data);
        setLastPage(data.last_page);
    };

    useEffect(() => {
        load().catch(() => {});
        api.lineup().then(({ data }) => setFormations(data.formations || {})).catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const openNew = () => setEditing('new');

    const openEdit = async (id) => {
        try {
            const { data } = await api.adminEventDetail(id);
            setEditing(data);
        } catch (err) {
            toast(errMsg(err, 'Gagal memuat event.'), 'fa-circle-exclamation');
        }
    };

    const remove = async (e) => {
        if (!confirm(`Hapus event "${e.name}"? Riwayat percobaan user ikut terhapus.`)) return;
        try {
            await api.adminDeleteEvent(e.id);
            toast(`Event "${e.name}" dihapus.`);
            load();
        } catch (err) {
            toast(errMsg(err), 'fa-circle-exclamation');
        }
    };

    const toggleActive = async (e) => {
        if (e.is_active && e.status === 'live' && !confirm(`Event "${e.name}" sedang LIVE. Yakin nonaktifkan? User tidak bisa memainkannya.`)) return;
        try {
            const { data } = await api.adminToggleEventActive(e.id);
            toast(`Event "${e.name}" ${data.is_active ? 'diaktifkan.' : 'dinonaktifkan.'}`);
            load();
        } catch (err) {
            toast(errMsg(err), 'fa-circle-exclamation');
        }
    };

    return (
        <div className="space-y-6">
            <div className="ff-card p-5 rounded-2xl flex flex-wrap items-center gap-3">
                <div>
                    <h2 className="font-display text-xl font-black ff-gradient-text">KELOLA EVENT</h2>
                    <p className="text-xs text-midnight-300">Susun 11 pemain tantangan + rules XI user + hadiah koin/pemain.</p>
                </div>
                <button onClick={openNew} className="gold-btn px-4 py-2.5 rounded-xl text-xs font-bold uppercase ml-auto">
                    <i className="fa-solid fa-plus mr-1"></i> Buat Event
                </button>
            </div>

            <div className="space-y-2">
                {events.map((e) => {
                    const [label, cls] = STATUS_LABEL[e.status] || [e.status, 'text-midnight-200'];
                    return (
                        <div key={e.id} className="ff-card p-4 rounded-2xl flex flex-wrap items-center gap-3">
                            <div className="flex-1 min-w-[200px]">
                                <p className="text-sm font-bold text-white">{e.name} <span className={`ml-2 text-[10px] font-black ${cls}`}>{label}</span></p>
                                <p className="text-[11px] text-midnight-300">
                                    {timeID(e.starts_at)} &rarr; {timeID(e.ends_at)} &middot; {e.formation} &middot; {e.slots_count ?? 0}/11 pemain
                                </p>
                                <p className="text-[11px] text-midnight-300">
                                    Hadiah: {Number(e.reward_coins || 0).toLocaleString('id-ID')} koin{e.reward_tokens ? ` + ${e.reward_tokens}🎟` : ''}{e.reward_player ? ` + ${e.reward_player.name}` : ''}{e.reward_pack ? ` + ${e.reward_pack_draws || 0}x ${e.reward_pack.name}` : ''}
                                    {' '}&middot; {(e.rules || []).length} rules &middot; {e.attempts_count ?? 0} percobaan &middot; 🎟{e.token_cost ?? 1}/main
                                    {e.tiers_count > 1 ? ` · ${e.tiers_count} tier` : ''}{e.max_entries_per_user ? ` · max ${e.max_entries_per_user}x/user` : ''}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => toggleActive(e)} title={e.is_active ? 'Nonaktifkan event' : 'Aktifkan event'} className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${e.is_active ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10' : 'border-midnight-700 text-midnight-300'}`}>
                                    {e.is_active ? 'Aktif' : 'Nonaktif'}
                                </button>
                                <button onClick={() => openEdit(e.id)} className="ff-outline-btn px-4 py-2 rounded-xl text-xs">Edit</button>
                                <button onClick={() => remove(e)} className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25">Hapus</button>
                            </div>
                        </div>
                    );
                })}
                {events.length === 0 && <p className="text-xs text-midnight-300 text-center py-6">Belum ada event. Klik "Buat Event".</p>}
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

            {editing && (
                <EventForm
                    initial={editing === 'new' ? null : editing}
                    formations={formations}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); load(); }}
                />
            )}
        </div>
    );
}

function EventForm({ initial, formations, onClose, onSaved }) {
    const toast = useToast();
    const formationKeys = Object.keys(formations);
    const [name, setName] = useState(initial?.name || '');
    const [description, setDescription] = useState(initial?.description || '');
    const [startsAt, setStartsAt] = useState(toLocalInput(initial?.starts_at) || '');
    const [endsAt, setEndsAt] = useState(toLocalInput(initial?.ends_at) || '');
    const [formation, setFormation] = useState(initial?.formation || '4-3-3');
    const [isActive, setIsActive] = useState(initial ? !!initial.is_active : true);
    const [rewardCoins, setRewardCoins] = useState(initial?.reward_coins || 0);
    const [rewardPlayer, setRewardPlayer] = useState(initial?.reward_player || null);
    const [rewardPackId, setRewardPackId] = useState(initial?.reward_pack?.id || '');
    const [rewardPackDraws, setRewardPackDraws] = useState(initial?.reward_pack_draws || 1);
    const [rewardTokens, setRewardTokens] = useState(initial?.reward_tokens || 0);
    const [tier1Type, setTier1Type] = useState(
        (initial?.reward_tiers || []).find((t) => t.tier === 1)?.challenge_type || 'match'
    );
    const [tokenCost, setTokenCost] = useState(initial?.token_cost ?? 1);
    const [maxEntries, setMaxEntries] = useState(initial?.max_entries_per_user || '');
    // Tier lanjutan (kemenangan 2, 3, …). Tier 1 = kolom Koin/Pemain/Pack di bawah.
    // Tiap tier bisa "Gunakan line-up sebelumnya" (default) atau "Ganti line-up" sendiri.
    const [extraTiers, setExtraTiers] = useState(() =>
        (initial?.reward_tiers || []).filter((t) => t.tier > 1).map((t) => {
            const custom = {};
            (t.lineup || []).forEach((s) => { if (s?.player) custom[s.slot_id] = s.player; });
            const hasCustom = Object.keys(custom).length >= 11;
            return {
                reward_coins: t.reward_coins || 0,
                reward_player: t.reward_player || null,
                reward_pack_id: t.reward_pack?.id || '',
                reward_pack_draws: t.reward_pack_draws || 1,
                reward_tokens: t.reward_tokens || 0,
                token_cost: t.token_cost ?? initial?.token_cost ?? 1,
                challenge_type: t.challenge_type || 'match',
                ovr_boost: t.ovr_boost || 0,
                use_previous_lineup: t.use_previous_lineup ?? !hasCustom,
                formation: t.formation || t.effective_formation || initial?.formation || '4-3-3',
                starters: custom,
            };
        })
    );
    const [packs, setPacks] = useState([]);
    useEffect(() => {
        api.adminPacks().then(({ data }) => setPacks(Array.isArray(data) ? data : data.data || [])).catch(() => {});
    }, []);
    const [xi, setXi] = useState(() => {
        // slot_id -> player
        const m = {};
        (initial?.slots || []).forEach((s) => { if (s?.player) m[s.slot_id] = s.player; });
        return m;
    });
    const [rules, setRules] = useState(
        (initial?.rules || []).map((r) => ({ kind: r.kind, code: r.code, operator: r.operator, count: r.count }))
    );
    const [picker, setPicker] = useState(null); // {for: slotId | 'reward' | 'tierplayer-i' | 'tierxi-i-slotId'}
    const [saving, setSaving] = useState(false);

    const slots = formations[formation] || [];
    const filled = slots.filter((s) => xi[s.id]).length;
    const usedIds = new Set([...Object.values(xi).map((p) => p.id), ...(rewardPlayer ? [rewardPlayer.id] : []), ...extraTiers.filter((t) => t.reward_player).map((t) => t.reward_player.id)]);

    // Line-up efektif tier ke-i (resolve "gunakan sebelumnya" ke belakang, mentok di XI utama).
    const effectiveTierLineup = (idx) => {
        if (idx < 0) return { formation, xi };
        const t = extraTiers[idx];
        if (!t || t.use_previous_lineup) return effectiveTierLineup(idx - 1);
        return { formation: t.formation || formation, xi: t.starters || {} };
    };
    const copyPrevLineup = (idx) => {
        const prev = effectiveTierLineup(idx - 1);
        setExtraTiers((ts) => ts.map((t, j) => (j === idx ? {
            ...t,
            use_previous_lineup: false,
            formation: prev.formation,
            starters: { ...prev.xi },
        } : t)));
    };
    const changeTierFormation = (idx, f) => {
        setExtraTiers((ts) => ts.map((t, j) => {
            if (j !== idx) return t;
            const next = {};
            (formations[f] || []).forEach((s) => { if (t.starters?.[s.id]) next[s.id] = t.starters[s.id]; });
            return { ...t, formation: f, starters: next };
        }));
    };
    // Exclude picker: XI cukup cegah duplikat dalam XI itu sendiri (antar-tier boleh sama).
    const pickerExclude = (() => {
        if (!picker) return usedIds;
        const m = String(picker.for || '');
        if (m.startsWith('tierxi-')) {
            const idx = Number(m.split('-')[1]);
            return new Set(Object.values(extraTiers[idx]?.starters || {}).map((p) => p.id));
        }
        return usedIds;
    })();

    const changeFormation = (f) => {
        // Pertahankan pemain yang slot-nya masih ada di formasi baru.
        setFormation(f);
        setXi((prev) => {
            const next = {};
            (formations[f] || []).forEach((s) => { if (prev[s.id]) next[s.id] = prev[s.id]; });
            return next;
        });
    };

    const addRule = () => setRules((r) => [...r, { kind: 'country', code: 'FR', operator: 'eq', count: 2 }]);
    const updateRule = (i, patch) => setRules((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    const delRule = (i) => setRules((rs) => rs.filter((_, j) => j !== i));

    const addTier = () => {
        if (extraTiers.length >= 9) { toast('Maksimal 10 tier (1 + 9 lanjutan).', 'fa-circle-exclamation'); return; }
        setExtraTiers((ts) => [...ts, { reward_coins: 0, reward_player: null, reward_pack_id: '', reward_pack_draws: 1, reward_tokens: 2, token_cost: Number(tokenCost) || 1, challenge_type: 'match', ovr_boost: 2, use_previous_lineup: true, formation, starters: {} }]);
    };
    const updateTier = (i, patch) => setExtraTiers((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
    const delTier = (i) => setExtraTiers((ts) => ts.filter((_, j) => j !== i));

    const save = async () => {
        if (!name.trim()) { toast('Nama event wajib diisi.', 'fa-circle-exclamation'); return; }
        if (!startsAt || !endsAt) { toast('Tanggal mulai & selesai wajib diisi.', 'fa-circle-exclamation'); return; }
        if (slots.length !== 11 || filled < 11) { toast(`XI event belum lengkap (${filled}/11).`, 'fa-circle-exclamation'); return; }
        const nowIso = new Date().toISOString();
        const startIso = fromLocalInput(startsAt);
        const endIso = fromLocalInput(endsAt);
        if (isActive && endIso < nowIso) { toast('Tanggal selesai sudah lewat — event tidak akan pernah live. Perbaiki tanggalnya.', 'fa-circle-exclamation'); return; }
        if (initial?.id && initial?.status === 'live' && !isActive && !confirm(`Event "${name.trim()}" sedang LIVE. Yakin simpan sebagai nonaktif?`)) return;
        const upcomingInfo = isActive && startIso > nowIso;
        for (let i = 0; i < extraTiers.length; i++) {
            const t = extraTiers[i];
            if (t.use_previous_lineup) continue;
            const tSlots = formations[t.formation || formation] || [];
            const tFilled = tSlots.filter((s) => t.starters?.[s.id]).length;
            if (tSlots.length !== 11 || tFilled < 11) {
                toast(`Line-up Tier ${i + 2} belum lengkap (${tFilled}/11) — lengkapi atau centang "gunakan line-up sebelumnya".`, 'fa-circle-exclamation');
                return;
            }
        }
        setSaving(true);
        try {
            const payload = {
                name: name.trim(),
                description: description.trim() || null,
                starts_at: fromLocalInput(startsAt),
                ends_at: fromLocalInput(endsAt),
                formation,
                starters: slots.map((s) => ({ slot_id: s.id, player_id: xi[s.id].id })),
                rules: rules.map((r) => ({ kind: r.kind, code: r.code, operator: r.operator, count: Number(r.count) })),
                reward_coins: Number(rewardCoins) || 0,
                reward_player_id: rewardPlayer?.id || null,
                reward_pack_id: rewardPackId || null,
                reward_pack_draws: rewardPackId ? Math.min(5, Math.max(1, Number(rewardPackDraws) || 1)) : null,
                reward_tokens: Math.max(0, Number(rewardTokens) || 0),
                token_cost: Math.min(20, Math.max(0, Number(tokenCost) || 0)),
                max_entries_per_user: maxEntries ? Math.min(100, Math.max(1, Number(maxEntries) || 0)) : null,
                tiers: [
                    {
                        tier: 1,
                        reward_coins: Number(rewardCoins) || 0,
                        reward_player_id: rewardPlayer?.id || null,
                        reward_pack_id: rewardPackId || null,
                        reward_pack_draws: rewardPackId ? Math.min(5, Math.max(1, Number(rewardPackDraws) || 1)) : 0,
                        reward_tokens: Math.max(0, Number(rewardTokens) || 0),
                        token_cost: Math.min(20, Math.max(0, Number(tokenCost) || 0)),
                        challenge_type: tier1Type || 'match',
                        ovr_boost: 0,
                    },
                    ...extraTiers.map((t, i) => {
                        const usePrev = !!t.use_previous_lineup;
                        const tSlots = formations[t.formation || formation] || [];
                        return {
                            tier: i + 2,
                            reward_coins: Number(t.reward_coins) || 0,
                            reward_player_id: t.reward_player?.id || null,
                            reward_pack_id: t.reward_pack_id || null,
                            reward_pack_draws: t.reward_pack_id ? Math.min(5, Math.max(1, Number(t.reward_pack_draws) || 1)) : 0,
                            reward_tokens: Math.max(0, Number(t.reward_tokens) || 0),
                            token_cost: Math.min(20, Math.max(0, Number(t.token_cost ?? tokenCost) || 0)),
                            challenge_type: t.challenge_type || 'match',
                            ovr_boost: Math.min(30, Math.max(0, Number(t.ovr_boost) || 0)),
                            formation: usePrev ? null : (t.formation || formation),
                            use_previous_lineup: usePrev,
                            starters: usePrev ? null : tSlots.map((s) => ({ slot_id: s.id, player_id: t.starters[s.id].id })),
                        };
                    }),
                ],
                is_active: !!isActive,
            };
            if (initial && initial.id) {
                await api.adminUpdateEvent(initial.id, payload);
                toast(`Event "${payload.name}" diperbarui.${upcomingInfo ? ' Live mulai sesuai tanggal.' : ''}`);
            } else {
                await api.adminStoreEvent(payload);
                toast(`Event "${payload.name}" dibuat.${upcomingInfo ? ' Live mulai sesuai tanggal.' : ''}`);
            }
            onSaved();
        } catch (err) {
            const fails = err?.response?.data;
            toast(errMsg(err, 'Gagal menyimpan event.'), 'fa-circle-exclamation');
            if (fails?.errors) console.warn(fails.errors);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm overflow-y-auto p-4">
            <div className="max-w-3xl mx-auto ff-card rounded-3xl p-6 space-y-5 my-6">
                <div className="flex items-center gap-3">
                    <h3 className="font-display text-lg font-black ff-gradient-text">{initial?.id ? 'EDIT EVENT' : 'BUAT EVENT'}</h3>
                    <button onClick={onClose} className="ml-auto text-midnight-300 hover:text-white text-lg"><i className="fa-solid fa-xmark"></i></button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block sm:col-span-2">
                        <span className="text-[11px] font-bold uppercase text-midnight-300">Nama event</span>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="cth: French Wall Challenge" className="mt-1 w-full bg-midnight-950/80 text-sm text-white px-4 py-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400" />
                    </label>
                    <label className="block sm:col-span-2">
                        <span className="text-[11px] font-bold uppercase text-midnight-300">Deskripsi (opsional)</span>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Cerita / syarat singkat event..." className="mt-1 w-full bg-midnight-950/80 text-sm text-white px-4 py-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400" />
                    </label>
                    <div className="block">
                        <span className="text-[11px] font-bold uppercase text-midnight-300">Mulai</span>
                        <DateTimePicker value={startsAt} onChange={setStartsAt} />
                    </div>
                    <div className="block">
                        <span className="text-[11px] font-bold uppercase text-midnight-300">Selesai</span>
                        <DateTimePicker value={endsAt} onChange={setEndsAt} />
                    </div>
                    <label className="block">
                        <span className="text-[11px] font-bold uppercase text-midnight-300">Formasi XI event</span>
                        <select value={formation} onChange={(e) => changeFormation(e.target.value)} className="mt-1 w-full bg-midnight-950/80 text-sm text-white px-4 py-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400">
                            {(formationKeys.length ? formationKeys : ['4-3-3']).map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </label>
                    <label className="flex items-center gap-2 mt-5">
                        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-emerald-400" />
                        <span className="text-xs text-midnight-200 font-bold">Event aktif</span>
                    </label>
                </div>

                <div>
                    <h4 className="text-xs font-black uppercase text-midnight-200 mb-2">
                        <i className="fa-solid fa-users mr-1"></i> XI Event (lawan user) — {filled}/11
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {slots.map((s) => {
                            const p = xi[s.id];
                            return (
                                <button key={s.id} type="button" onClick={() => setPicker({ for: s.id })}
                                    className="flex items-center gap-2 p-2.5 rounded-xl bg-midnight-950/60 border border-midnight-700/50 text-left hover:border-midnight-400">
                                    <span className="text-[10px] font-black text-gold-300 w-10 shrink-0">{s.id}</span>
                                    {p ? (
                                        <>
                                            <Flag code={p.country_code} />
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-xs font-bold text-white truncate">{p.name}</span>
                                                <span className="block text-[10px] text-midnight-300">{p.position} &middot; OVR {p.ovr}</span>
                                            </span>
                                            <span title="Lepas" onClick={(e) => { e.stopPropagation(); setXi((prev) => { const n = { ...prev }; delete n[s.id]; return n; }); }}
                                                className="text-midnight-300 hover:text-red-400 px-1"><i className="fa-solid fa-xmark text-xs"></i></span>
                                        </>
                                    ) : (
                                        <span className="text-[11px] text-midnight-300">+ Pilih pemain ({s.pos})</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-xs font-black uppercase text-midnight-200"><i className="fa-solid fa-scale-balanced mr-1"></i> Rules XI User ({rules.length})</h4>
                        <button onClick={addRule} className="ml-auto ff-outline-btn px-3 py-1.5 rounded-lg text-[11px]"><i className="fa-solid fa-plus mr-1"></i>Tambah</button>
                    </div>
                    <p className="text-[11px] text-midnight-300 mb-2">Contoh: tepat 2 pemain France → user yang XI-nya berisi &lt;2 atau &gt;2 pemain France tidak bisa melawan XI event.</p>
                    <div className="space-y-2">
                        {rules.map((r, i) => (
                            <div key={i} className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-midnight-950/60 border border-midnight-700/50">
                                <select value={r.kind} onChange={(e) => updateRule(i, { kind: e.target.value, code: e.target.value === 'rank' ? 'gold' : 'FR' })}
                                    className="bg-midnight-800 text-xs text-white px-2.5 py-2 rounded-lg border border-midnight-700">
                                    <option value="country">Negara</option>
                                    <option value="rank">Rank</option>
                                </select>
                                {r.kind === 'country' ? (
                                    <select value={r.code} onChange={(e) => updateRule(i, { code: e.target.value })}
                                        className="bg-midnight-800 text-xs text-white px-2.5 py-2 rounded-lg border border-midnight-700 max-w-[180px]">
                                        {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                                    </select>
                                ) : (
                                    <select value={String(r.code).toLowerCase()} onChange={(e) => updateRule(i, { code: e.target.value })}
                                        className="bg-midnight-800 text-xs text-white px-2.5 py-2 rounded-lg border border-midnight-700">
                                        {RANKS.map((x) => <option key={x} value={x}>{x === 'potw' ? '★ POTW' : x}</option>)}
                                    </select>
                                )}
                                <select value={r.operator} onChange={(e) => updateRule(i, { operator: e.target.value })}
                                    className="bg-midnight-800 text-xs text-white px-2.5 py-2 rounded-lg border border-midnight-700">
                                    {OPERATORS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                                </select>
                                <input type="number" min={0} max={11} value={r.count} onChange={(e) => updateRule(i, { count: e.target.value })}
                                    className="w-16 bg-midnight-800 text-xs text-white px-2.5 py-2 rounded-lg border border-midnight-700" />
                                <button onClick={() => delRule(i)} className="text-red-400 hover:text-red-300 px-2"><i className="fa-solid fa-trash text-xs"></i></button>
                            </div>
                        ))}
                        {rules.length === 0 && <p className="text-[11px] text-midnight-300">Tanpa rules — semua XI user boleh melawan.</p>}
                    </div>
                </div>

                <div>
                    <h4 className="text-xs font-black uppercase text-midnight-200 mb-2"><i className="fa-solid fa-gift mr-1"></i> Hadiah Tier 1 (kemenangan pertama)</h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                        <label className="block">
                            <span className="text-[11px] font-bold uppercase text-midnight-300">Koin</span>
                            <input type="number" min={0} max={1000000} value={rewardCoins} onChange={(e) => setRewardCoins(e.target.value)}
                                className="mt-1 w-full bg-midnight-950/80 text-sm text-white px-4 py-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400" />
                        </label>
                        <div>
                            <span className="text-[11px] font-bold uppercase text-midnight-300">Pemain (opsional)</span>
                            <button type="button" onClick={() => setPicker({ for: 'reward' })}
                                className="mt-1 w-full flex items-center gap-2 p-2.5 rounded-xl bg-midnight-950/60 border border-midnight-700/50 text-left hover:border-midnight-400">
                                {rewardPlayer ? (
                                    <>
                                        <Flag code={rewardPlayer.country_code} />
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-xs font-bold text-white truncate">{rewardPlayer.name}</span>
                                            <span className="block text-[10px] text-midnight-300">{rewardPlayer.position} &middot; OVR {rewardPlayer.ovr}</span>
                                        </span>
                                        <span title="Lepas" onClick={(e) => { e.stopPropagation(); setRewardPlayer(null); }} className="text-midnight-300 hover:text-red-400 px-1"><i className="fa-solid fa-xmark text-xs"></i></span>
                                    </>
                                ) : (
                                    <span className="text-[11px] text-midnight-300">+ Pilih pemain hadiah</span>
                                )}
                            </button>
                        </div>
                        <label className="block">
                            <span className="text-[11px] font-bold uppercase text-midnight-300">Pack gacha (opsional)</span>
                            <select value={rewardPackId} onChange={(e) => setRewardPackId(e.target.value ? Number(e.target.value) : '')}
                                className="mt-1 w-full bg-midnight-950/80 text-sm text-white px-4 py-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400">
                                <option value="">— Tanpa pack —</option>
                                {packs.map((pk) => (
                                    <option key={pk.id} value={pk.id}>{pk.name}{pk.is_active ? '' : ' (nonaktif)'}</option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-[11px] font-bold uppercase text-midnight-300">Draw gratis (1–5)</span>
                            <input type="number" min={1} max={5} value={rewardPackDraws} disabled={!rewardPackId}
                                onChange={(e) => setRewardPackDraws(e.target.value)}
                                className="mt-1 w-full bg-midnight-950/80 text-sm text-white px-4 py-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400 disabled:opacity-40" />
                        </label>
                        <label className="block">
                            <span className="text-[11px] font-bold uppercase text-midnight-300">Token hadiah</span>
                            <input type="number" min={0} max={100000} value={rewardTokens} onChange={(e) => setRewardTokens(e.target.value)}
                                className="mt-1 w-full bg-midnight-950/80 text-sm text-white px-4 py-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400" />
                        </label>
                        <label className="block">
                            <span className="text-[11px] font-bold uppercase text-midnight-300">Jenis tantangan Tier 1</span>
                            <select value={tier1Type} onChange={(e) => setTier1Type(e.target.value)}
                                className="mt-1 w-full bg-midnight-950/80 text-sm text-white px-4 py-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400">
                                {CHALLENGE_TYPES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                        </label>
                    </div>
                    <p className="text-[10px] text-midnight-300/70 mt-2">Menang pertama = koin + token + pemain + draw gratis otomatis dari pack terpilih (masuk koleksi &amp; riwayat gacha). Sekali klaim.</p>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-xs font-black uppercase text-midnight-200"><i className="fa-solid fa-layer-group mr-1"></i> Tier Lanjutan (kemenangan 2, 3, …)</h4>
                        <button type="button" onClick={addTier} className="ml-auto ff-outline-btn px-3 py-1.5 rounded-lg text-[11px]"><i className="fa-solid fa-plus mr-1"></i>Tier</button>
                    </div>
                    <p className="text-[10px] text-midnight-300/70 mb-2">Tiap kemenangan berikutnya memperebutkan tier di bawahnya (sekali klaim per tier). OVR Boost menaikkan kekuatan lawan di tier itu — atau ganti line-up lawan per tier agar makin sulit.</p>
                    <div className="space-y-2">
                        {extraTiers.map((t, i) => (
                            <div key={i} className="p-3 rounded-2xl bg-midnight-950/60 border border-midnight-700/50 space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-black text-gold-300">Tier {i + 2}{t.ovr_boost > 0 ? ` (+${t.ovr_boost} OVR lawan)` : ''}{!t.use_previous_lineup ? ' · XI custom' : ''}{t.challenge_type && t.challenge_type !== 'match' ? ` · ${(CHALLENGE_TYPES.find((c) => c.id === t.challenge_type) || {}).label || t.challenge_type}` : ''}</span>
                                    <button type="button" onClick={() => delTier(i)} className="ml-auto text-red-400 hover:text-red-300 px-2"><i className="fa-solid fa-trash text-xs"></i></button>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-2">
                                    <label className="block">
                                        <span className="text-[10px] font-bold uppercase text-midnight-300">Jenis tantangan</span>
                                        <select value={t.challenge_type || 'match'} onChange={(e) => updateTier(i, { challenge_type: e.target.value })}
                                            className="mt-1 w-full bg-midnight-800 text-xs text-white px-2.5 py-2 rounded-lg border border-midnight-700">
                                            {CHALLENGE_TYPES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                                        </select>
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="block">
                                            <span className="text-[10px] font-bold uppercase text-midnight-300">Biaya 🎟/main</span>
                                            <input type="number" min={0} max={20} value={t.token_cost ?? 1} onChange={(e) => updateTier(i, { token_cost: e.target.value })}
                                                className="mt-1 w-full bg-midnight-800 text-xs text-white px-2.5 py-2 rounded-lg border border-midnight-700" />
                                        </label>
                                        <label className="block">
                                            <span className="text-[10px] font-bold uppercase text-midnight-300">Hadiah 🎟</span>
                                            <input type="number" min={0} max={100000} value={t.reward_tokens ?? 0} onChange={(e) => updateTier(i, { reward_tokens: e.target.value })}
                                                className="mt-1 w-full bg-midnight-800 text-xs text-white px-2.5 py-2 rounded-lg border border-midnight-700" />
                                        </label>
                                    </div>
                                </div>
                                <div className="grid sm:grid-cols-3 gap-2">
                                    <label className="block">
                                        <span className="text-[10px] font-bold uppercase text-midnight-300">Koin</span>
                                        <input type="number" min={0} max={1000000} value={t.reward_coins} onChange={(e) => updateTier(i, { reward_coins: e.target.value })}
                                            className="mt-1 w-full bg-midnight-800 text-xs text-white px-2.5 py-2 rounded-lg border border-midnight-700" />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-bold uppercase text-midnight-300">OVR Boost lawan</span>
                                        <input type="number" min={0} max={30} value={t.ovr_boost} onChange={(e) => updateTier(i, { ovr_boost: e.target.value })}
                                            className="mt-1 w-full bg-midnight-800 text-xs text-white px-2.5 py-2 rounded-lg border border-midnight-700" />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-bold uppercase text-midnight-300">Draw (1–5)</span>
                                        <input type="number" min={1} max={5} value={t.reward_pack_draws} disabled={!t.reward_pack_id} onChange={(e) => updateTier(i, { reward_pack_draws: e.target.value })}
                                            className="mt-1 w-full bg-midnight-800 text-xs text-white px-2.5 py-2 rounded-lg border border-midnight-700 disabled:opacity-40" />
                                    </label>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setPicker({ for: `tierplayer-${i}` })}
                                        className="flex items-center gap-2 p-2 rounded-xl bg-midnight-800/60 border border-midnight-700/50 text-left hover:border-midnight-400 min-w-0">
                                        {t.reward_player ? (
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-[11px] font-bold text-white truncate">{t.reward_player.name}</span>
                                                <span className="block text-[10px] text-midnight-300">OVR {t.reward_player.ovr}</span>
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-midnight-300">+ Pemain</span>
                                        )}
                                        {t.reward_player && <span onClick={(e) => { e.stopPropagation(); updateTier(i, { reward_player: null }); }} className="text-midnight-300 hover:text-red-400 px-1 shrink-0"><i className="fa-solid fa-xmark text-xs"></i></span>}
                                    </button>
                                    <select value={t.reward_pack_id} onChange={(e) => updateTier(i, { reward_pack_id: e.target.value ? Number(e.target.value) : '' })}
                                        className="bg-midnight-800 text-xs text-white px-2.5 py-2 rounded-xl border border-midnight-700">
                                        <option value="">— Tanpa pack —</option>
                                        {packs.map((pk) => <option key={pk.id} value={pk.id}>{pk.name}</option>)}
                                    </select>
                                </div>
                                <div className="p-2.5 rounded-xl bg-midnight-800/40 border border-midnight-700/50 space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={!!t.use_previous_lineup} onChange={(e) => updateTier(i, { use_previous_lineup: e.target.checked })} className="w-4 h-4 accent-emerald-400" />
                                        <span className="text-[11px] font-bold text-midnight-200">Gunakan line-up {i === 0 ? 'utama (Tier 1)' : `Tier ${i + 1}`}</span>
                                    </label>
                                    {!t.use_previous_lineup && (() => {
                                        const tSlots = formations[t.formation || formation] || [];
                                        const tFilled = tSlots.filter((s) => t.starters?.[s.id]).length;
                                        return (
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <label className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold uppercase text-midnight-300">Formasi</span>
                                                        <select value={t.formation || formation} onChange={(e) => changeTierFormation(i, e.target.value)}
                                                            className="bg-midnight-800 text-xs text-white px-2.5 py-2 rounded-lg border border-midnight-700">
                                                            {(formationKeys.length ? formationKeys : ['4-3-3']).map((f) => <option key={f} value={f}>{f}</option>)}
                                                        </select>
                                                    </label>
                                                    <span className="text-[10px] text-midnight-300">{tFilled}/11</span>
                                                    <button type="button" onClick={() => copyPrevLineup(i)} className="ml-auto ff-outline-btn px-2.5 py-1.5 rounded-lg text-[10px]">
                                                        <i className="fa-solid fa-copy mr-1"></i>Salin dari sebelumnya
                                                    </button>
                                                </div>
                                                <div className="grid sm:grid-cols-2 gap-1.5">
                                                    {tSlots.map((s) => {
                                                        const p = t.starters?.[s.id];
                                                        return (
                                                            <div key={s.id} className="flex items-center gap-1.5 p-2 rounded-lg bg-midnight-950/60 border border-midnight-700/50">
                                                                <button type="button" onClick={() => setPicker({ for: `tierxi-${i}-${s.id}` })}
                                                                    className="flex flex-1 items-center gap-1.5 text-left min-w-0">
                                                                    <span className="text-[9px] font-black text-gold-300 w-9 shrink-0">{s.id}</span>
                                                                    {p ? (
                                                                        <span className="flex-1 min-w-0">
                                                                            <span className="block text-[11px] font-bold text-white truncate">{p.name}</span>
                                                                            <span className="block text-[9px] text-midnight-300">{p.position} · OVR {p.ovr}</span>
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] text-midnight-300">+ ({s.pos})</span>
                                                                    )}
                                                                </button>
                                                                {p && <button type="button" onClick={() => setExtraTiers((ts) => ts.map((row, j) => (j === i ? { ...row, starters: (() => { const n = { ...row.starters }; delete n[s.id]; return n; })() } : row)))} className="text-midnight-300 hover:text-red-400 px-1 shrink-0"><i className="fa-solid fa-xmark text-xs"></i></button>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        ))}
                        {extraTiers.length === 0 && <p className="text-[11px] text-midnight-300">Hanya Tier 1 — event selesai setelah kemenangan pertama.</p>}
                    </div>
                </div>

                <div>
                    <h4 className="text-xs font-black uppercase text-midnight-200 mb-2"><i className="fa-solid fa-door-open mr-1"></i> Biaya &amp; Batas Masuk</h4>
                    <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
                        <label className="block">
                            <span className="text-[11px] font-bold uppercase text-midnight-300">Biaya token default (🎟/percobaan)</span>
                            <input type="number" min={0} max={20} value={tokenCost} onChange={(e) => setTokenCost(e.target.value)}
                                className="mt-1 w-full bg-midnight-950/80 text-sm text-white px-4 py-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400" />
                        </label>
                        <label className="block">
                            <span className="text-[11px] font-bold uppercase text-midnight-300">Maks. percobaan per user (kosong = tanpa batas)</span>
                            <input type="number" min={1} max={100} value={maxEntries} onChange={(e) => setMaxEntries(e.target.value)} placeholder="Tanpa batas"
                                className="mt-1 w-full bg-midnight-950/80 text-sm text-white px-4 py-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400" />
                        </label>
                    </div>
                    <p className="text-[10px] text-midnight-300/70 mt-2">Tiap percobaan memotong token sesuai biaya tier-nya (dipakai juga saat kalah). Token didapat dari klaim harian &amp; hadiah tier.</p>
                </div>

                <div className="flex gap-2 justify-end pt-1">
                    <button onClick={onClose} className="ff-outline-btn px-5 py-2.5 rounded-xl text-xs">Batal</button>
                    <button onClick={save} disabled={saving} className="gold-btn px-5 py-2.5 rounded-xl text-xs font-bold uppercase disabled:opacity-50">
                        {saving ? 'Menyimpan...' : 'Simpan Event'}
                    </button>
                </div>
            </div>

            {picker && (
                <PlayerSearchModal
                    exclude={pickerExclude}
                    onPick={(p) => {
                        const key = String(picker.for || '');
                        if (key === 'reward') setRewardPlayer(p);
                        else if (key.startsWith('tierplayer-')) {
                            updateTier(Number(key.split('-')[1]), { reward_player: p });
                        } else if (key.startsWith('tierxi-')) {
                            const [, idx, ...rest] = key.split('-');
                            const slotId = rest.join('-');
                            setExtraTiers((ts) => ts.map((row, j) => (j === Number(idx) ? { ...row, starters: { ...row.starters, [slotId]: p } } : row)));
                        } else setXi((prev) => ({ ...prev, [picker.for]: p }));
                        setPicker(null);
                    }}
                    onClose={() => setPicker(null)}
                />
            )}
        </div>
    );
}

function PlayerSearchModal({ exclude, onPick, onClose }) {
    const [q, setQ] = useState('');
    const [group, setGroup] = useState('ALL'); // ALL | GK | DF | MF | FW
    const [card, setCard] = useState('ALL'); // ALL | BASIC | UCL | UEL | UECL | UEFA | POTW | FLASHBACK | HALLOWEEN | LEGEND
    const [sort, setSort] = useState('ovr-desc'); // ovr-desc | ovr-asc | name-asc
    const [results, setResults] = useState([]);
    const [total, setTotal] = useState(0);
    useEffect(() => {
        const t = setTimeout(async () => {
            try {
                const params = { search: q.trim() || undefined, per_page: 12, sort };
                if (group !== 'ALL') params.position = group;
                if (card !== 'ALL') params.category = card.toLowerCase();
                const { data } = await api.players(params);
                setResults((data.data || []).filter((p) => !exclude.has(p.id)));
                setTotal(data.total ?? 0);
            } catch { /* abaikan */ }
        }, 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, group, sort, card]);
    return (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
            <div className="max-w-lg mx-auto ff-card rounded-2xl p-5 my-10" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-3">
                    <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari pemain (nama/klub)..."
                        className="flex-1 bg-midnight-950/80 text-sm text-white px-4 py-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400" />
                    <button onClick={onClose} className="text-midnight-300 hover:text-white px-2"><i className="fa-solid fa-xmark"></i></button>
                </div>
                <div className="flex items-center gap-1.5 mb-1 overflow-x-auto pb-1">
                    {['ALL', 'GK', 'DF', 'MF', 'FW'].map((g) => (
                        <button
                            key={g}
                            type="button"
                            onClick={() => setGroup(g)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition ${group === g ? 'bg-gradient-to-r from-midnight-600 to-midnight-400 text-white' : 'text-midnight-300 bg-midnight-900/60 hover:bg-midnight-800'}`}
                        >
                            {g === 'ALL' ? 'Semua' : g}
                        </button>
                    ))}
                    <select value={sort} onChange={(e) => setSort(e.target.value)} className="ml-auto bg-midnight-900/60 text-[10px] font-bold uppercase text-midnight-200 px-2 py-1.5 rounded-lg border border-midnight-700 shrink-0">
                        <option value="ovr-desc">OVR ↓</option>
                        <option value="ovr-asc">OVR ↑</option>
                        <option value="name-asc">Nama A–Z</option>
                    </select>
                </div>
                <div className="flex items-center gap-1.5 mb-1 overflow-x-auto pb-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-midnight-300 shrink-0 mr-0.5">
                        <i className="fa-solid fa-clone mr-1"></i>Kartu
                    </span>
                    {CARD_FILTERS.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCard(c.id)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition ${card === c.id ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-midnight-950' : 'text-midnight-300 bg-midnight-900/60 hover:bg-midnight-800'}`}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
                <p className="text-[10px] text-midnight-300/70 mb-2">{total} pemain cocok</p>
                <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
                    {results.map((p) => (
                        <button key={p.id} onClick={() => onPick(p)} className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-midnight-950/60 border border-midnight-700/50 hover:border-midnight-400 text-left">
                            <Flag code={p.country_code} />
                            <span className="flex-1 min-w-0">
                                <span className="block text-xs font-bold text-white truncate">{p.name}</span>
                                <span className="block text-[10px] text-midnight-300">{p.club} &middot; {p.position} &middot; OVR {p.ovr} &middot; {countryName(p.country_code) || p.nationality || ''}</span>
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider text-gold-300 shrink-0">{cardLabel(p)}</span>
                        </button>
                    ))}
                    {results.length === 0 && <p className="text-[11px] text-midnight-300 text-center py-4">Tidak ada pemain yang cocok.</p>}
                </div>
            </div>
        </div>
    );
}

function Flag({ code }) {
    const [err, setErr] = useState(0);
    // Normalisasi dulu (FIFA 3-huruf dll.) agar kode valid tak pernah 404.
    const norm = normalizeCode(code);
    const src = norm ? flagUrl(norm, 40) : null;
    if (!src) return <span className="w-6 h-4 rounded bg-midnight-700 shrink-0 inline-block"></span>;
    if (err) return <span title={norm} className="w-6 h-4 rounded bg-midnight-700 border border-midnight-400/40 text-midnight-200 text-[8px] font-black flex items-center justify-center shrink-0">{norm.slice(0, 2)}</span>;
    return (
        <img src={src}
            onError={() => setErr(1)} alt="" className="w-6 h-4 rounded object-cover shrink-0 bg-midnight-800" loading="lazy" />
    );
}
