import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { COUNTRIES, flagUrl } from '../../utils/countries';
import { PlayerCard, EmptyState, Modal, RankBadge } from '../../components/common';
import { PlayerDetail } from '../../components/PlayerModals';
import { errMsg } from '../../utils/game';
import { DETAIL_GROUPS, GK_DETAIL_GROUP, deriveDetailedStats, detailedStatsOf } from '../../utils/playerAttributes';

const OUT_STATS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];
const GK_STATS = ['div', 'han', 'kic', 'ref', 'spd', 'pos'];
const ALT_CHOICES = ['LB', 'CB', 'RB', 'LM', 'CM', 'CDM', 'CAM', 'RM', 'LW', 'ST', 'SS', 'RW'];
const LABELS = {
    pac: 'PAC', sho: 'SHO', pas: 'PAS', dri: 'DRI', def: 'DEF', phy: 'PHY',
    div: 'DIV', han: 'HAN', kic: 'KIC', ref: 'REF', spd: 'SPD', pos: 'POS',
};

const CATEGORIES = [
    { id: 'ALL', label: 'Semua', icon: 'fa-border-all' },
    { id: 'BASIC', label: 'Basic', icon: 'fa-layer-group' },
    { id: 'LEGEND', label: 'Legend', icon: 'fa-crown' },
    { id: 'POTW', label: 'POTW', icon: 'fa-star' },
    { id: 'FLASHBACK', label: 'Flashback', icon: 'fa-bolt' },
    { id: 'HALLOWEEN', label: 'Halloween', icon: 'fa-ghost' },
    { id: 'UEFA', label: 'UEFA League', icon: 'fa-shield-halved' },
    { id: 'UCL', label: 'UCL', icon: 'fa-trophy' },
    { id: 'UEL', label: 'UEL', icon: 'fa-medal' },
    { id: 'UECL', label: 'UECL', icon: 'fa-award' },
];

