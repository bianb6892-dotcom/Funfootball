import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { errMsg } from '../../utils/game';

export function AdminGacha() {
    const toast = useToast();
    const [packs, setPacks] = useState([]);

    const load = () => api.adminPacks().then(({ data }) => setPacks(Array.isArray(data) ? data : data.data)).catch(() => {});
    useEffect(() => {
        load();
    }, []);
    const save = async (pack) => {
        try {
            const { data } = await api.adminUpdatePack(pack.id, {
                price: Number(pack.price),
                rates: pack.rates,
                is_active: pack.is_active,
            });
            setPacks((ps) => ps.map((p) => (p.id === data.id ? data : p)));
            toast(`${pack.name} tersimpan.`);
        } catch (err) {
            toast(errMsg(err), 'fa-circle-exclamation');
        }
    };

    const setRate = (id, rank, val) => {
        setPacks((ps) => ps.map((p) => (p.id === id ? { ...p, rates: { ...p.rates, [rank]: Number(val) } } : p)));
    };

    return (
        <div className="space-y-6">
            <div className="ff-card p-5 rounded-2xl">
                <h2 className="font-display text-xl font-black ff-gradient-text">GACHA MANAGEMENT</h2>
                <p className="text-xs text-midnight-300 mt-1">
                    Harga & probability dikelola di database. Total bobot tidak harus 100 — sistem menormalisasi otomatis.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {packs.map((pack) => (
                    <div key={pack.id} className="ff-card p-5 rounded-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <h3 className="font-display font-bold text-white">{pack.name}</h3>
                            <span className="text-[10px] text-midnight-300">/{pack.slug}</span>
                            <label className="ml-auto flex items-center gap-2 text-[11px] text-midnight-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!pack.is_active}
                                    onChange={(e) => setPacks((ps) => ps.map((p) => (p.id === pack.id ? { ...p, is_active: e.target.checked } : p)))}
                                    className="accent-midnight-400"
                                />
                                Aktif
                            </label>
                        </div>
                        <div>
                            <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1">Harga (coins)</label>
                            <input
                                type="number"
                                min={0}
                                value={pack.price}
                                onChange={(e) => setPacks((ps) => ps.map((p) => (p.id === pack.id ? { ...p, price: e.target.value } : p)))}
                                className="w-full bg-midnight-950/80 text-sm text-white p-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400"
                            />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {['bronze', 'silver', 'gold', 'diamond'].map((r) => (
                                <div key={r}>
                                    <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1 capitalize">{r} %</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={pack.rates?.[r] ?? 0}
                                        onChange={(e) => setRate(pack.id, r, e.target.value)}
                                        className="w-full bg-midnight-950/80 text-sm text-white p-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400"
                                    />
                                </div>
                            ))}
                        </div>
                        <button onClick={() => save(pack)} className="gold-btn px-5 py-2 rounded-xl text-[11px] font-bold uppercase w-full">
                            Simpan Pack
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
