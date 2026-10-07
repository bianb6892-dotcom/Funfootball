import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { PlayerCard, EmptyState, StatWidget } from '../../components/common';
import { PlayerDetail, CompareModal } from '../../components/PlayerModals';
import { errMsg } from '../../utils/game';

const FILTERS = ['ALL', 'GK', 'DF', 'MF', 'FW'];

export function Roster() {
    const [players, setPlayers] = useState([]);
    const [meta, setMeta] = useState(null);
    const [filter, setFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('ovr-desc');
    const [page, setPage] = useState(1);
    const [detail, setDetail] = useState(null);
    const [compare, setCompare] = useState({ open: false, id: null });

    const load = useCallback(async () => {
        try {
            const params = { page, per_page: 24, sort };
            if (filter !== 'ALL') params.position = filter;
            if (search.trim()) params.search = search.trim();
            const { data } = await api.players(params);
            setPlayers(data.data);
            setMeta(data);
        } catch (err) {
            console.error(errMsg(err));
        }
    }, [page, filter, search, sort]);

    useEffect(() => {
        const t = setTimeout(load, search ? 350 : 0);
        return () => clearTimeout(t);
    }, [load, search]);

    useEffect(() => {
        setPage(1);
    }, [filter, sort]);

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

            <div className="ff-card p-4 rounded-2xl flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                    {FILTERS.map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap ${
                                filter === f
                                    ? 'bg-gradient-to-r from-midnight-600 to-midnight-400 text-white shadow-lg'
                                    : 'text-midnight-300 bg-midnight-900/60 hover:bg-midnight-800'
                            }`}
                        >
                            {f === 'ALL' ? 'Semua' : f}
                        </button>
                    ))}
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
