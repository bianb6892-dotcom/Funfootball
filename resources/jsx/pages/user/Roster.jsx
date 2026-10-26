import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { PlayerCard, EmptyState, StatWidget } from '../../components/common';
import { PlayerDetail, CompareModal } from '../../components/PlayerModals';
import { errMsg } from '../../utils/game';

const FILTERS = ['ALL', 'GK', 'DF', 'MF', 'FW'];
// Kategori kartu: ALL = semua, BASIC = kartu reguler tanpa legend,
// LEGEND = hanya kartu Legend, POTW = hanya Player of the Week,
// FLASHBACK = hanya kartu Flashback,
// UEFA = gabungan UCL + UEL + UECL,
// UCL/UEL/UECL = masing-masing kartu UEFA.
const CATEGORIES = [
    { id: 'ALL', label: 'Semua' },
    { id: 'BASIC', label: 'Basic' },
    { id: 'LEGEND', label: 'Legend', icon: 'fa-crown' },
    { id: 'POTW', label: '★ POTW' },
    { id: 'FLASHBACK', label: 'Flashback', icon: 'fa-bolt' },
    { id: 'UEFA', label: 'UEFA League', icon: 'fa-shield-halved' },
    { id: 'UCL', label: 'UCL', icon: 'fa-trophy' },
    { id: 'UEL', label: 'UEL', icon: 'fa-medal' },
    { id: 'UECL', label: 'UECL', icon: 'fa-award' },
];
// Pilihan posisi detail per lini (filter grup DF/MF/FW di backend mencakup detail + data lama).
const DETAIL_BY_GROUP = {
    DF: ['LB', 'CB', 'RB'],
    MF: ['LM', 'CM', 'CDM', 'CAM', 'RM'],
    FW: ['LW', 'ST', 'SS', 'RW'],
};

