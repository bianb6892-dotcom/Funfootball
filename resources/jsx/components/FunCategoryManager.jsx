import { useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { EmptyState } from './common';
import { errMsg } from '../utils/game';

const ICON_OPTIONS = [
    { value: 'fa-earth-europe', label: 'Eropa' },
    { value: 'fa-earth-asia', label: 'Asia' },
    { value: 'fa-earth-africa', label: 'Afrika' },
    { value: 'fa-earth-americas', label: 'Amerika' },
    { value: 'fa-earth-oceania', label: 'Oseania' },
    { value: 'fa-globe', label: 'Dunia / Lainnya' },
];

export function FunCategoryManager({ categories = [], teams = [], onChanged }) {
    const toast = useToast();
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('');
    const [sortOrder, setSortOrder] = useState(0);
    const [busy, setBusy] = useState(false);

    const addCategory = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        try {
            await api.adminStoreFunCategory({
                name: name.trim(),
                icon: icon || null,
                sort_order: Number(sortOrder) || 0,
            });
            toast('Kategori benua ditambahkan.');
            setName('');
            setIcon('');
            setSortOrder(0);
            onChanged?.();
        } catch (err) {
            toast(errMsg(err, 'Gagal menyimpan kategori.'), 'fa-circle-exclamation');
        } finally {
            setBusy(false);
        }
    };

    const inputCls = 'bg-midnight-950/80 text-xs text-white p-3 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400 transition';

    return (
        <div className="space-y-3">
            <div>
                <h3 className="font-display font-bold text-midnight-200 text-sm uppercase tracking-wider">
                    <i className="fa-solid fa-earth-asia mr-1"></i> Kategori Benua &amp; Liga
                </h3>
                <p className="text-[11px] text-midnight-300">
                    Buat benua, lalu tambahkan liga. Tim tanpa liga otomatis masuk daftar National.
                </p>
            </div>

            <form onSubmit={addCategory} className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] uppercase tracking-wider text-midnight-300 mb-1">Nama Benua / Kategori</label>
                    <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Contoh: Eropa"
                        maxLength={60}
                        className={`${inputCls} w-full`}
                    />
                </div>
                <div className="w-44">
                    <label className="block text-[10px] uppercase tracking-wider text-midnight-300 mb-1">Ikon Benua</label>
                    <select
                        value={icon}
                        onChange={(e) => setIcon(e.target.value)}
                        className={`${inputCls} w-full cursor-pointer`}
                    >
                        <option value="">Otomatis dari nama</option>
                        {ICON_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <div className="w-28">
                    <label className="block text-[10px] uppercase tracking-wider text-midnight-300 mb-1">Urutan</label>
                    <input
                        type="number"
                        min={0}
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className={`${inputCls} w-full`}
                    />
                </div>
                <button type="submit" disabled={busy} className="gold-btn px-4 py-3 rounded-xl text-xs font-bold uppercase disabled:opacity-50">
                    <i className="fa-solid fa-plus mr-1"></i> Tambah
                </button>
            </form>

            {categories.length === 0 ? (
                <EmptyState title="Belum Ada Kategori" subtitle="Buat benua pertama, misalnya Eropa atau Asia." />
            ) : (
                <div className="space-y-3">
                    {categories.map((category) => (
                        <CategoryCard key={category.id} category={category} teams={teams} onChanged={onChanged} />
                    ))}
                </div>
            )}
        </div>
    );
}