export function AdminPlayers() {
    const toast = useToast();
    const [players, setPlayers] = useState([]);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('ALL'); // ALL | BASIC | LEGEND | POTW (sama seperti User Mode)
    const [detail, setDetail] = useState(null);
    const [editing, setEditing] = useState(null); // null | {} | player

    const load = async (cat) => {
        const { data } = await api.players({
            page, per_page: 24, sort: 'ovr-desc',
            search: search.trim() || undefined,
            category: (cat ?? category) !== 'ALL' ? (cat ?? category).toLowerCase() : undefined,
        });
        setPlayers(data.data);
        setMeta(data);
    };

    useEffect(() => {
        load().catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, category]);

    useEffect(() => {
        const t = setTimeout(() => {
            setPage(1);
            if (page === 1) load().catch(() => {});
        }, 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const remove = async (p) => {
        if (!confirm(`Hapus "${p.name}"? Pemain ikut lepas dari koleksi & lineup user yang memilikinya.`)) return;
        try {
            const { data } = await api.adminPlayersDelete(p.id);
            toast(data.message || `"${p.name}" dihapus.`);
            load();
        } catch (err) {
            toast(errMsg(err), 'fa-circle-exclamation');
        }
    };

    const togglePool = async (p) => {
        try {
            await api.adminTogglePool(p.id);
            toast(`${p.name}: pool ${p.is_active_in_gacha ? 'dinonaktifkan' : 'diaktifkan'}.`);
            load();
        } catch (err) {
            toast(errMsg(err), 'fa-circle-exclamation');
        }
    };

    const toggleVisibility = async (p) => {
        try {
            await api.adminToggleVisibility(p.id);
            toast(`${p.name}: ${p.is_visible ? 'disembunyikan dari daftar pemain.' : 'ditampilkan di daftar pemain.'}`);
            load();
        } catch (err) {
            toast(errMsg(err), 'fa-circle-exclamation');
        }
    };

    return (
        <div className="space-y-6">
            <div className="ff-card p-5 rounded-2xl flex flex-wrap items-center gap-3">
                <div>
                    <h2 className="font-display text-xl font-black ff-gradient-text">KELOLA PEMAIN</h2>
                    <p className="text-xs text-midnight-300">OVR & rank dihitung otomatis server. Total: {meta?.total ?? 0}</p>
                </div>
                <div className="ml-auto flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-56">
                        <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-midnight-300 text-xs"></i>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari pemain..."
                            className="w-full bg-midnight-950/80 text-xs text-white placeholder-midnight-300/60 pl-9 pr-4 py-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400 transition"
                        />
                    </div>
                    <button onClick={() => setEditing({})} className="gold-btn px-4 py-2.5 rounded-xl text-xs font-bold uppercase whitespace-nowrap">
                        <i className="fa-solid fa-plus mr-1"></i> Tambah
                    </button>
                </div>
            </div>

            <div className="ff-card p-4 rounded-2xl flex items-center gap-1.5 overflow-x-auto">
                {CATEGORIES.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => { setCategory(c.id); setPage(1); }}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap ${
                            category === c.id
                                ? c.id === 'POTW'
                                    ? 'bg-gradient-to-r from-[#2f8f22] to-[#59C749] text-white shadow-lg'
                                    : c.id === 'LEGEND'
                                      ? 'bg-gradient-to-r from-[#8a6414] to-[#f0cd56] text-[#3a2800] shadow-lg'
                                      : c.id === 'FLASHBACK'
                                        ? 'bg-gradient-to-r from-[#3157D5] to-[#5B7CFF] text-white shadow-lg'
                                        : c.id === 'HALLOWEEN'
                                          ? 'bg-gradient-to-r from-[#3b1454] to-[#ea580c] text-white shadow-lg'
                                          : c.id === 'UEFA'
                                          ? 'bg-gradient-to-r from-[#312e81] to-[#7c3aed] text-white shadow-lg'
                                          : c.id === 'UCL'
                                            ? 'bg-gradient-to-r from-[#101d68] to-[#22d3ee] text-white shadow-lg'
                                            : c.id === 'UEL'
                                              ? 'bg-gradient-to-r from-[#7c2d12] to-[#fb923c] text-white shadow-lg'
                                              : c.id === 'UECL'
                                                ? 'bg-gradient-to-r from-[#022c1c] to-[#00ffa3] text-white shadow-lg'
                                                : 'bg-gradient-to-r from-midnight-600 to-midnight-400 text-white shadow-lg'
                                : 'text-midnight-300 bg-midnight-900/60 hover:bg-midnight-800'
                        }`}
                    >
                        {c.icon && <i className={`fa-solid ${c.icon} mr-1`}></i>}{c.label}
                    </button>
                ))}
                <span className="text-[10px] text-midnight-300/70 whitespace-nowrap ml-1 hidden sm:inline">
                    {category === 'POTW' ? 'hanya Player of the Week' : category === 'LEGEND' ? 'hanya kartu Legend' : category === 'FLASHBACK' ? 'hanya kartu Flashback (max OVR 97)' : category === 'HALLOWEEN' ? 'hanya kartu Halloween (OVR 78-98)' : category === 'UEFA' ? 'gabungan UCL + UEL + UECL (max OVR 97)' : category === 'UCL' ? 'hanya kartu UCL (max OVR 97)' : category === 'UEL' ? 'hanya kartu UEL (max OVR 97)' : category === 'UECL' ? 'hanya kartu UECL (max OVR 97)' : category === 'BASIC' ? 'Diamond / Gold / Silver / Bronze' : 'semua kartu'}
                </span>
            </div>

            {players.length === 0 ? (
                <EmptyState title="Belum Ada Pemain" subtitle="Tambahkan pemain master pertama." />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {players.map((p) => (
                        <div key={p.id} className="relative">
                            <div className={p.is_visible === false ? 'opacity-55' : ''}>
                                <PlayerCard player={p} onClick={() => setDetail(p)} />
                            </div>
                            {p.is_visible === false && (
                                <span className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-black/75 border border-midnight-400/50 text-[9px] font-black uppercase tracking-wider text-midnight-200">
                                    <i className="fa-solid fa-eye-slash mr-1"></i>Hidden
                                </span>
                            )}
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 translate-y-14 flex gap-1.5 opacity-0 hover:opacity-100 focus-within:opacity-100 transition">
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => setEditing(p)} className="flex-1 ff-outline-btn py-1.5 rounded-lg text-[10px] font-bold uppercase">
                                    <i className="fa-solid fa-pen mr-1"></i> Edit
                                </button>
                                <button onClick={() => togglePool(p)} title="Aktif/nonaktif pool gacha" className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition ${p.is_active_in_gacha ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10' : 'border-midnight-700 text-midnight-300'}`}>
                                    {p.is_active_in_gacha ? 'Pool ON' : 'Pool OFF'}
                                </button>
                                <button onClick={() => toggleVisibility(p)} title="Tampil/sembunyi di daftar pemain user" className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition ${p.is_visible ? 'border-midnight-400/60 text-midnight-200 bg-midnight-600/20' : 'border-midnight-700 text-midnight-300'}`}>
                                    <i className={`fa-solid ${p.is_visible ? 'fa-eye' : 'fa-eye-slash'} mr-1`}></i> {p.is_visible ? 'View ON' : 'View OFF'}
                                </button>
                                <button onClick={() => remove(p)} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-600 hover:text-white transition">
                                    <i className="fa-solid fa-trash mr-1"></i> Hapus
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {meta && meta.last_page > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button disabled={page <= 1} onClick={() => setPage((x) => x - 1)} className="ff-outline-btn px-4 py-2 rounded-xl text-xs disabled:opacity-40">
                        <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <span className="text-xs text-midnight-300">{page} / {meta.last_page}</span>
                    <button disabled={page >= meta.last_page} onClick={() => setPage((x) => x + 1)} className="ff-outline-btn px-4 py-2 rounded-xl text-xs disabled:opacity-40">
                        <i className="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            )}

            <PlayerDetail player={detail} onClose={() => setDetail(null)} />
            {editing !== null && (
                <PlayerForm
                    player={editing.id ? editing : null}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        load();
                    }}
                />
            )}
        </div>
    );
}

const CARD_OPTIONS = [
    { value: 'basic', label: 'Basic', note: 'Diamond / Gold / Silver / Bronze', icon: 'fa-layer-group', tone: 'text-slate-300', tint: 'border-slate-400/30 bg-slate-400/10' },
    { value: 'legend', label: 'Legend', note: 'OVR max 97', icon: 'fa-crown', tone: 'text-[#f0cd56]', tint: 'border-[#f0cd56]/35 bg-[#f0cd56]/10' },
    { value: 'potw', label: 'POTW', note: 'OVR max 97', icon: 'fa-star', tone: 'text-[#7ee86a]', tint: 'border-[#59C749]/35 bg-[#59C749]/10' },
    { value: 'flashback', label: 'Flashback', note: 'OVR max 97', icon: 'fa-bolt', tone: 'text-[#8aa2ff]', tint: 'border-[#5B7CFF]/35 bg-[#3157D5]/10' },
    { value: 'halloween', label: 'Halloween', note: 'OVR 78-98', icon: 'fa-ghost', tone: 'text-lime-300', tint: 'border-lime-300/40 bg-lime-500/10' },
    { value: 'ucl', label: 'UCL', note: 'OVR max 97', icon: 'fa-trophy', tone: 'text-cyan-300', tint: 'border-cyan-300/35 bg-cyan-500/10' },
    { value: 'uel', label: 'UEL Europa', note: 'OVR max 97', icon: 'fa-medal', tone: 'text-orange-300', tint: 'border-orange-300/35 bg-orange-500/10' },
    { value: 'uecl', label: 'UECL Conference', note: 'OVR max 97', icon: 'fa-award', tone: 'text-emerald-300', tint: 'border-emerald-300/35 bg-emerald-500/10' },
];

function CardTypeSelect({ value, onChange, inputCls }) {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const rootRef = useRef(null);
    const triggerRef = useRef(null);
    const selectedIndex = Math.max(0, CARD_OPTIONS.findIndex((o) => o.value === value));
    const selected = CARD_OPTIONS[selectedIndex];

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e) => {
            if (!rootRef.current?.contains(e.target)) {
                setOpen(false);
            }
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                setOpen(false);
                triggerRef.current?.focus();
            }
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown, true);
        };
    }, [open]);

    const openList = () => {
        setActiveIndex(selectedIndex);
        setOpen(true);
    };

    const choose = (option) => {
        onChange(option.value);
        setOpen(false);
        triggerRef.current?.focus();
    };

    const onTriggerKeyDown = (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) {
                openList();
                return;
            }
            const step = e.key === 'ArrowDown' ? 1 : -1;
            setActiveIndex((i) => (i + step + CARD_OPTIONS.length) % CARD_OPTIONS.length);
            return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (open) {
                choose(CARD_OPTIONS[activeIndex]);
            } else {
                openList();
            }
            return;
        }
        if (e.key === 'Escape' && open) {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
        }
    };

    const onBlur = (e) => {
        if (!rootRef.current?.contains(e.relatedTarget)) {
            setOpen(false);
        }
    };

    return (
        <div ref={rootRef} className="relative" onBlur={onBlur}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => (open ? setOpen(false) : openList())}
                onKeyDown={onTriggerKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-activedescendant={open ? `card-type-${CARD_OPTIONS[activeIndex].value}` : undefined}
                className={`${inputCls} flex cursor-pointer items-center gap-3 pr-3 text-left`}
            >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${selected.tint} ${selected.tone}`}>
                    <i className={`fa-solid ${selected.icon} text-xs`}></i>
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-white">{selected.label}</span>
                    <span className="block text-[10px] text-midnight-300">{selected.note}</span>
                </span>
                <i className={`fa-solid fa-chevron-down text-[10px] text-midnight-300 transition-transform ${open ? 'rotate-180' : ''}`}></i>
            </button>

            {open && (
                <div
                    role="listbox"
                    aria-label="Pilih tipe kartu"
                    className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-2xl border border-midnight-400/40 bg-[#070d1f]/98 shadow-2xl shadow-black/60 ring-1 ring-white/5 backdrop-blur-xl"
                >
                    <div className="overflow-y-auto p-1.5" style={{ maxHeight: 'min(26rem, 55vh)' }}>
                        {CARD_OPTIONS.map((option, index) => {
                            const active = option.value === value;
                            const highlighted = index === activeIndex;
                            return (
                                <button
                                    key={option.value}
                                    id={`card-type-${option.value}`}
                                    type="button"
                                    role="option"
                                    aria-selected={active}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={() => choose(option)}
                                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${
                                        highlighted ? 'bg-midnight-700/80' : 'hover:bg-midnight-800/70'
                                    }`}
                                >
                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${option.tint} ${option.tone}`}>
                                        <i className={`fa-solid ${option.icon} text-xs`}></i>
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-xs font-bold text-white">{option.label}</span>
                                        <span className="block text-[10px] text-midnight-300">{option.note}</span>
                                    </span>
                                    {active && <i className="fa-solid fa-check text-[10px] text-orange-300"></i>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function PlayerForm({ player, onClose, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState(() => ({
        name: player?.name || '',
        club: player?.club || '',
        nationality: player?.nationality || '',
        country_code: player?.country_code || '',
        position: player?.position || 'ST',
        alt_positions: Array.isArray(player?.alt_positions) ? player.alt_positions : [],
        preferred_foot: player?.preferred_foot || 'right',
        shirt_number: player?.shirt_number || 10,
        age: player?.age || 25,
        pac: player?.pac || 80, sho: player?.sho || 80, pas: player?.pas || 80,
        dri: player?.dri || 80, def: player?.def || 50, phy: player?.phy || 70,
        div: player?.div || 75, han: player?.han || 75, kic: player?.kic || 70,
        ref: player?.ref || 78, spd: player?.spd || 60, pos: player?.pos || 75,
        ...detailedStatsOf(player || {}),
        rank: player?.manual_rank && player?.rank ? player.rank : '',
        is_potw: player?.is_potw ?? false,
        is_flashback: player?.is_flashback ?? false,
        is_halloween: player?.is_halloween ?? false,
        is_ucl: player?.is_ucl ?? false,
        is_uel: player?.is_uel ?? false,
        is_uecl: player?.is_uecl ?? false,
        is_active_in_gacha: player?.is_active_in_gacha ?? true,
    }));
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [imgError, setImgError] = useState('');
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
    const detailGroups = form.position === 'GK' ? [GK_DETAIL_GROUP, ...DETAIL_GROUPS] : DETAIL_GROUPS;
    const syncDetails = () => setForm({ ...form, ...deriveDetailedStats(form) });

    // Posisi alternatif: maksimal 3, tanpa posisi utama, GK tidak campur outfield.
    const toggleAlt = (pos) => {
        const cur = Array.isArray(form.alt_positions) ? form.alt_positions : [];
        const next = cur.includes(pos) ? cur.filter((x) => x !== pos) : [...cur, pos].slice(0, 3);
        setForm({ ...form, alt_positions: next.filter((x) => x !== form.position) });
    };
    const pickMainPosition = (e) => {
        const position = e.target.value;
        setForm({
            ...form,
            position,
            alt_positions: (Array.isArray(form.alt_positions) ? form.alt_positions : []).filter((x) => x !== position),
        });
    };

    // Tiga tingkat: Card (Basic/Legend/POTW/Flashback/Halloween/UCL/UEL/UECL) lalu Rank khusus Basic
    // (Auto dari OVR atau Diamond/Gold/Silver/Bronze manual).
    // Flashback, Halloween, UEFA (UCL/UEL/UECL) & POTW saling lepas (satu kartu hanya satu status spesial);
    // prioritas tampil: Flashback > Halloween > UCL > UEL > UECL > POTW.
    // OVR kartu spesial dicap max 97, kecuali Halloween yang memakai rentang 78-98.
    const cardType = form.is_flashback ? 'flashback' : form.is_halloween ? 'halloween' : form.is_ucl ? 'ucl' : form.is_uel ? 'uel' : form.is_uecl ? 'uecl' : form.is_potw ? 'potw' : (form.rank === 'legend' ? 'legend' : 'basic');
    const pickCardType = (v) => {
        const reset = { rank: '', is_potw: false, is_flashback: false, is_halloween: false, is_ucl: false, is_uel: false, is_uecl: false };
        if (v === 'flashback') setForm({ ...form, ...reset, is_flashback: true });
        else if (v === 'halloween') setForm({ ...form, ...reset, is_halloween: true });
        else if (v === 'ucl') setForm({ ...form, ...reset, is_ucl: true });
        else if (v === 'uel') setForm({ ...form, ...reset, is_uel: true });
        else if (v === 'uecl') setForm({ ...form, ...reset, is_uecl: true });
        else if (v === 'potw') setForm({ ...form, ...reset, is_potw: true });
        else if (v === 'legend') setForm({ ...form, ...reset, rank: 'legend' });
        else setForm({ ...form, ...reset });
    };

    const pickCountry = (e) => {
        const code = e.target.value;
        const found = COUNTRIES.find((c) => c.code === code);
        setForm({ ...form, country_code: code, nationality: found ? found.name : form.nationality });
    };

    // Ketik nama negara manual → cocokkan kode bendera otomatis agar selalu ada gambarnya.
    const typeNationality = (e) => {
        const nationality = e.target.value;
        const found = COUNTRIES.find((c) => c.name.toLowerCase() === nationality.trim().toLowerCase());
        setForm({ ...form, nationality, country_code: found ? found.code : form.country_code });
    };

    const pickFile = (e) => {
        const f = e.target.files[0] || null;
        setImgError('');
        if (f && !/^image\/(jpeg|png|webp)$/.test(f.type)) {
            setImgError('Format harus JPG / PNG / WebP. Foto iPhone (HEIC) perlu dikonversi dulu.');
            setFile(null);
            e.target.value = '';
            return;
        }
        setFile(f);
    };

    // Downscale di browser (seperti prototype): foto HP puluhan MB jadi ~150KB JPEG.
    const processImage = (f) =>
        new Promise((resolve, reject) => {
            const url = URL.createObjectURL(f);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                  const MAX = 1200;
                let { width: w, height: h } = img;
                if (w > h && w > MAX) {
                    h = Math.round((h * MAX) / w);
                    w = MAX;
                } else if (h >= w && h > MAX) {
                    w = Math.round((w * MAX) / h);
                    h = MAX;
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Foto tidak bisa diproses browser ini.'));
                            return;
                        }
                        resolve(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
                    },
                      'image/jpeg',
                      0.92
                  );
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('File foto rusak / tidak bisa dibaca.'));
            };
            img.src = url;
        });

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => {
                if (k === 'rank' && !v) return;
                if (k === 'alt_positions') {
                    // Kirim sebagai JSON agar backend bisa validasi array.
                    fd.append(k, JSON.stringify(Array.isArray(v) ? v : []));
                    return;
                }
                // FormData hanya string: boolean harus jadi 1/0 agar lolos rule `boolean` Laravel
                fd.append(k, typeof v === 'boolean' ? (v ? 1 : 0) : v);
            });
            if (file) fd.append('image', await processImage(file));
            let saved;
            if (player) {
                fd.append('_method', 'PUT'); // spoof via body (bukan query) agar file ikut terkirim
                saved = (await api.adminPlayersUpdate(player.id, fd)).data;
            } else {
                saved = (await api.adminPlayersStore(fd)).data;
            }
            if (file && !saved.image_path) {
                toast('Data tersimpan, tapi foto tidak ikut tersimpan. Coba lagi.', 'fa-triangle-exclamation');
            } else {
                toast(player ? 'Pemain diperbarui.' : 'Pemain ditambahkan.');
            }
            onSaved();
        } catch (err) {
            const errors = err?.response?.data?.errors;
            toast(errors ? Object.values(errors)[0]?.[0] : err.message || errMsg(err, 'Gagal menyimpan.'), 'fa-circle-exclamation');
        } finally {
            setBusy(false);
        }
    };

    const inputCls = 'w-full bg-midnight-950/80 text-xs text-white p-3 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400 transition';

    return (
        <Modal open onClose={onClose} maxWidth="max-w-xl">
            <h3 className="font-display text-lg font-bold ff-gradient-text mb-6">
                {player ? `Edit: ${player.name}` : 'Tambah Pemain Baru'}
            </h3>
            <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input required value={form.name} onChange={set('name')} placeholder="Nama pemain *" className={inputCls} />
                    <input required value={form.club} onChange={set('club')} placeholder="Klub *" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <select value={form.position} onChange={pickMainPosition} className={inputCls}>
                        <optgroup label="Goalkeeper">
                            <option value="GK">GK (Goalkeeper)</option>
                        </optgroup>
                        <optgroup label="Defender — LB, CB, RB">
                            <option value="LB">LB (Left Back)</option>
                            <option value="CB">CB (Center Back)</option>
                            <option value="RB">RB (Right Back)</option>
                        </optgroup>
                        <optgroup label="Midfielder — LM, CM, CDM, CAM, RM">
                            <option value="LM">LM (Left Midfield)</option>
                            <option value="CM">CM (Center Midfield)</option>
                            <option value="CDM">CDM (Defensive Midfield)</option>
                            <option value="CAM">CAM (Attacking Midfield)</option>
                            <option value="RM">RM (Right Midfield)</option>
                        </optgroup>
                        <optgroup label="Forward — LW, ST, SS, RW">
                            <option value="LW">LW (Left Wing)</option>
                            <option value="ST">ST (Striker)</option>
                            <option value="SS">SS (Second Striker)</option>
                            <option value="RW">RW (Right Wing)</option>
                        </optgroup>
                        {['DF', 'MF', 'FW'].includes(form.position) && (
                            <optgroup label="Data lama (tetap valid)">
                                <option value={form.position}>{form.position} (lama — disarankan ubah ke posisi detail)</option>
                            </optgroup>
                        )}
                    </select>
                    <input type="number" min={1} max={99} value={form.shirt_number} onChange={set('shirt_number')} placeholder="No. punggung" className={inputCls} />
                </div>
                <div>
                    <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1">
                        <i className="fa-solid fa-shuffle mr-1"></i>Posisi alternatif (maks 3, OVR tidak turun di posisi ini)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {ALT_CHOICES.filter((c) => c !== form.position).map((c) => {
                            const active = (form.alt_positions || []).includes(c);
                            return (
                                <button
                                    type="button"
                                    key={c}
                                    onClick={() => toggleAlt(c)}
                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider border transition ${
                                        active
                                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 text-white border-emerald-300 shadow'
                                            : 'bg-midnight-950/80 text-midnight-300 border-midnight-700 hover:border-midnight-400'
                                    }`}
                                    title={active ? `Hapus ${c} dari posisi alternatif` : `Jadikan ${c} posisi alternatif (contoh: ST + LW ala Mbappe)`}
                                >
                                    {active && <i className="fa-solid fa-check mr-1"></i>}{c}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[10px] text-midnight-300/80 mt-1">
                        Contoh: Mbappe utama ST + alternatif LW → dipasang di LW/ST OVR utuh. Kosongkan bila pemain hanya natural di satu posisi.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4 items-start">
                    <div>
                        <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1"><i className="fa-solid fa-shoe-prints mr-1"></i>Kaki utama</label>
                        <select value={form.preferred_foot} onChange={set('preferred_foot')} className={`${inputCls} cursor-pointer`}>
                            <option value="right">Kanan (Right)</option>
                            <option value="left">Kiri (Left)</option>
                            <option value="both">Dua kaki (Both)</option>
                        </select>
                        <p className="text-[10px] text-midnight-300/80 mt-1">Detail sama persis aman (0). Geser selini (LM→CM, ST→LW): −2 bila kaki sesuai slot, −3 bila tidak. Beda lini: −3/−10.</p>
                    </div>
                    <input type="number" min={15} max={50} value={form.age} onChange={set('age')} placeholder="Umur" className={`${inputCls} self-start`} />
                </div>
                <div className="grid grid-cols-1 gap-4 items-start">
                    <div>
                        <div className="flex items-center gap-2">
                            {form.country_code && (
                                <img src={flagUrl(form.country_code, 40)} alt="" className="w-6 h-[18px] rounded-[3px] object-cover shadow shrink-0" />
                            )}
                            <select value={form.country_code} onChange={pickCountry} className={`${inputCls} cursor-pointer`}>
                                <option value="">— Negara (tanpa bendera) —</option>
                                {COUNTRIES.map((c) => (
                                    <option key={c.code} value={c.code}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <input value={form.nationality} onChange={typeNationality} placeholder="Nama negara (otomatis)" className={`${inputCls} mt-2`} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1">Card</label>
                        <CardTypeSelect value={cardType} onChange={pickCardType} inputCls={inputCls} />
                        {cardType === 'basic' && (
                            <>
                                <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1 mt-3">Rank Basic</label>
                                <select value={form.rank || ''} onChange={set('rank')} className={`${inputCls} cursor-pointer`}>
                                    <option value="">Otomatis sesuai statistik</option>
                                    <option value="diamond">Diamond</option>
                                    <option value="gold">Gold</option>
                                    <option value="silver">Silver</option>
                                    <option value="bronze">Bronze</option>
                                </select>
                            </>
                        )}
                        <p className="text-[10px] text-midnight-300/80 mt-1">
                            {cardType === 'basic'
                                ? 'Rank otomatis dari statistik + posisi, atau pilih manual.'
                                : cardType === 'legend'
                                  ? 'Legend = kategori sendiri, OVR dicap max 97.'
                                  : cardType === 'flashback'
                                    ? 'Flashback = kartu spesial midnight-blue, OVR dicap max 97.'
                                    : cardType === 'halloween'
                                      ? 'Halloween = kartu spesial event (hitam-ungu + kabut hijau racun, emblem kuali), OVR 78-98.'
                                      : cardType === 'ucl'
                                      ? 'UCL = kartu spesial starball Champions League (navy + cyan), OVR dicap max 97.'
                                      : cardType === 'uel'
                                        ? 'UEL = kartu spesial Europa League (hitam + oranye garis diagonal), OVR dicap max 97.'
                                        : cardType === 'uecl'
                                          ? 'UECL = kartu spesial Conference League (hitam-hijau gelombang neon, beda dari POTW), OVR dicap max 97.'
                                          : 'POTW = kategori sendiri, rank otomatis dari OVR, max 97.'}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 justify-center">
                        <label className="flex items-center gap-2 text-xs text-midnight-300 cursor-pointer">
                            <input type="checkbox" checked={!!form.is_active_in_gacha} onChange={set('is_active_in_gacha')} className="accent-midnight-400" />
                            Aktif di pool gacha
                        </label>
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1">Foto (jpg/png/webp, max 5MB)</label>
                    {(file || player?.image_url) && (
                        <div className="flex items-center gap-3 mb-2">
                            <img
                                src={file ? URL.createObjectURL(file) : player.image_url}
                                alt="preview"
                                className="w-16 h-16 rounded-xl object-cover object-top border border-midnight-400/40"
                            />
                            <span className="text-[11px] text-midnight-300 truncate">
                                {file ? file.name : 'Foto saat ini tersimpan'}
                            </span>
                        </div>
                    )}
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} className="text-xs text-midnight-300" />
                    {imgError && <p className="text-[11px] text-red-400 mt-1">{imgError}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {(form.position === 'GK' ? GK_STATS : OUT_STATS).map((s) => (
                        <div key={s}>
                            <label className="flex justify-between text-xs text-midnight-300 mb-1">
                                <span>{LABELS[s]}{form.position === 'GK' && <span className="ml-1 text-[9px] text-gold-300">GK</span>}</span>
                                <span className="text-midnight-200 font-bold">{form[s]}</span>
                            </label>
                            <input type="range" min={30} max={99} value={form[s]} onChange={set(s)} className="w-full cursor-pointer" />
                        </div>
                    ))}
                </div>
                <div className="rounded-2xl border border-midnight-700/70 bg-midnight-950/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <label className="text-[10px] text-midnight-300 uppercase font-semibold">
                            <i className="fa-solid fa-list-check mr-1"></i>Atribut detail
                        </label>
                        <button type="button" onClick={syncDetails} className="text-[10px] font-bold uppercase text-midnight-200 hover:text-white">
                            <i className="fa-solid fa-rotate mr-1"></i>Sinkron dari ringkasan
                        </button>
                    </div>
                    <div className="mt-3 max-h-80 space-y-4 overflow-y-auto pr-1">
                        {detailGroups.map((grp) => (
                            <div key={grp.key}>
                                <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-midnight-200">
                                    <i className={`fa-solid ${grp.icon} mr-1 text-midnight-400`}></i>{grp.label}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                    {grp.fields.map(([key, label]) => (
                                        <div key={key}>
                                            <label className="flex justify-between text-[11px] text-midnight-300 mb-0.5">
                                                <span>{label}</span>
                                                <span className="text-midnight-200 font-bold">{form[key]}</span>
                                            </label>
                                            <input type="range" min={30} max={99} value={form[key]} onChange={set(key)} className="w-full cursor-pointer" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <p className="text-[10px] text-midnight-300">
                    {form.position === 'GK'
                        ? 'Kiper memakai atribut DIV/HAN/KIC/REF/SPD/POS (Diving, Handling, Kicking, Reflexes, Speed, Positioning).'
                        : 'OVR & rank dihitung otomatis server dari statistik + posisi.'}
                </p>
                <div className="flex justify-end gap-3 pt-4 border-t border-midnight-400/20">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs text-midnight-300">Batal</button>
                    <button type="submit" disabled={busy} className="gold-btn px-6 py-2.5 rounded-xl text-xs font-bold uppercase disabled:opacity-50">
                        {busy ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export { RankBadge };
