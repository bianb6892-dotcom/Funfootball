import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { PlayerCard, EmptyState } from '../../components/common';
import { PlayerDetail } from '../../components/PlayerModals';

const RANKS = ['bronze', 'silver', 'gold', 'diamond'];

export function Collection() {
    const [items, setItems] = useState([]);
    const [rank, setRank] = useState('ALL');
    const [search, setSearch] = useState('');
    const [detail, setDetail] = useState(null);

    const load = useCallback(async () => {
        const params = { per_page: 48 };
        if (rank !== 'ALL') params.rank = rank;
        if (search.trim()) params.search = search.trim();
        const { data } = await api.collection(params);
        setItems(data.data);
    }, [rank, search]);

    useEffect(() => {
        const t = setTimeout(load, search ? 350 : 0);
        return () => clearTimeout(t);
    }, [load, search]);

    const counts = { bronze: 0, silver: 0, gold: 0, diamond: 0 };
    items.forEach((p) => {
        if (counts[p.rank] !== undefined) counts[p.rank]++;
    });

    return (
        <div className="space-y-6">
            <div className="ff-card p-6 rounded-3xl">
                <h2 className="font-display text-xl font-black ff-gradient-text">KOLEKSI SAYA</h2>
                <p className="text-xs text-midnight-300 mt-1">Pemain yang kamu dapatkan dari gacha</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    {RANKS.map((r) => (
                        <div key={r} className={`p-4 rounded-2xl rank-${r} border text-center`}>
                            <span className={`rank-badge ${r}`}>{r}</span>
                            <p className="font-display font-extrabold text-2xl text-white mt-2">{counts[r]}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="ff-card p-4 rounded-2xl flex flex-col md:flex-row gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                    {['ALL', ...RANKS].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRank(r)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap ${
                                rank === r
                                    ? 'bg-gradient-to-r from-midnight-600 to-midnight-400 text-white shadow-lg'
                                    : 'text-midnight-300 bg-midnight-900/60 hover:bg-midnight-800'
                            }`}
                        >
                            {r === 'ALL' ? 'Semua' : r}
                        </button>
                    ))}
                </div>
                <div className="relative md:ml-auto md:w-64">
                    <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-midnight-300 text-xs"></i>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari pemain..."
                        className="w-full bg-midnight-950/80 text-xs text-white placeholder-midnight-300/60 pl-9 pr-4 py-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400 transition"
                    />
                </div>
            </div>

            {items.length === 0 ? (
                <EmptyState
                    icon="fa-dice"
                    title="Koleksi Kosong"
                    subtitle="Buka pack di halaman Gacha untuk mendapatkan pemain!"
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {items.map((p) => (
                        <PlayerCard key={p.id} player={p} onClick={() => setDetail(p)} />
                    ))}
                </div>
            )}

            <PlayerDetail player={detail} onClose={() => setDetail(null)} />
        </div>
    );
}
