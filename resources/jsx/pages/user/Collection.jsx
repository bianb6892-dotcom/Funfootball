import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { PlayerCard, EmptyState } from '../../components/common';
import { PlayerDetail } from '../../components/PlayerModals';

const RANKS = ['bronze', 'silver', 'gold', 'diamond', 'legend'];

export function Collection() {
    const [items, setItems] = useState([]);
    const [rank, setRank] = useState('ALL');
    const [category, setCategory] = useState('ALL'); // ALL | BASIC | LEGEND | POTW | FLASHBACK | HALLOWEEN | UEFA | UCL | UEL | UECL
    const [search, setSearch] = useState('');
    const [detail, setDetail] = useState(null);

    const load = useCallback(async () => {
        const params = { per_page: 500 };
        if (rank !== 'ALL') params.rank = rank;
        if (category !== 'ALL') params.category = category.toLowerCase();
        if (search.trim()) params.search = search.trim();
        const { data } = await api.collection(params);
        setItems(data.data);
    }, [rank, category, search]);

    useEffect(() => {
        const t = setTimeout(load, search ? 350 : 0);
        return () => clearTimeout(t);
    }, [load, search]);

    const counts = { bronze: 0, silver: 0, gold: 0, diamond: 0, legend: 0, ucl: 0, uel: 0, uecl: 0, uefa: 0 };
    items.forEach((p) => {
        if (counts[p.rank] !== undefined) counts[p.rank]++;
        if (p.is_ucl) { counts.ucl++; counts.uefa++; }
        if (p.is_uel) { counts.uel++; counts.uefa++; }
        if (p.is_uecl) { counts.uecl++; counts.uefa++; }
    });

    return (
        <div className="space-y-6">
            <div className="ff-card p-6 rounded-3xl">
                <h2 className="font-display text-xl font-black ff-gradient-text">KOLEKSI SAYA</h2>
                <p className="text-xs text-midnight-300 mt-1">Pemain yang kamu dapatkan dari gacha</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
                    {RANKS.map((r) => (
                        <div key={r} className={`p-4 rounded-2xl rank-${r} border text-center`}>
                            <span className={`rank-badge ${r}`}>{r}</span>
                            <p className="font-display font-extrabold text-2xl text-white mt-2">{counts[r]}</p>
                        </div>
                    ))}
                    <div className="p-4 rounded-2xl border text-center bg-gradient-to-br from-[#3a2a6b] to-[#060b30] border-violet-300/60">
                        <span className="rank-badge" style={{ background: 'linear-gradient(135deg,#312e81,#7c3aed)', color: '#fff', border: '1px solid rgba(196,181,253,0.9)' }}><i className="fa-solid fa-shield-halved text-[9px]"></i> UEFA</span>
                        <p className="font-display font-extrabold text-2xl text-white mt-2">{counts.uefa}</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="p-4 rounded-2xl border text-center bg-gradient-to-br from-[#101d68] to-[#060b30] border-cyan-300/60">
                        <span className="rank-badge ucl"><i className="fa-solid fa-trophy text-[9px]"></i> UCL</span>
                        <p className="font-display font-extrabold text-2xl text-white mt-2">{counts.ucl}</p>
                    </div>
                    <div className="p-4 rounded-2xl border text-center bg-gradient-to-br from-[#2a1200] to-[#070300] border-orange-300/60">
                        <span className="rank-badge uel"><i className="fa-solid fa-medal text-[9px]"></i> UEL</span>
                        <p className="font-display font-extrabold text-2xl text-white mt-2">{counts.uel}</p>
                    </div>
                    <div className="p-4 rounded-2xl border text-center bg-gradient-to-br from-[#02120a] to-[#010b06] border-emerald-300/60">
                        <span className="rank-badge uecl"><i className="fa-solid fa-award text-[9px]"></i> UECL</span>
                        <p className="font-display font-extrabold text-2xl text-white mt-2">{counts.uecl}</p>
                    </div>
                </div>
            </div>

            <div className="ff-card p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                    {['ALL', 'BASIC', 'LEGEND', 'POTW', 'FLASHBACK', 'HALLOWEEN', 'UEFA', 'UCL', 'UEL', 'UECL'].map((c) => (
                        <button
                            key={c}
                            onClick={() => setCategory(c)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap ${
                                category === c
                                    ? c === 'POTW'
                                        ? 'bg-gradient-to-r from-[#2f8f22] to-[#59C749] text-white shadow-lg'
                                        : c === 'LEGEND'
                                          ? 'bg-gradient-to-r from-[#8a6414] to-[#f0cd56] text-[#3a2800] shadow-lg'
                                          : c === 'FLASHBACK'
                                            ? 'bg-gradient-to-r from-[#3157D5] to-[#5B7CFF] text-white shadow-lg'
                                            : c === 'HALLOWEEN'
                                              ? 'bg-gradient-to-r from-[#3b1454] to-[#4d7c0f] text-white shadow-lg'
                                              : c === 'UEFA'
                                              ? 'bg-gradient-to-r from-[#312e81] to-[#7c3aed] text-white shadow-lg'
                                              : c === 'UCL'
                                                ? 'bg-gradient-to-r from-[#101d68] to-[#22d3ee] text-white shadow-lg'
                                                : c === 'UEL'
                                                  ? 'bg-gradient-to-r from-[#7c2d12] to-[#fb923c] text-white shadow-lg'
                                                  : c === 'UECL'
                                                    ? 'bg-gradient-to-r from-[#022c1c] to-[#00ffa3] text-white shadow-lg'
                                                    : 'bg-gradient-to-r from-midnight-600 to-midnight-400 text-white shadow-lg'
                                    : 'text-midnight-300 bg-midnight-900/60 hover:bg-midnight-800'
                            }`}
                        >
                            {c === 'ALL' ? 'Semua' : c === 'POTW' ? '★ POTW' : c === 'LEGEND' ? (<span><i className="fa-solid fa-crown mr-1"></i>Legend</span>) : c === 'FLASHBACK' ? (<span><i className="fa-solid fa-bolt mr-1"></i>Flashback</span>) : c === 'HALLOWEEN' ? (<span><i className="fa-solid fa-ghost mr-1"></i>Halloween</span>) : c === 'UEFA' ? (<span><i className="fa-solid fa-shield-halved mr-1"></i>UEFA League</span>) : c === 'UCL' ? (<span><i className="fa-solid fa-trophy mr-1"></i>UCL</span>) : c === 'UEL' ? (<span><i className="fa-solid fa-medal mr-1"></i>UEL</span>) : c === 'UECL' ? (<span><i className="fa-solid fa-award mr-1"></i>UECL</span>) : 'Basic'}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col md:flex-row gap-3">
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
