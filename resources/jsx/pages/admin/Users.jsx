import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Modal, EmptyState } from '../../components/common';
import { errMsg, timeID } from '../../utils/game';

export function AdminUsers() {
    const toast = useToast();
    const [users, setUsers] = useState([]);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [detail, setDetail] = useState(null);

    const load = async (p = page) => {
        const { data } = await api.adminUsers({ page: p, search: search.trim() || undefined });
        setUsers(data.data);
        setMeta(data);
    };

    useEffect(() => {
        load().catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    useEffect(() => {
        const t = setTimeout(() => {
            setPage(1);
            if (page === 1) load(1).catch(() => {});
        }, 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const openDetail = async (id) => {
        try {
            const { data } = await api.adminUserDetail(id);
            setDetail(data);
        } catch (err) {
            toast(errMsg(err), 'fa-circle-exclamation');
        }
    };

    const toggle = async (u) => {
        try {
            await api.adminToggleUser(u.id);
            toast(`${u.name} ${u.is_active ? 'dinonaktifkan' : 'diaktifkan'}.`);
            load();
            setDetail(null);
        } catch (err) {
            toast(errMsg(err), 'fa-circle-exclamation');
        }
    };

    return (
        <div className="space-y-6">
            <div className="ff-card p-5 rounded-2xl flex flex-wrap items-center gap-3">
                <div>
                    <h2 className="font-display text-xl font-black ff-gradient-text">USER MANAGEMENT</h2>
                    <p className="text-xs text-midnight-300">Total: {meta?.total ?? 0} user</p>
                </div>
                <div className="relative ml-auto w-full sm:w-64">
                    <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-midnight-300 text-xs"></i>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari nama / email..."
                        className="w-full bg-midnight-950/80 text-xs text-white placeholder-midnight-300/60 pl-9 pr-4 py-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400 transition"
                    />
                </div>
            </div>

            <div className="ff-card rounded-2xl overflow-x-auto">
                <table className="w-full text-xs min-w-[640px]">
                    <thead>
                        <tr className="text-left text-midnight-300 uppercase text-[10px] tracking-wider border-b border-midnight-700">
                            <th className="p-4">User</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Coins</th>
                            <th className="p-4">Koleksi</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.id} className="border-b border-midnight-700/40 hover:bg-midnight-800/40">
                                <td className="p-4">
                                    <p className="font-bold text-white">{u.team_name || u.name}</p>
                                    <p className="text-midnight-300 text-[11px]">{u.email}</p>
                                </td>
                                <td className="p-4"><span className="rank-badge gold">{u.role}</span></td>
                                <td className="p-4 font-display font-bold text-gold-300">{Number(u.coins).toLocaleString('id-ID')}</td>
                                <td className="p-4 text-midnight-100">{u.user_players_count}</td>
                                <td className="p-4">
                                    <span className={`rank-badge ${u.is_active ? 'diamond' : 'bronze'}`}>
                                        {u.is_active ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </td>
                                <td className="p-4 text-right whitespace-nowrap">
                                    <button onClick={() => openDetail(u.id)} className="ff-outline-btn px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase mr-2">
                                        Detail
                                    </button>
                                    <button onClick={() => toggle(u)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-red-500/50 text-red-400">
                                        {u.is_active ? 'Disable' : 'Enable'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {users.length === 0 && <EmptyState title="Tidak ada user" />}
            </div>

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

            <Modal open={!!detail} onClose={() => setDetail(null)} maxWidth="max-w-2xl">
                {detail && <UserDetail data={detail} onChanged={(fresh) => { if (fresh) setDetail(fresh); load(); }} />}
            </Modal>
        </div>
    );
}

function UserDetail({ data, onChanged }) {
    const toast = useToast();
    const [amount, setAmount] = useState('');
    const [desc, setDesc] = useState('');
    const [tokenAmount, setTokenAmount] = useState('');
    const [tokenDesc, setTokenDesc] = useState('');
    const { user } = data;

    const adjust = async () => {
        try {
            await api.adminAdjustCoins(user.id, { amount: Number(amount), description: desc || undefined });
            toast('Coins diadjust.');
            const { data: fresh } = await api.adminUserDetail(user.id);
            onChanged(fresh);
        } catch (err) {
            toast(errMsg(err), 'fa-circle-exclamation');
        }
    };

    const adjustTokens = async () => {
        try {
            await api.adminAdjustTokens(user.id, { amount: Number(tokenAmount), description: tokenDesc || undefined });
            toast('Token diadjust.');
            const { data: fresh } = await api.adminUserDetail(user.id);
            onChanged(fresh);
        } catch (err) {
            toast(errMsg(err), 'fa-circle-exclamation');
        }
    };

    return (
        <div className="space-y-5">
            <div>
                <h3 className="font-display text-xl font-bold text-white">{user.team_name || user.name}</h3>
                <p className="text-xs text-midnight-300">{user.email} &middot; {user.user_players_count} koleksi</p>
                <p className="font-display text-2xl font-black text-gold-300 mt-2">
                    {Number(user.coins).toLocaleString('id-ID')} <span className="text-xs text-midnight-300 font-sans font-semibold">coins</span>
                    <span className="ml-3 text-sky-300">{Number(user.event_tokens ?? 0).toLocaleString('id-ID')}</span> <span className="text-xs text-midnight-300 font-sans font-semibold">token</span>
                </p>
            </div>

            <div className="bg-midnight-950/60 rounded-2xl border border-midnight-700/60 p-4">
                <h4 className="text-xs font-bold text-midnight-200 uppercase mb-3">Adjust Coins</h4>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="+500 / -200"
                        className="flex-1 bg-midnight-950 text-sm text-white p-2.5 rounded-xl border border-midnight-700 focus:outline-none"
                    />
                    <input
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        placeholder="Keterangan"
                        className="flex-1 bg-midnight-950 text-sm text-white p-2.5 rounded-xl border border-midnight-700 focus:outline-none"
                    />
                    <button onClick={adjust} className="gold-btn px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase">
                        Apply
                    </button>
                </div>
            </div>

            <div className="bg-midnight-950/60 rounded-2xl border border-midnight-700/60 p-4">
                <h4 className="text-xs font-bold text-midnight-200 uppercase mb-3">Adjust Token Event</h4>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="number"
                        value={tokenAmount}
                        onChange={(e) => setTokenAmount(e.target.value)}
                        placeholder="+5 / -2"
                        className="flex-1 bg-midnight-950 text-sm text-white p-2.5 rounded-xl border border-midnight-700 focus:outline-none"
                    />
                    <input
                        value={tokenDesc}
                        onChange={(e) => setTokenDesc(e.target.value)}
                        placeholder="Keterangan"
                        className="flex-1 bg-midnight-950 text-sm text-white p-2.5 rounded-xl border border-midnight-700 focus:outline-none"
                    />
                    <button onClick={adjustTokens} className="gold-btn px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase">
                        Apply
                    </button>
                </div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-midnight-200 uppercase mb-2">History Token (20 terakhir)</h4>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {(data.tokens_history || []).map((t) => (
                        <div key={t.id} className="flex items-center justify-between text-[11px] bg-midnight-950/60 rounded-lg px-3 py-2">
                            <span className="text-white">{t.description || t.type}</span>
                            <span className={`font-bold ${t.amount >= 0 ? 'text-sky-300' : 'text-red-400'}`}>
                                {t.amount >= 0 ? '+' : ''}{t.amount}🎟
                            </span>
                            <span className="text-midnight-300">{timeID(t.created_at)}</span>
                        </div>
                    ))}
                    {(data.tokens_history || []).length === 0 && <p className="text-[11px] text-midnight-300">Belum ada transaksi token.</p>}
                </div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-midnight-200 uppercase mb-2">History Coins (20 terakhir)</h4>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {data.coins_history.map((t) => (
                        <div key={t.id} className="flex items-center justify-between text-[11px] bg-midnight-950/60 rounded-lg px-3 py-2">
                            <span className="text-white">{t.description || t.type}</span>
                            <span className={`font-bold ${t.amount >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>
                                {t.amount >= 0 ? '+' : ''}{t.amount}
                            </span>
                            <span className="text-midnight-300">{timeID(t.created_at)}</span>
                        </div>
                    ))}
                    {data.coins_history.length === 0 && <p className="text-[11px] text-midnight-300">Belum ada transaksi.</p>}
                </div>
            </div>
        </div>
    );
}
