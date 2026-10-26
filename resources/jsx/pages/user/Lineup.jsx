import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Modal, FootBadge } from '../../components/common';
import { RANK_ICON, adjustedFor, altPositionsOf, cardLabel, cardOf, chemistryOf, compatOfSlot, footCompatOf, footLabel, isCamSsBridge, isNaturalFit, naturalPositionsOf, normalizeFoot, playerKey, posGroup, errMsg, imgSrc, summarizeLineup } from '../../utils/game';

export function Lineup() {
    const toast = useToast();
    const [data, setData] = useState(null);
    const [collection, setCollection] = useState([]);
    const [picker, setPicker] = useState(null); // {type:'slot', slot} | {type:'bench', index}
    const [saving, setSaving] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [query, setQuery] = useState('');
    const [groupFilter, setGroupFilter] = useState('ALL');
    const [pickerQuery, setPickerQuery] = useState('');
    const [page, setPage] = useState(1);
    const PER_PAGE = 6;
    const dragRef = useRef(null); // {player, from:{type:'collection'|'bench'|'slot', index?, slotId?}}

    const load = async () => {
        const [{ data: lu }, { data: col }] = await Promise.all([
            api.lineup(),
            api.collection({ per_page: 500 }),
        ]);
        setData(lu);
        setCollection(col.data || col);
    };

    useEffect(() => {
        load().catch(() => {});
    }, []);

    if (!data) return <p className="text-midnight-300 text-sm">Memuat line-up...</p>;

    const starters = (data.starters || []).filter((s) => s?.player?.id);
    const benchArr = (data.bench || []).filter((p) => p?.id);
    const slots = (data.formations?.[data.formation]) || [];
    const bySlot = Object.fromEntries(starters.map((s) => [s.slot_id, s]));
    const usedKeys = new Set([
        ...starters.map((s) => playerKey(s.player)),
        ...benchArr.map((p) => playerKey(p)),
    ]);
    const available = collection.filter((p) => !usedKeys.has(playerKey(p)));
    const q = query.trim().toLowerCase();
    const filtered = available.filter((p) => {
        if (groupFilter !== 'ALL' && posGroup(p.position) !== groupFilter) return false;
        if (!q) return true;
        return [p.name, p.club, p.position].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
    const openPicker = (v) => { setPickerQuery(''); setPicker(v); };
    const closePicker = () => { setPicker(null); setPickerQuery(''); };
    const setFilter = (g) => { setGroupFilter(g); setPage(1); };
    const setSearch = (v) => { setQuery(v); setPage(1); };
    const pq = pickerQuery.trim().toLowerCase();
    const pickerList = !pq ? available : available.filter((p) =>
        [p.name, p.club, p.position].filter(Boolean).some((v) => String(v).toLowerCase().includes(pq)));
    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const pageItems = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

    // Terapkan starters/bench baru SEKALIGUS hitung ulang adjusted OVR,
    // penalty posisi + penalti kaki, team OVR (mirror backend) agar langsung terlihat turun/naik.
    const applyLineup = (nextStarters, nextBench = benchArr, extra = {}) => {
        const enriched = (nextStarters || [])
            .filter((s) => s?.player?.id)
            .map((s) => ({ ...s, ...adjustedFor(s.player, s.slot_position, s.slot_id) }));
        const chemistry = chemistryOf(enriched.map((s) => s.player));
        const withChemistry = enriched.map((s, i) => ({ ...s, chemistry: chemistry.per_player[i] ?? 0 }));
        setData({ ...data, ...extra, starters: withChemistry, bench: nextBench, ...summarizeLineup(withChemistry) });
    };

    const assign = (player) => {
        // Satu pemain hanya boleh sekali walau beda kartu (nama sama = dipakai).
        if (usedKeys.has(playerKey(player))) {
            toast('Pemain ini sudah ada di line-up (walau beda kartu tidak boleh).', 'fa-circle-exclamation');
            closePicker();
            return;
        }
        if (picker.type === 'slot') {
            const cur = {};
            starters.forEach((s) => {
                if (s?.player?.id) cur[s.slot_id] = s.player.id;
            });
            cur[picker.slot.id] = player.id;
            applyLineup(slots
                .map((sl) => (cur[sl.id] ? { slot_id: sl.id, slot_position: sl.pos, player: sl.id === picker.slot.id ? player : bySlot[sl.id]?.player } : null))
                .filter(Boolean));
        } else {
            const bench = [...benchArr];
            bench[picker.index] = player;
            applyLineup(starters, bench);
        }
        closePicker();
    };

    const removeStarter = (slotId) => {
        applyLineup(starters.filter((s) => s.slot_id !== slotId));
    };

    const removeBench = (index) => {
        const bench = [...benchArr];
        bench.splice(index, 1);
        applyLineup(starters, bench);
    };

    // ---- drag & drop (klik tetap berfungsi sebagai fallback) ----
    const onDragStartPlayer = (e, player, from) => {
        dragRef.current = { player, from };
        e.dataTransfer.effectAllowed = 'move';
        try {
            e.dataTransfer.setData('text/plain', String(player.id));
        } catch (_) {}
        setDragging(true);
    };
    const endDrag = () => {
        dragRef.current = null;
        setDragging(false);
    };
    const allowDrop = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // Jatuhkan ke slot starter: occupant lama pindah ke asal (swap) atau bebas.
    const dropOnSlot = (slot) => {
        const d = dragRef.current;
        endDrag();
        if (!d) return;
        if (d.from.type === 'slot' && d.from.slotId === slot.id) return;
        if (d.from.type === 'collection' && usedKeys.has(playerKey(d.player))) {
            toast('Pemain ini sudah ada di line-up (walau beda kartu tidak boleh).', 'fa-circle-exclamation');
            return;
        }
        const nextStarters = starters.filter((s) => s.slot_id !== slot.id && (d.from.type !== 'slot' || s.slot_id !== d.from.slotId));
        const nextBench = [...benchArr];
        const occupant = bySlot[slot.id]?.player;
        if (d.from.type === 'bench') nextBench.splice(d.from.index, 1);
        if (occupant) {
            if (d.from.type === 'slot') {
                const orig = slots.find((sl) => sl.id === d.from.slotId);
                nextStarters.push({ slot_id: d.from.slotId, slot_position: orig?.pos || d.from.slotId, player: occupant });
            } else if (d.from.type === 'bench') {
                nextBench.splice(Math.min(d.from.index, nextBench.length), 0, occupant);
            }
            // dari koleksi: occupant otomatis bebas (kembali ke daftar available)
        }
        nextStarters.push({ slot_id: slot.id, slot_position: slot.pos, player: d.player });
        applyLineup(nextStarters, nextBench);
    };

    // Jatuhkan ke bench: occupant lama swap ke asal (atau bebas bila dari koleksi).
    const dropOnBench = (index) => {
        const d = dragRef.current;
        endDrag();
        if (!d) return;
        if (d.from.type === 'bench' && d.from.index === index) return;
        if (d.from.type === 'collection' && usedKeys.has(playerKey(d.player))) {
            toast('Pemain ini sudah ada di line-up (walau beda kartu tidak boleh).', 'fa-circle-exclamation');
            return;
        }
        let nextStarters = [...starters];
        const nextBench = [...benchArr];
        while (nextBench.length <= index) nextBench.push(undefined);
        const occupant = nextBench[index];
        if (d.from.type === 'bench') {
            nextBench[d.from.index] = occupant;
            nextBench[index] = d.player;
        } else {
            if (d.from.type === 'slot') nextStarters = nextStarters.filter((s) => s.slot_id !== d.from.slotId);
            nextBench[index] = d.player;
            if (occupant && d.from.type === 'slot') {
                const orig = slots.find((sl) => sl.id === d.from.slotId);
                nextStarters.push({ slot_id: d.from.slotId, slot_position: orig?.pos || d.from.slotId, player: occupant });
            }
            // dari koleksi: occupant otomatis bebas (kembali ke daftar available)
        }
        applyLineup(nextStarters, nextBench.filter(Boolean).slice(0, 7));
    };

    const autoFill = () => {
        // greedy: untuk tiap slot kosong pilih available dengan adjusted terbaik
        // (penalti posisi + penalti kaki bila posisi tak pas).
        const pool = [...available].sort((a, b) => b.ovr - a.ovr);
        const nextStarters = [...starters];
        const used = new Set([...nextStarters.map((s) => playerKey(s.player)), ...benchArr.map(playerKey)]);
        slots.forEach((sl) => {
            if (nextStarters.find((s) => s.slot_id === sl.id)) return;
            let best = null;
            let bestScore = -999;
            pool.forEach((p) => {
                if (used.has(playerKey(p))) return;
                const score = adjustedFor(p, sl.pos, sl.id).adjusted_ovr;
                if (score > bestScore) {
                    bestScore = score;
                    best = p;
                }
            });
            if (best) {
                used.add(playerKey(best));
                nextStarters.push({ slot_id: sl.id, slot_position: sl.pos, player: best });
            }
        });
        const bench = [...benchArr];
        pool.forEach((p) => {
            if (bench.length >= 7) return;
            if (!used.has(playerKey(p))) {
                used.add(playerKey(p));
                bench.push(p);
            }
        });
        applyLineup(nextStarters, bench);
        toast('Line-up diisi otomatis (belum disimpan).');
    };

    const save = async () => {
        setSaving(true);
        try {
            const { data: res } = await api.saveLineup({
                formation: data.formation,
                starters: starters.map((s) => ({ slot_id: s.slot_id, player_id: s.player.id })),
                bench: benchArr.map((p) => p.id),
            });
            setData(res);
            toast('Line-up tersimpan!');
        } catch (err) {
            toast(errMsg(err, 'Gagal menyimpan.'), 'fa-circle-exclamation');
        } finally {
            setSaving(false);
        }
    };

    const ovrCls = (compat) => (compat === 'exact' ? 'green' : (compat === 'adjacent' || compat === 'shift') ? 'yellow' : 'red');

    return (
        <div className="space-y-3">
            <div className="ff-card px-3 py-2 rounded-2xl flex flex-wrap items-center gap-x-5 gap-y-1">
                {[
                    ['fa-star', 'Team OVR', data.team_ovr, data.base_team_ovr != null ? `base ${data.base_team_ovr}` : null],
                    ['fa-link', 'Chemistry', data.chemistry ?? 0, `+${data.chemistry_bonus ?? 0} OVR`],
                    ['fa-users', 'Terisi', `${data.filled}/11`, null],
                    ['fa-triangle-exclamation', 'Penalty', data.penalty_total > 0 ? `-${data.penalty_total}` : '0', null],
                    ['fa-chair', 'Bench', `${benchArr.length}/7`, null],
                ].map(([icon, label, value, sub]) => (
                    <div key={label} className="flex items-center gap-2" title={label === 'Chemistry' ? '1 klub = +1 · 1 negara = +2. Total chemistry menambah Team OVR (maks +5).' : undefined}>
                        <i className={`fa-solid ${icon} text-midnight-300 text-xs`}></i>
                        <span className="text-[10px] text-midnight-300 uppercase font-semibold">{label}</span>
                        <span className="text-base font-bold text-white font-display">{value}</span>
                        {sub && <span className="text-[9px] text-emerald-300 font-bold">{sub}</span>}
                    </div>
                ))}
                <span className="ml-auto text-[10px] text-midnight-300 hidden md:inline" title="Detail sama persis = aman (0). Geser selini (LM→CM, ST→LW): -2 bila kaki sesuai slot, -3 bila tidak. CAM↔SS dua arah = -2. Beda lini lain: -3 dekat, -10 jauh (+ -2 bila kaki juga tak cocok).">
                    <i className="fa-solid fa-circle-info mr-1"></i>Penalty: CAM↔SS -2 · -2 selini kaki pas · -3 selini/dekat · -10 jauh
                </span>
            </div>

            <div className="ff-card px-3 py-2 rounded-2xl flex flex-wrap items-center gap-2">
                <span className="text-xs text-midnight-300 uppercase font-semibold">
                    <i className="fa-solid fa-chess mr-1"></i> Formasi:
                </span>
                <div className="flex flex-wrap gap-1.5">
                    {Object.keys(data.formations || {}).map((f) => (
                        <button
                            key={f}
                            onClick={() => applyLineup([], benchArr, { formation: f })}
                            className={`formation-btn ${data.formation === f ? 'active' : ''}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <button onClick={autoFill} className="gold-btn px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase">
                        <i className="fa-solid fa-wand-magic-sparkles mr-1"></i> Auto Fill
                    </button>
                    <button onClick={save} disabled={saving} className="gold-btn px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase disabled:opacity-50">
                        <i className="fa-solid fa-floppy-disk mr-1"></i> {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </div>

            <div className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-3 items-start">
                <div className="ff-card p-2 rounded-3xl">
                    <div className="pitch mini">
                            <div className="pitch-box-top"></div>
                            <div className="pitch-box-bottom"></div>
                            {slots.map((sl) => {
                                const filled = bySlot[sl.id];
                                return (
                                    <div
                                        key={sl.id}
                                        className={`player-slot ${filled ? '' : 'empty'}${dragging ? ' drop-ready' : ''}`}
                                        style={{ left: `${sl.x}%`, top: `${sl.y}%` }}
                                        onClick={() => (filled ? removeStarter(sl.id) : openPicker({ type: 'slot', slot: sl }))}
                                        title={filled ? `${filled.player.name} · Chemistry +${filled.chemistry ?? 0} (klik hapus / seret untuk pindah)` : `Isi ${sl.label} (klik / seret pemain ke sini)`}
                                        draggable={!!filled}
                                        onDragStart={filled ? (e) => onDragStartPlayer(e, filled.player, { type: 'slot', slotId: sl.id }) : undefined}
                                        onDragEnd={endDrag}
                                        onDragOver={allowDrop}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            dropOnSlot(sl);
                                        }}
                                    >
                                        {filled ? (
                                            <>
                                                <div
                                                    className={`slot-circle rank-${cardOf(filled.player)}`}
                                                >
                                                    {imgSrc(filled.player)
                                                        ? <img src={imgSrc(filled.player)} alt={filled.player.name} draggable={false} className="slot-photo" />
                                                        : <i className="fa-solid fa-user"></i>}
                                                    <div className={`slot-card-chip rank-${cardOf(filled.player)}`} title={`Kartu ${cardLabel(filled.player)}`}>
                                                        <i className={`fa-solid ${RANK_ICON[cardOf(filled.player)] || 'fa-shield-halved'}`}></i>
                                                    </div>
                                                    <div className={`slot-ovr-badge ${ovrCls(filled.compat || 'exact')}`}>{filled.adjusted_ovr ?? filled.player.ovr}</div>
                                                    {(filled.penalty ?? 0) < 0 && (
                                                        <div className="slot-penalty" title={`Posisi ${filled.pos_penalty ?? filled.penalty}${(filled.foot_penalty ?? 0) < 0 ? ` · Kaki ${filled.foot_penalty} (kaki ${footLabel(filled.player?.preferred_foot)}, slot ${filled.slot_id} maunya kaki ${footLabel(footCompatOf(filled.player, filled.slot_id).wanted)})` : ''}`}>
                                                            {filled.penalty}{(filled.foot_penalty ?? 0) < 0 ? <i className="fa-solid fa-shoe-prints ml-1"></i> : null}
                                                        </div>
                                                    )}
                                                    {(filled.is_natural ?? isNaturalFit(filled.player, filled.slot_id)) && (altPositionsOf(filled.player).length > 0) && (
                                                        <div className="slot-natural" title={`Natural di ${naturalPositionsOf(filled.player).join(' · ')} — OVR utuh`}>
                                                            <i className="fa-solid fa-shuffle"></i>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="slot-label">
                                                    {filled.player.name.split(' ').slice(-1)[0]} &middot; {sl.label}
                                                </div>
                                                <div className={`slot-card-name rank-${cardOf(filled.player)}`}>
                                                    {cardLabel(filled.player)}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="slot-circle"><i className="fa-solid fa-plus"></i></div>
                                                <div className="slot-label">{sl.label}</div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                <div className="ff-card p-2 rounded-2xl">
                    <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="font-display font-bold text-midnight-200 text-xs uppercase tracking-wider">
                            <i className="fa-solid fa-layer-group mr-1"></i> Koleksi
                        </h4>
                        <span className="text-[10px] text-midnight-300 ml-auto">{filtered.length}/{available.length}</span>
                    </div>
                    <div className="relative mb-1.5">
                        <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-midnight-300 text-[10px]"></i>
                        <input
                            value={query}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari pemain..."
                            className="w-full bg-midnight-800/60 border border-midnight-400/20 rounded-lg pl-7 pr-7 py-1 text-[11px] text-white placeholder:text-midnight-300/60 outline-none focus:border-midnight-400/60"
                        />
                        {query && (
                            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-midnight-300 hover:text-white" title="Hapus pencarian">
                                <i className="fa-solid fa-xmark text-[10px]"></i>
                            </button>
                        )}
                    </div>
                    <div className="flex gap-1 flex-wrap mb-1.5">
                        {['ALL', 'GK', 'DF', 'MF', 'FW'].map((g) => (
                            <button
                                key={g}
                                onClick={() => setFilter(g)}
                                className={`formation-btn ${groupFilter === g ? 'active' : ''}`}
                            >
                                {g === 'ALL' ? 'Semua' : g}
                            </button>
                        ))}
                    </div>
                    <div className="space-y-1">
                        {pageItems.map((p) => (
                            <QuickAdd
                                key={p.id}
                                player={p}
                                compact
                                onAdd={() => quickAdd(p)}
                                draggable
                                onDragStart={(e) => onDragStartPlayer(e, p, { type: 'collection' })}
                                onDragEnd={endDrag}
                            />
                        ))}
                        {filtered.length === 0 && available.length > 0 && (
                            <p className="text-[10px] text-midnight-300 text-center py-3">Tidak ada pemain yang cocok.</p>
                        )}
                        {available.length === 0 && (
                            <p className="text-[10px] text-midnight-300 text-center py-3">Semua pemain sudah dipakai.</p>
                        )}
                    </div>
                    {filtered.length > 0 && (
                        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-midnight-400/20">
                            <button
                                onClick={() => setPage(Math.max(1, safePage - 1))}
                                disabled={safePage <= 1}
                                className="formation-btn disabled:opacity-40"
                            >
                                <i className="fa-solid fa-chevron-left"></i>
                            </button>
                            <span className="text-[10px] text-midnight-300 font-semibold">{safePage}/{totalPages}</span>
                            <button
                                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                                disabled={safePage >= totalPages}
                                className="formation-btn disabled:opacity-40"
                            >
                                <i className="fa-solid fa-chevron-right"></i>
                            </button>
                        </div>
                    )}
                </div>
            </div>

                <div className="ff-card p-3 rounded-3xl">
                    <h3 className="font-display font-bold text-midnight-200 text-sm uppercase tracking-wider mb-1">
                        <i className="fa-solid fa-chair mr-1"></i> Cadangan (Bench)
                    </h3>
                    <p className="text-[10px] text-midnight-300 mb-2">Maks 7, tanpa penalty. Klik / seret pemain.</p>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                        {Array.from({ length: 7 }).map((_, i) => {
                            const p = benchArr[i];
                            return (
                                <div
                                    key={i}
                                    className={`bench-slot rank-${p ? cardOf(p) : 'empty'}${dragging ? ' drop-ready' : ''}`}
                                    onClick={() => (p ? removeBench(i) : openPicker({ type: 'bench', index: i }))}
                                    title={p ? `${p.name} (klik hapus / seret untuk pindah)` : `Bench #${i + 1} (klik / jatuhkan pemain)`}
                                    draggable={!!p}
                                    onDragStart={p ? (e) => onDragStartPlayer(e, p, { type: 'bench', index: i }) : undefined}
                                    onDragEnd={endDrag}
                                    onDragOver={allowDrop}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        dropOnBench(i);
                                    }}
                                >
                                    {p ? (
                                        <>
                                            <Thumb player={p} card />
                                            <span className="text-[9px] font-bold text-white truncate w-full">
                                                {p.name.split(' ').slice(-1)[0]}
                                            </span>
                                            <span className={`bench-card-chip rank-${cardOf(p)}`} title={`Kartu ${cardLabel(p)}`}>
                                                <i className={`fa-solid ${RANK_ICON[cardOf(p)] || 'fa-shield-halved'}`}></i> {cardLabel(p)}
                                            </span>
                                            <span className={`rank-badge ${cardOf(p)} text-[8px]`}>{p.ovr}</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-plus text-midnight-300"></i>
                                            <span className="text-[9px]">Kosong</span>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <Modal open={!!picker} onClose={closePicker} maxWidth="max-w-lg">
                <h3 className="font-display text-lg font-bold ff-gradient-text mb-1">
                    {picker?.type === 'slot' ? `Pilih untuk ${picker.slot.label} (${picker.slot.pos})` : `Pilih untuk Bench #${(picker?.index ?? 0) + 1}`}
                </h3>
                <p className="text-[10px] text-midnight-300 mb-2">Hanya dari koleksimu yang belum terpakai.</p>
                <div className="relative mb-3">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-midnight-300 text-xs"></i>
                    <input
                        value={pickerQuery}
                        onChange={(e) => setPickerQuery(e.target.value)}
                        placeholder="Cari pemain..."
                        className="w-full bg-midnight-800/60 border border-midnight-400/20 rounded-xl pl-8 pr-8 py-1.5 text-xs text-white placeholder:text-midnight-300/60 outline-none focus:border-midnight-400/60"
                    />
                    {pickerQuery && (
                        <button onClick={() => setPickerQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-midnight-300 hover:text-white" title="Hapus pencarian">
                            <i className="fa-solid fa-xmark text-xs"></i>
                        </button>
                    )}
                </div>
                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                    {pickerList.map((p) => {
                        const preview = picker?.type === 'slot' ? adjustedFor(p, picker.slot.pos, picker.slot.id) : null;
                        const foot = footCompatOf(p, picker?.slot?.id || '');
                        const alts = altPositionsOf(p);
                        return (
                        <div key={p.id} className="picker-item" onClick={() => assign(p)}>
                            <Thumb player={p} card />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-white truncate">{p.name}</p>
                                <p className="text-[9px] text-midnight-300 flex items-center gap-1.5 flex-wrap">
                                    <span>{p.position}{alts.length > 0 ? ` (${alts.join('/')})` : ''} &middot; OVR {p.ovr}</span>
                                    <FootBadge foot={p.preferred_foot} size="xs" />
                                    {preview && (
                                        preview.is_natural
                                            ? <span className="text-emerald-300 font-bold"> → {preview.adjusted_ovr} (natural)</span>
                                            : <span className={preview.penalty < 0 ? 'text-red-400 font-bold' : 'text-emerald-300 font-bold'}> → {preview.adjusted_ovr}{preview.foot_penalty < 0 ? ' (kaki -2)' : ''}</span>
                                    )}
                                </p>
                            </div>
                            <span className={`rank-badge ${cardOf(p)} shrink-0`}><i className={`fa-solid ${RANK_ICON[cardOf(p)] || 'fa-shield-halved'} text-[9px]`}></i> {cardLabel(p)}</span>
                        </div>
                        );
                    })}
                    {pickerList.length === 0 && available.length > 0 && <p className="text-xs text-midnight-300 text-center py-6">Tidak ada pemain yang cocok.</p>}
                    {available.length === 0 && <p className="text-xs text-midnight-300 text-center py-6">Tidak ada pemain tersedia.</p>}
                </div>
            </Modal>
        </div>
    );

    function quickAdd(player) {
        if (usedKeys.has(playerKey(player))) {
            toast('Pemain ini sudah ada di line-up (walau beda kartu tidak boleh).', 'fa-circle-exclamation');
            return;
        }
        // cari slot kosong posisi sama → selini → adjacent → bench (termasuk penalti kaki).
        // Posisi natural (utama/alternatif) diprioritaskan setara exact.
        const rank = { exact: 0, shift: 1, adjacent: 2, far: 3 };
        const takenSlots = new Set(starters.map((s) => s.slot_id));
        const scoreOf = (slotPos, slotId) => {
            const c = compatOfSlot(player, slotPos, slotId);
            // Jembatan CAM↔SS (-2) diprioritaskan setara shift.
            if (c !== 'exact' && isCamSsBridge(player, slotId)) return 1 * 10;
            // Kaki hanya jadi penentu urutan bila posisi tidak pas (mirror aturan penalti).
            const footBad = c !== 'exact' && footCompatOf(player, slotId).compat === 'mismatch';
            return rank[c] * 10 + (footBad ? 1 : 0);
        };
        const cands = slots.filter((sl) => !takenSlots.has(sl.id)).sort((a, b) => scoreOf(a.pos, a.id) - scoreOf(b.pos, b.id));
        if (cands.length > 0) {
            applyLineup([...starters, { slot_id: cands[0].id, slot_position: cands[0].pos, player }]);
        } else if (benchArr.length < 7) {
            applyLineup(starters, [...benchArr, player]);
        }
    }
}

function Thumb({ player, card }) {
    const src = imgSrc(player);
    return (
        <div
            className={`picker-thumb${card ? ` rank-${cardOf(player)}` : ''}`}
            style={src ? { backgroundImage: `url('${src}')` } : {}}
        >
            {!src && <i className="fa-solid fa-user"></i>}
        </div>
    );
}

function QuickAdd({ player, onAdd, draggable, onDragStart, onDragEnd, compact }) {
    const src = imgSrc(player);
    const alts = altPositionsOf(player);
    return (
        <div className={`picker-item${compact ? ' compact' : ''}`} onClick={onAdd} draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd} title={alts.length > 0 ? `${player.name} — natural di ${naturalPositionsOf(player).join(' · ')}` : 'Seret ke lapangan/bench'}>
            <div className={`picker-thumb rank-${cardOf(player)}`} style={src ? { backgroundImage: `url('${src}')` } : {}}>
                {!src && <i className="fa-solid fa-user"></i>}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white truncate">{player.name}</p>
                <p className="text-[9px] text-midnight-300 flex items-center gap-1.5"><span>{player.position}{alts.length > 0 ? ` (${alts.join('/')})` : ''} &middot; OVR {player.ovr}</span><FootBadge foot={player.preferred_foot} size="xs" /></p>
            </div>
            <span className={`rank-badge ${cardOf(player)} shrink-0`}><i className={`fa-solid ${RANK_ICON[cardOf(player)] || 'fa-shield-halved'} text-[9px]`}></i> {cardLabel(player)}</span>
        </div>
    );
}

export { RANK_ICON };
