import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { EmptyState, Modal } from '../../components/common';
import { FunCategoryManager } from '../../components/FunCategoryManager';
import { cardOf, errMsg, imgSrc } from '../../utils/game';

export function AdminFunTeams() {
    const toast = useToast();
    const [teams, setTeams] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showCategories, setShowCategories] = useState(false);
    const [editing, setEditing] = useState(null); // null | {id?, ...}

    const load = async () => {
        const [teamsRes, categoriesRes] = await Promise.all([
            api.adminFunTeams(),
            api.adminFunCategories(),
        ]);
        setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : teamsRes.data.data || []);
        setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
    };

    useEffect(() => {
        load().catch(() => {});
    }, []);

    const remove = async (t) => {
        if (!confirm(`Hapus tim fun "${t.name}"? Riwayat laga yang sudah dimainkan tetap tersimpan.`)) return;
        try {
            const { data } = await api.adminDeleteFunTeam(t.id);
            toast(data.message || 'Tim dihapus.');
            load();
        } catch (err) {
            toast(errMsg(err), 'fa-circle-exclamation');
        }
    };

    const toggle = async (t) => {
        try {
            await api.adminToggleFunTeam(t.id);
            toast(`${t.name}: ${t.is_active ? 'dinonaktifkan' : 'diaktifkan'}.`);
            load();
        } catch (err) {
            toast(errMsg(err), 'fa-circle-exclamation');
        }
    };

    return (
        <div className="space-y-6">
            <div className="ff-card p-5 rounded-2xl flex flex-wrap items-center gap-3">
                <div>
                    <h2 className="font-display text-xl font-black ff-gradient-text">TIM FUN MATCH</h2>
                    <p className="text-xs text-midnight-300">Upload tim CPU + susun XI, lalu tempatkan di benua/liga. Total: {teams.length}</p>
                </div>
                <button onClick={() => setShowCategories((v) => !v)} className="ml-auto ff-outline-btn px-4 py-2.5 rounded-xl text-xs font-bold uppercase whitespace-nowrap">
                    <i className={`fa-solid ${showCategories ? 'fa-chevron-up' : 'fa-earth-asia'} mr-1`}></i>
                    Kategori &amp; Liga
                </button>
                <button onClick={() => setEditing({})} className="gold-btn px-4 py-2.5 rounded-xl text-xs font-bold uppercase whitespace-nowrap">
                    <i className="fa-solid fa-plus mr-1"></i> Tambah Tim
                </button>
            </div>

            {showCategories && (
                <div className="ff-card p-5 rounded-2xl">
                    <FunCategoryManager categories={categories} teams={teams} onChanged={load} />
                </div>
            )}

            {teams.length === 0 ? (
                <EmptyState title="Belum Ada Tim Fun" subtitle="Upload tim pertama beserta lineup XI-nya." />
            ) : (
                <div className="space-y-2">
                    {teams.map((t) => (
                        <div key={t.id} className={`p-3 rounded-xl bg-midnight-950/60 border border-midnight-700/50 ${t.is_active ? '' : 'opacity-60'}`}>
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#101d68] to-[#060b30] border border-cyan-300/50 flex items-center justify-center text-cyan-200 font-display font-black text-xs shrink-0">
                                    {t.short_name || t.name.slice(0, 3).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-[160px]">
                                    <p className="text-sm font-bold text-white">
                                        {t.name}
                                        {!t.is_active && <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-midnight-800 border border-midnight-700 text-midnight-300 uppercase">OFF</span>}
                                    </p>
                                    <p className="text-[10px] text-midnight-300">
                                        <span className="text-cyan-200 font-bold">{t.category?.name || 'Tanpa kategori'}</span>
                                        {' · '}{t.league?.name || 'National'}{' · '}
                                        {t.formation} &middot; Base OVR {t.base_team_ovr ?? t.team_ovr} &middot;
                                        Chemistry {t.chemistry ?? 0} (+{t.chemistry_bonus ?? 0} OVR) &middot; {t.filled}/11 terisi
                                        {t.penalty_total > 0 && <span className="text-red-400"> &middot; penalty -{t.penalty_total}</span>}
                                    </p>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <button onClick={() => setEditing(t)} className="ff-outline-btn px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase">
                                        <i className="fa-solid fa-pen mr-1"></i> Edit / Lineup
                                    </button>
                                    <button onClick={() => toggle(t)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition ${t.is_active ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10' : 'border-midnight-700 text-midnight-300'}`}>
                                        {t.is_active ? 'Aktif' : 'Nonaktif'}
                                    </button>
                                    <button onClick={() => remove(t)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-600 hover:text-white transition">
                                        <i className="fa-solid fa-trash mr-1"></i> Hapus
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editing !== null && (
                <FunTeamForm
                    team={editing.id ? editing : null}
                    categories={categories}
                    onManageCategories={() => {
                        setEditing(null);
                        setShowCategories(true);
                    }}
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

function FunTeamForm({ team, categories = [], onManageCategories, onClose, onSaved }) {
    const toast = useToast();
    const [formations, setFormations] = useState({});
    const [form, setForm] = useState(() => ({
        name: team?.name || '',
        short_name: team?.short_name || '',
        fun_category_id: team?.fun_category_id || '',
        type: team?.fun_league_id ? 'league' : 'national',
        fun_league_id: team?.fun_league_id || '',
        formation: team?.formation || '4-3-3',
        is_active: team?.is_active ?? true,
    }));
    // assignments: { slotId: player }
    const [assignments, setAssignments] = useState(() => {
        const m = {};
        (team?.starters || []).forEach((s) => {
            if (s?.player?.id) m[s.slot_id] = s.player;
        });
        return m;
    });
    const [activeSlot, setActiveSlot] = useState(null);
    const [search, setSearch] = useState('');
    const [results, setResults] = useState([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        api.lineup().then(({ data }) => setFormations(data.formations || {})).catch(() => {});
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            api.players({ search: search.trim() || undefined, per_page: 12, sort: 'ovr-desc' })
                .then(({ data }) => setResults(data.data || []))
                .catch(() => {});
        }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const slots = formations[form.formation] || [];
    const filled = slots.filter((sl) => assignments[sl.id]?.id).length;
    const selectedCategory = categories.find((c) => Number(c.id) === Number(form.fun_category_id)) || null;
    const leagueOptions = selectedCategory?.leagues || [];

    const pickFormation = (formation) => {
        // Pindah formasi = susunan ulang dari nol agar slot selalu valid.
        setForm({ ...form, formation });
        setAssignments({});
        setActiveSlot(null);
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!form.fun_category_id) {
            toast('Pilih benua/kategori dulu. Buat kategori di menu Kategori & Liga bila belum ada.', 'fa-circle-exclamation');
            return;
        }
        if (form.type === 'league' && !form.fun_league_id) {
            toast('Pilih liga untuk tim ini, atau ubah tipe ke National.', 'fa-circle-exclamation');
            return;
        }
        if (filled < slots.length || slots.length === 0) {
            toast(`Lengkapi dulu XI (${filled}/${slots.length || 11}).`, 'fa-circle-exclamation');
            return;
        }
        setBusy(true);
        try {
            const starters = slots.map((sl) => ({ slot_id: sl.id, player_id: assignments[sl.id].id }));
            const payload = {
                name: form.name,
                short_name: form.short_name,
                formation: form.formation,
                is_active: form.is_active,
                fun_category_id: Number(form.fun_category_id),
                fun_league_id: form.type === 'league' ? Number(form.fun_league_id) : null,
                starters,
            };
            if (team) await api.adminUpdateFunTeam(team.id, payload);
            else await api.adminStoreFunTeam(payload);
            toast(team ? 'Tim fun diperbarui.' : 'Tim fun ditambahkan.');
            onSaved();
        } catch (err) {
            toast(errMsg(err, 'Gagal menyimpan.'), 'fa-circle-exclamation');
        } finally {
            setBusy(false);
        }
    };

    const inputCls = 'w-full bg-midnight-950/80 text-xs text-white p-3 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400 transition';

    return (
        <Modal open onClose={onClose} maxWidth="max-w-3xl">
            <h3 className="font-display text-lg font-bold ff-gradient-text mb-1">
                {team ? `Edit: ${team.name}` : 'Tambah Tim Fun Baru'}
            </h3>
            <p className="text-[11px] text-midnight-300 mb-5">Contoh: Manchester United (MUN), formasi 4-2-3-1, isi 11 pemain dari database.</p>
            <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama tim *" className={inputCls} />
                    <input value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} placeholder="Singkatan (mis. MUN)" maxLength={12} className={inputCls} />
                    <select value={form.formation} onChange={(e) => pickFormation(e.target.value)} className={`${inputCls} cursor-pointer`}>
                        {Object.keys(formations).map((f) => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>
                </div>

                {categories.length === 0 ? (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-200">
                        Belum ada kategori.{' '}
                        <button type="button" onClick={onManageCategories} className="underline font-bold">
                            Buat kategori benua &amp; liga
                        </button>{' '}
                        terlebih dahulu.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <select
                            required
                            value={form.fun_category_id}
                            onChange={(e) => setForm({ ...form, fun_category_id: e.target.value, fun_league_id: '' })}
                            className={`${inputCls} cursor-pointer`}
                        >
                            <option value="">Pilih benua *</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <select
                            value={form.type}
                            onChange={(e) => setForm({
                                ...form,
                                type: e.target.value,
                                fun_league_id: e.target.value === 'national' ? '' : form.fun_league_id,
                            })}
                            className={`${inputCls} cursor-pointer`}
                        >
                            <option value="national">National (tanpa liga)</option>
                            <option value="league">Liga</option>
                        </select>
                        {form.type === 'league' ? (
                            <select
                                required
                                value={form.fun_league_id}
                                onChange={(e) => setForm({ ...form, fun_league_id: e.target.value })}
                                className={`${inputCls} cursor-pointer`}
                            >
                                <option value="">Pilih liga *</option>
                                {leagueOptions.map((l) => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="flex items-center text-[11px] text-midnight-300 bg-midnight-950/40 border border-midnight-700/60 rounded-xl px-3">
                                Tim nasional di benua {selectedCategory?.name || '-'}
                            </div>
                        )}
                    </div>
                )}

                <label className="flex items-center gap-2 text-xs text-midnight-300 cursor-pointer">
                    <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-midnight-400" />
                    Aktif (bisa dilawan user)
                </label>

                <div>
                    <p className="text-[11px] text-midnight-300 uppercase font-semibold mb-2">
                        Lineup XI — {filled}/{slots.length || 11} terisi <span className="normal-case font-normal">(klik slot, lalu cari & klik pemain)</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {slots.map((sl) => {
                            const p = assignments[sl.id];
                            return (
                                <button
                                    type="button"
                                    key={sl.id}
                                    onClick={() => setActiveSlot(activeSlot === sl.id ? null : sl.id)}
                                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition ${
                                        activeSlot === sl.id
                                            ? 'border-midnight-400 bg-midnight-600/25'
                                            : 'border-midnight-700/60 bg-midnight-950/60 hover:border-midnight-400/50'
                                    }`}
                                >
                                    <span className="w-9 h-9 rounded-lg bg-midnight-800 border border-midnight-700 flex items-center justify-center text-[10px] font-black text-midnight-200 shrink-0">
                                        {sl.label}
                                    </span>
                                    {p ? (
                                        <>
                                            <span
                                                className="w-8 h-8 rounded-full bg-cover bg-top bg-midnight-800 border border-midnight-400/40 shrink-0"
                                                style={imgSrc(p) ? { backgroundImage: `url('${imgSrc(p)}')` } : {}}
                                            />
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-[11px] font-bold text-white truncate">{p.name}</span>
                                                <span className="block text-[9px] text-midnight-300">{p.position} &middot; OVR {p.ovr} &middot; {cardOf(p)}</span>
                                            </span>
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                title="Kosongkan slot"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setAssignments((m) => {
                                                        const n = { ...m };
                                                        delete n[sl.id];
                                                        return n;
                                                    });
                                                }}
                                                onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
                                                className="text-midnight-300 hover:text-red-400 px-1"
                                            >
                                                <i className="fa-solid fa-xmark"></i>
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-[11px] text-midnight-300/70">Slot {sl.label} — kosong</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {activeSlot && (
                    <div className="rounded-2xl border border-midnight-400/40 bg-midnight-950/70 p-3">
                        <p className="text-[11px] text-midnight-200 font-bold mb-2">
                            Pilih pemain untuk slot <span className="text-gold-300">{activeSlot}</span>
                        </p>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari pemain database..."
                            className={`${inputCls} mb-2`}
                        />
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                            {results.map((p) => (
                                <div
                                    key={p.id}
                                    onClick={() => {
                                        setAssignments((m) => ({ ...m, [activeSlot]: p }));
                                        setActiveSlot(null);
                                    }}
                                    className="flex items-center gap-2.5 p-2 rounded-xl bg-midnight-900/70 border border-midnight-700/50 hover:border-midnight-400/60 cursor-pointer"
                                >
                                    <span
                                        className="w-8 h-8 rounded-full bg-cover bg-top bg-midnight-800 border border-midnight-400/40 shrink-0"
                                        style={imgSrc(p) ? { backgroundImage: `url('${imgSrc(p)}')` } : {}}
                                    />
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-[11px] font-bold text-white truncate">{p.name}</span>
                                        <span className="block text-[9px] text-midnight-300">{p.position} &middot; OVR {p.ovr} &middot; {p.club}</span>
                                    </span>
                                </div>
                            ))}
                            {results.length === 0 && <p className="text-[11px] text-midnight-300 text-center py-3">Ketik untuk mencari pemain.</p>}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-midnight-400/20">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs text-midnight-300">Batal</button>
                    <button type="submit" disabled={busy} className="gold-btn px-6 py-2.5 rounded-xl text-xs font-bold uppercase disabled:opacity-50">
                        {busy ? 'Menyimpan...' : 'Simpan Tim'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