export function Roster() {
    const [players, setPlayers] = useState([]);
    const [meta, setMeta] = useState(null);
    const [filter, setFilter] = useState('ALL');
    const [detailPos, setDetailPos] = useState('ALL'); // posisi detail dalam grup (ALL = semua selini)
    const [category, setCategory] = useState('ALL'); // ALL | BASIC | LEGEND | POTW | FLASHBACK | UEFA | UCL | UEL | UECL
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('ovr-desc');
    const [page, setPage] = useState(1);
    const [detail, setDetail] = useState(null);
    const [compare, setCompare] = useState({ open: false, id: null });

    const load = useCallback(async () => {
        try {
            const params = { page, per_page: 24, sort };
            // Jika posisi detail dipilih, filter persis; kalau tidak, filter grup lini.
            if (detailPos !== 'ALL' && DETAIL_BY_GROUP[filter]?.includes(detailPos)) params.position = detailPos;
            else if (filter !== 'ALL') params.position = filter;
            // Kategori kartu bekerja bersamaan dengan posisi + search (tanpa reload).
            if (category !== 'ALL') params.category = category.toLowerCase();
            if (search.trim()) params.search = search.trim();
            const { data } = await api.players(params);
            setPlayers(data.data);
            setMeta(data);
        } catch (err) {
            console.error(errMsg(err));
        }
    }, [page, filter, detailPos, category, search, sort]);

    useEffect(() => {
        const t = setTimeout(load, search ? 350 : 0);
        return () => clearTimeout(t);
    }, [load, search]);

    useEffect(() => {
        setPage(1);
    }, [filter, detailPos, category, sort]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatWidget icon="fa-users" label="Total Pemain" value={meta?.total ?? 0} />
                <StatWidget icon="fa-star" label="Rating Tertinggi" value={players[0]?.ovr ?? 0} />
                <StatWidget icon="fa-layer-group" label="Halaman" value={meta ? `${meta.current_page}/${meta.last_page}` : '—'} />
                <StatWidget icon="fa-filter" label="Filter" value={filter} />
            </div>

            <div className="flex items-center justify-end">
                <button
                    onClick={() => setCompare({ open: true, id: null })}
                    className="ff-outline-btn px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider"
                >
                    <i className="fa-solid fa-code-compare mr-1"></i> Komparasi Pemain
                </button>
            </div>

            <div className="ff-card p-4 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                    {CATEGORIES.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => setCategory(c.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap ${
                                category === c.id
                                    ? c.id === 'POTW'
                                        ? 'bg-gradient-to-r from-[#2f8f22] to-[#59C749] text-white shadow-lg'
                                        : c.id === 'LEGEND'
                                          ? 'bg-gradient-to-r from-[#8a6414] to-[#f0cd56] text-[#3a2800] shadow-lg'
                                          : c.id === 'FLASHBACK'
                                            ? 'bg-gradient-to-r from-[#3157D5] to-[#5B7CFF] text-white shadow-lg'
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
                        {category === 'POTW' ? 'hanya Player of the Week' : category === 'LEGEND' ? 'hanya kartu Legend' : category === 'FLASHBACK' ? 'hanya kartu Flashback (max OVR 97)' : category === 'UEFA' ? 'gabungan UCL + UEL + UECL (max OVR 97)' : category === 'UCL' ? 'hanya kartu UCL (max OVR 97)' : category === 'UEL' ? 'hanya kartu UEL (max OVR 97)' : category === 'UECL' ? 'hanya kartu UECL (max OVR 97)' : category === 'BASIC' ? 'Diamond · Gold · Silver · Bronze' : 'semua kartu'}
                    </span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                    {FILTERS.map((f) => (
                        <button
                            key={f}
                            onClick={() => { setFilter(f); setDetailPos('ALL'); }}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap ${
                                filter === f
                                    ? 'bg-gradient-to-r from-midnight-600 to-midnight-400 text-white shadow-lg'
                                    : 'text-midnight-300 bg-midnight-900/60 hover:bg-midnight-800'
                            }`}
                        >
                            {f === 'ALL' ? 'Semua' : f}
                        </button>
                    ))}
                    {DETAIL_BY_GROUP[filter] && (
                        <select
                            value={detailPos}
                            onChange={(e) => setDetailPos(e.target.value)}
                            className="bg-midnight-950/80 text-xs text-midnight-100 px-3 py-2 rounded-xl border border-midnight-700 focus:outline-none cursor-pointer whitespace-nowrap"
                            title="Posisi detail"
                        >
                            <option value="ALL">Semua {filter}</option>
                            {DETAIL_BY_GROUP[filter].map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    )}
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto md:ml-auto">
                    <div className="relative flex-1 md:w-64">
                        <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-midnight-300 text-xs"></i>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari pemain, klub, negara..."
                            className="w-full bg-midnight-950/80 text-xs text-white placeholder-midnight-300/60 pl-9 pr-4 py-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400 transition"
                        />
                    </div>
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="bg-midnight-950/80 text-xs text-midnight-100 px-3 py-2.5 rounded-xl border border-midnight-700 focus:outline-none cursor-pointer"
                    >
                        <option value="ovr-desc">Rating: Tertinggi</option>
                        <option value="ovr-asc">Rating: Terendah</option>
                        <option value="name-asc">Nama: A - Z</option>
                        <option value="number-asc">Nomor Punggung</option>
                    </select>
                </div>
                </div>
            </div>

            {players.length === 0 ? (
                <EmptyState title="Pemain Tidak Ditemukan" subtitle="Coba ubah filter atau kata kunci pencarian." />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {players.map((p) => (
                        <PlayerCard key={p.id} player={p} onClick={() => setDetail(p)} />
                    ))}
                </div>
            )}

            {meta && meta.last_page > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage((x) => x - 1)}
                        className="ff-outline-btn px-4 py-2 rounded-xl text-xs disabled:opacity-40"
                    >
                        <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <span className="text-xs text-midnight-300">
                        {meta.current_page} / {meta.last_page}
                    </span>
                    <button
                        disabled={page >= meta.last_page}
                        onClick={() => setPage((x) => x + 1)}
                        className="ff-outline-btn px-4 py-2 rounded-xl text-xs disabled:opacity-40"
                    >
                        <i className="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            )}

            <PlayerDetail
                player={detail}
                onClose={() => setDetail(null)}
                onCompare={(p) => {
                    setDetail(null);
                    setCompare({ open: true, id: p.id });
                }}
            />
            <CompareModal
                open={compare.open}
                initialId={compare.id}
                allPlayers={players}
                onClose={() => setCompare({ open: false, id: null })}
            />
        </div>
    );
}
