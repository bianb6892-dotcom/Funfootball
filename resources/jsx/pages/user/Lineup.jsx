import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common';
import { RANK_ICON, errMsg, imgSrc } from '../../utils/game';

export function Lineup() {
    const toast = useToast();
    const [data, setData] = useState(null);
    const [collection, setCollection] = useState([]);
    const [picker, setPicker] = useState(null); // {type:'slot', slot} | {type:'bench', index}
    const [saving, setSaving] = useState(false);

    const load = async () => {
        const [{ data: lu }, { data: col }] = await Promise.all([
            api.lineup(),
            api.collection({ per_page: 200 }),
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
    const usedIds = new Set([
        ...starters.map((s) => s.player.id),
        ...benchArr.map((p) => p.id),
    ]);
    const available = collection.filter((p) => !usedIds.has(p.id));

    const assign = (player) => {
        if (picker.type === 'slot') {
            const cur = {};
            starters.forEach((s) => {
                if (s?.player?.id) cur[s.slot_id] = s.player.id;
            });
            cur[picker.slot.id] = player.id;
            setData({
                ...data,
                starters: slots
                    .map((sl) => (cur[sl.id] ? { slot_id: sl.id, slot_position: sl.pos, player: sl.id === picker.slot.id ? player : bySlot[sl.id]?.player } : null))
                    .filter(Boolean),
            });
        } else {
            const bench = [...benchArr];
            bench[picker.index] = player;
            setData({ ...data, bench });
        }
        setPicker(null);
    };

    const removeStarter = (slotId) => {
        setData({ ...data, starters: starters.filter((s) => s.slot_id !== slotId) });
    };

    const removeBench = (index) => {
        const bench = [...benchArr];
        bench.splice(index, 1);
        setData({ ...data, bench });
    };

    const autoFill = () => {
        // greedy: untuk tiap slot kosong pilih available dengan adjusted terbaik (aproksimasi: OVR - penalty posisi)
        const penalty = { exact: 0, adjacent: -3, far: -10 };
        const compat = (pp, sp) => {
            if (pp === sp) return 'exact';
            if ((pp === 'DF' && sp === 'MF') || (pp === 'MF' && (sp === 'DF' || sp === 'FW')) || (pp === 'FW' && sp === 'MF')) return 'adjacent';
            return 'far';
        };
        const pool = [...available].sort((a, b) => b.ovr - a.ovr);
        const nextStarters = [...starters];
        const taken = new Set(pool.map(() => null));
        const used = new Set([...nextStarters.map((s) => s.player.id), ...benchArr.map((p) => p.id)]);
        slots.forEach((sl) => {
            if (nextStarters.find((s) => s.slot_id === sl.id)) return;
            let best = null;
            let bestScore = -999;
            pool.forEach((p) => {
                if (used.has(p.id)) return;
                const score = p.ovr + penalty[compat(p.position, sl.pos)];
                if (score > bestScore) {
                    bestScore = score;
                    best = p;
                }
            });
            if (best) {
                used.add(best.id);
                nextStarters.push({ slot_id: sl.id, slot_position: sl.pos, player: best });
            }
        });
        const bench = [...benchArr];
        pool.forEach((p) => {
            if (bench.length >= 7) return;
            if (!used.has(p.id)) {
                used.add(p.id);
                bench.push(p);
            }
        });
        void taken;
        setData({ ...data, starters: nextStarters, bench });
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

    const ovrCls = (compat) => (compat === 'exact' ? 'green' : compat === 'adjacent' ? 'yellow' : 'red');

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    ['fa-star', 'Team OVR', data.team_ovr],
                    ['fa-users', 'Terisi', `${data.filled}/11`],
                    ['fa-triangle-exclamation', 'Penalty', data.penalty_total > 0 ? `-${data.penalty_total}` : '0'],
                    ['fa-chair', 'Bench', `${benchArr.length}/7`],
                ].map(([icon, label, value]) => (
                    <div key={label} className="ff-card p-4 rounded-2xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-midnight-800/80 border border-midnight-400/30 flex items-center justify-center text-midnight-300 shrink-0">
                            <i className={`fa-solid ${icon}`}></i>
                        </div>
                        <div>
                            <span className="text-[10px] text-midnight-300 uppercase font-semibold">{label}</span>
                            <h3 className="text-xl font-bold text-white font-display">{value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="ff-card p-4 rounded-2xl flex flex-wrap items-center gap-3">
                <span className="text-xs text-midnight-300 uppercase font-semibold">
                    <i className="fa-solid fa-chess mr-1"></i> Formasi:
                </span>
                <div className="flex flex-wrap gap-2">
                    {Object.keys(data.formations || {}).map((f) => (
                        <button
                            key={f}
                            onClick={() => setData({ ...data, formation: f, starters: [] })}
                            className={`formation-btn ${data.formation === f ? 'active' : ''}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <button onClick={autoFill} className="gold-btn px-4 py-2 rounded-xl text-[10px] font-bold uppercase">
                        <i className="fa-solid fa-wand-magic-sparkles mr-1"></i> Auto Fill
                    </button>
                    <button onClick={save} disabled={saving} className="gold-btn px-4 py-2 rounded-xl text-[10px] font-bold uppercase disabled:opacity-50">
                        <i className="fa-solid fa-floppy-disk mr-1"></i> {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </div>

            <div className="ff-card p-3 rounded-2xl flex items-center gap-3 border-red-500/30">
                <div className="w-9 h-9 rounded-lg bg-red-500/20 border border-red-400/40 flex items-center justify-center text-red-300 text-sm shrink-0">
                    <i className="fa-solid fa-circle-info"></i>
                </div>
                <p className="text-xs text-midnight-100">
                    <span className="font-bold text-red-300">Position Penalty:</span> ringan (-3) posisi
                    berdekatan, berat (-10) beda jauh. Ganti formasi akan mengosongkan starter.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="ff-card p-4 rounded-3xl">
                        <div className="pitch">
                            <div className="pitch-box-top"></div>
                            <div className="pitch-box-bottom"></div>
                            {slots.map((sl) => {
                                const filled = bySlot[sl.id];
                                return (
                                    <div
                                        key={sl.id}
                                        className={`player-slot ${filled ? '' : 'empty'}`}
                                        style={{ left: `${sl.x}%`, top: `${sl.y}%` }}
                                        onClick={() => (filled ? removeStarter(sl.id) : setPicker({ type: 'slot', slot: sl }))}
                                        title={filled ? `${filled.player.name} (klik untuk hapus)` : `Isi ${sl.label}`}
                                    >
                                        {filled ? (
                                            <>
                                                <div
                                                    className={`slot-circle rank-${filled.player.rank}`}
                                                    style={imgSrc(filled.player) ? { backgroundImage: `url('${filled.player.image_url || `/storage/${filled.player.image_path}`}')` } : {}}
                                                >
                                                    {!imgSrc(filled.player) && <i className="fa-solid fa-user"></i>}
                                                    <div className={`slot-ovr-badge ${ovrCls(filled.compat || 'exact')}`}>{filled.adjusted_ovr ?? filled.player.ovr}</div>
                                                    {(filled.penalty ?? 0) < 0 && <div className="slot-penalty">{filled.penalty}</div>}
                                                </div>
                                                <div className="slot-label">
                                                    {filled.player.name.split(' ').slice(-1)[0]} &middot; {sl.label}
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
                </div>

                <div className="ff-card p-5 rounded-3xl">
                    <h3 className="font-display font-bold text-midnight-200 text-sm uppercase tracking-wider mb-1">
                        <i className="fa-solid fa-chair mr-1"></i> Cadangan (Bench)
                    </h3>
                    <p className="text-[10px] text-midnight-300 mb-3">Maks 7 pemain, tanpa penalty. Klik slot untuk isi/hapus.</p>
                    <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 7 }).map((_, i) => {
                            const p = benchArr[i];
                            return (
                                <div
                                    key={i}
                                    className="bench-slot"
                                    onClick={() => (p ? removeBench(i) : setPicker({ type: 'bench', index: i }))}
                                >
                                    {p ? (
                                        <>
                                            <Thumb player={p} />
                                            <span className="text-[9px] font-bold text-white truncate w-full">
                                                {p.name.split(' ').slice(-1)[0]}
                                            </span>
                                            <span className={`rank-badge ${p.rank} text-[8px]`}>{p.ovr}</span>
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

                    <div className="mt-5 pt-4 border-t border-midnight-400/20">
                        <h4 className="font-display font-bold text-midnight-200 text-xs uppercase tracking-wider mb-2">
                            Koleksi ({available.length})
                        </h4>
                        <p className="text-[10px] text-midnight-300 mb-2">Klik pemain untuk menaruh ke slot/bench yang dipilih, atau:</p>
                        <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                            {available.map((p) => (
                                <QuickAdd key={p.id} player={p} onAdd={() => quickAdd(p)} />
                            ))}
                            {available.length === 0 && (
                                <p className="text-[10px] text-midnight-300 text-center py-3">Semua pemain sudah dipakai.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Modal open={!!picker} onClose={() => setPicker(null)} maxWidth="max-w-lg">
                <h3 className="font-display text-lg font-bold ff-gradient-text mb-1">
                    {picker?.type === 'slot' ? `Pilih untuk ${picker.slot.label} (${picker.slot.pos})` : `Pilih untuk Bench #${(picker?.index ?? 0) + 1}`}
                </h3>
                <p className="text-[10px] text-midnight-300 mb-4">Hanya dari koleksimu yang belum terpakai.</p>
                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                    {available.map((p) => (
                        <div key={p.id} className="picker-item" onClick={() => assign(p)}>
                            <Thumb player={p} />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-white truncate">{p.name}</p>
                                <p className="text-[9px] text-midnight-300">{p.position} &middot; OVR {p.ovr}</p>
                            </div>
                            <span className={`rank-badge ${p.rank} shrink-0`}>{p.rank}</span>
                        </div>
                    ))}
                    {available.length === 0 && <p className="text-xs text-midnight-300 text-center py-6">Tidak ada pemain tersedia.</p>}
                </div>
            </Modal>
        </div>
    );

    function quickAdd(player) {
        // cari slot kosong posisi sama → adjacent → bench
        const compatOf = (pp, sp) => {
            if (pp === sp) return 0;
            if ((pp === 'DF' && sp === 'MF') || (pp === 'MF' && (sp === 'DF' || sp === 'FW')) || (pp === 'FW' && sp === 'MF')) return 1;
            return 2;
        };
        const takenSlots = new Set(starters.map((s) => s.slot_id));
        const cands = slots.filter((sl) => !takenSlots.has(sl.id)).sort((a, b) => compatOf(player.position, a.pos) - compatOf(player.position, b.pos));
        if (cands.length > 0) {
            setData({
                ...data,
                starters: [...starters, { slot_id: cands[0].id, slot_position: cands[0].pos, player }],
            });
        } else if (benchArr.length < 7) {
            setData({ ...data, bench: [...benchArr, player] });
        }
    }
}

function Thumb({ player }) {
    const src = imgSrc(player);
    return (
        <div
            className="picker-thumb"
            style={src ? { backgroundImage: `url('${src}')` } : {}}
        >
            {!src && <i className="fa-solid fa-user"></i>}
        </div>
    );
}

function QuickAdd({ player, onAdd }) {
    const src = imgSrc(player);
    return (
        <div className="picker-item" onClick={onAdd}>
            <div className="picker-thumb" style={src ? { backgroundImage: `url('${src}')` } : {}}>
                {!src && <i className="fa-solid fa-user"></i>}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white truncate">{player.name}</p>
                <p className="text-[9px] text-midnight-300">{player.position} &middot; OVR {player.ovr}</p>
            </div>
            <span className={`rank-badge ${player.rank} shrink-0`}>{player.rank}</span>
        </div>
    );
}

export { RANK_ICON };