function CategoryCard({ category, teams = [], onChanged }) {
    const toast = useToast();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(category.name);
    const [icon, setIcon] = useState(category.icon || '');
    const [leagueName, setLeagueName] = useState('');
    const [editingLeague, setEditingLeague] = useState(null);
    const [assignTeamId, setAssignTeamId] = useState('');
    const [assignLeagueId, setAssignLeagueId] = useState('');
    const [busy, setBusy] = useState(false);

    const categoryTeams = teams.filter((t) => Number(t.fun_category_id) === Number(category.id));
    const otherTeams = teams.filter((t) => Number(t.fun_category_id) !== Number(category.id));

    const inputCls = 'bg-midnight-950/80 text-xs text-white p-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400 transition';

    const run = async (fn, message) => {
        setBusy(true);
        try {
            await fn();
            if (message) toast(message);
            onChanged?.();
            return true;
        } catch (err) {
            toast(errMsg(err, 'Gagal memproses.'), 'fa-circle-exclamation');
            return false;
        } finally {
            setBusy(false);
        }
    };

    const saveName = async () => {
        const ok = await run(
            () => api.adminUpdateFunCategory(category.id, {
                name: name.trim(),
                icon: icon || null,
                sort_order: category.sort_order,
                is_active: category.is_active,
            }),
            'Kategori diperbarui.'
        );
        if (ok) setEditing(false);
    };

    const addLeague = async (e) => {
        e.preventDefault();
        if (!leagueName.trim()) return;
        const ok = await run(
            () => api.adminStoreFunLeague({
                fun_category_id: category.id,
                name: leagueName.trim(),
                sort_order: category.leagues.length,
            }),
            'Liga ditambahkan.'
        );
        if (ok) setLeagueName('');
    };

    const saveLeague = async (league) => {
        if (!editingLeague?.name?.trim()) return;
        const ok = await run(
            () => api.adminUpdateFunLeague(league.id, {
                fun_category_id: category.id,
                name: editingLeague.name.trim(),
                sort_order: league.sort_order,
                is_active: league.is_active,
            }),
            'Liga diperbarui.'
        );
        if (ok) setEditingLeague(null);
    };

    const assignTeam = async (e) => {
        e.preventDefault();
        if (!assignTeamId) return;
        const ok = await run(
            () => api.adminAssignFunTeam(assignTeamId, {
                fun_category_id: category.id,
                fun_league_id: assignLeagueId ? Number(assignLeagueId) : null,
            }),
            'Tim dimasukkan ke kategori.'
        );
        if (ok) {
            setAssignTeamId('');
            setAssignLeagueId('');
        }
    };

    const changeLeague = (team, leagueId) => run(
        () => api.adminAssignFunTeam(team.id, {
            fun_category_id: category.id,
            fun_league_id: leagueId ? Number(leagueId) : null,
        }),
        'Liga tim diperbarui.'
    );

    const removeTeam = (team) => {
        if (!confirm(`Keluarkan "${team.name}" dari kategori ${category.name}?`)) return;
        run(
            () => api.adminAssignFunTeam(team.id, { fun_category_id: null, fun_league_id: null }),
            'Tim dikeluarkan dari kategori.'
        );
    };

    return (
        <div className="p-4 rounded-2xl bg-midnight-950/60 border border-midnight-700/50">
            <div className="flex flex-wrap items-center gap-2">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#101d68] to-[#060b30] border border-cyan-300/50 flex items-center justify-center text-cyan-200 shrink-0">
                    <i className={`fa-solid ${category.icon || 'fa-earth-asia'} text-sm`}></i>
                </span>
                {editing ? (
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[180px]">
                        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={`${inputCls} flex-1 min-w-[140px]`} />
                        <select
                            value={icon}
                            onChange={(e) => setIcon(e.target.value)}
                            className={`${inputCls} cursor-pointer`}
                            title="Ikon globe benua"
                        >
                            <option value="">Otomatis dari nama</option>
                            {ICON_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <button onClick={saveName} disabled={busy} className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase bg-emerald-500/15 border border-emerald-500/50 text-emerald-300">
                            Simpan
                        </button>
                        <button onClick={() => { setEditing(false); setName(category.name); setIcon(category.icon || ''); }} className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase text-midnight-300">
                            Batal
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 min-w-[160px]">
                        <p className="text-sm font-bold text-white">
                            {category.name}
                            {!category.is_active && <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-midnight-800 border border-midnight-700 text-midnight-300 uppercase">OFF</span>}
                        </p>
                        <p className="text-[10px] text-midnight-300">
                            {category.leagues.length} liga &middot; {category.teams_count} tim &middot; urutan {category.sort_order}
                        </p>
                    </div>
                )}
                <div className="flex gap-2 flex-wrap">
                    {!editing && (
                        <button onClick={() => { setName(category.name); setIcon(category.icon || ''); setEditing(true); }} className="ff-outline-btn px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase">
                            <i className="fa-solid fa-pen mr-1"></i> Nama / Ikon
                        </button>
                    )}
                    <button
                        onClick={() => run(() => api.adminToggleFunCategory(category.id), category.is_active ? 'Kategori dinonaktifkan.' : 'Kategori diaktifkan.')}
                        disabled={busy}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition ${category.is_active ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10' : 'border-midnight-700 text-midnight-300'}`}
                    >
                        {category.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                    <button
                        onClick={() => {
                            if (!confirm(`Hapus kategori "${category.name}"? Liga di dalamnya juga terhapus, tim menjadi tanpa kategori.`)) return;
                            run(() => api.adminDeleteFunCategory(category.id), 'Kategori dihapus.');
                        }}
                        disabled={busy}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-600 hover:text-white transition"
                    >
                        <i className="fa-solid fa-trash mr-1"></i> Hapus
                    </button>
                </div>
            </div>

            <div className="mt-3 pl-11">
                <p className="text-[10px] uppercase tracking-wider text-midnight-300 font-semibold mb-1.5">Liga</p>
                <div className="space-y-1.5">
                    {category.leagues.map((league) => (
                        <div key={league.id} className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-midnight-950/60 border border-midnight-700/50">
                            {editingLeague?.id === league.id ? (
                                <>
                                    <input
                                        value={editingLeague.name}
                                        onChange={(e) => setEditingLeague({ ...editingLeague, name: e.target.value })}
                                        maxLength={80}
                                        className={`${inputCls} flex-1 min-w-[140px]`}
                                    />
                                    <button onClick={() => saveLeague(league)} disabled={busy} className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-emerald-500/15 border border-emerald-500/50 text-emerald-300">
                                        Simpan
                                    </button>
                                    <button onClick={() => setEditingLeague(null)} className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase text-midnight-300">
                                        Batal
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="flex-1 min-w-[120px] text-xs font-bold text-white">
                                        {league.name}
                                        {!league.is_active && <span className="ml-2 text-[9px] text-midnight-300 uppercase">off</span>}
                                    </span>
                                    <button onClick={() => setEditingLeague({ id: league.id, name: league.name })} className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-midnight-700 text-midnight-300 hover:text-white">
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => run(() => api.adminToggleFunLeague(league.id), league.is_active ? 'Liga dinonaktifkan.' : 'Liga diaktifkan.')}
                                        disabled={busy}
                                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase border ${league.is_active ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10' : 'border-midnight-700 text-midnight-300'}`}
                                    >
                                        {league.is_active ? 'Aktif' : 'Nonaktif'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!confirm(`Hapus liga "${league.name}"? Timnya menjadi tim nasional di benua ini.`)) return;
                                            run(() => api.adminDeleteFunLeague(league.id), 'Liga dihapus.');
                                        }}
                                        disabled={busy}
                                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-600 hover:text-white transition"
                                    >
                                        Hapus
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                    {category.leagues.length === 0 && (
                        <p className="text-[11px] text-midnight-300/70">Belum ada liga. Tambahkan liga di bawah.</p>
                    )}
                </div>

                <form onSubmit={addLeague} className="mt-2 flex flex-wrap gap-2">
                    <input
                        value={leagueName}
                        onChange={(e) => setLeagueName(e.target.value)}
                        placeholder="Nama liga baru (mis. Premier League)"
                        maxLength={80}
                        className={`${inputCls} flex-1 min-w-[180px]`}
                    />
                    <button type="submit" disabled={busy} className="px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase bg-midnight-600/25 border border-midnight-400/50 text-white">
                        <i className="fa-solid fa-plus mr-1"></i> Liga
                    </button>
                </form>

                <div className="mt-4 pt-3 border-t border-midnight-700/50">
                    <p className="text-[10px] uppercase tracking-wider text-midnight-300 font-semibold mb-1.5">
                        Tim di Kategori Ini ({categoryTeams.length})
                    </p>
                    <div className="space-y-1.5">
                        {categoryTeams.map((team) => (
                            <div key={team.id} className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-midnight-950/60 border border-midnight-700/50">
                                <span className="flex-1 min-w-[120px] text-xs font-bold text-white">{team.name}</span>
                                <select
                                    value={team.fun_league_id || ''}
                                    onChange={(e) => changeLeague(team, e.target.value)}
                                    disabled={busy}
                                    className={`${inputCls} py-1.5 text-[10px] cursor-pointer`}
                                    title="Pilih liga tim ini"
                                >
                                    <option value="">National</option>
                                    {category.leagues.map((l) => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => removeTeam(team)}
                                    disabled={busy}
                                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-600 hover:text-white transition"
                                >
                                    Keluarkan
                                </button>
                            </div>
                        ))}
                        {categoryTeams.length === 0 && (
                            <p className="text-[11px] text-midnight-300/70">Belum ada tim di kategori ini.</p>
                        )}
                    </div>

                    <form onSubmit={assignTeam} className="mt-2 flex flex-wrap gap-2">
                        <select
                            value={assignTeamId}
                            onChange={(e) => setAssignTeamId(e.target.value)}
                            className={`${inputCls} flex-1 min-w-[160px] cursor-pointer`}
                        >
                            <option value="">Pilih tim untuk dimasukkan...</option>
                            {otherTeams.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        <select
                            value={assignLeagueId}
                            onChange={(e) => setAssignLeagueId(e.target.value)}
                            className={`${inputCls} cursor-pointer`}
                        >
                            <option value="">National (tanpa liga)</option>
                            {category.leagues.map((l) => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            disabled={busy || !assignTeamId}
                            className="px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase bg-midnight-600/25 border border-midnight-400/50 text-white disabled:opacity-50"
                        >
                            <i className="fa-solid fa-arrow-right-to-bracket mr-1"></i> Masukkan
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
