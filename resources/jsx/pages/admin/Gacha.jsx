import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { errMsg } from '../../utils/game';

const PACK_RANKS = ['bronze', 'silver', 'gold', 'diamond', 'legend', 'potw', 'flashback', 'halloween', 'ucl', 'uel', 'uecl'];
const emptyPack = { name: '', price: 500, rates: { bronze: 70, silver: 25, gold: 5, diamond: 0, legend: 0, potw: 0, flashback: 0, halloween: 0, ucl: 0, uel: 0, uecl: 0 }, allowed_ranks: ['bronze', 'silver', 'gold', 'diamond'], is_active: true };

export function AdminGacha() {
    const toast = useToast();
    const [packs, setPacks] = useState([]);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState(emptyPack);
    const [bannerFile, setBannerFile] = useState(null);
    const [editBanner, setEditBanner] = useState({}); // packId -> File
    const [removeBanner, setRemoveBanner] = useState({}); // packId -> true (hapus banner saat simpan)

    const load = () => api.adminPacks().then(({ data }) => setPacks(Array.isArray(data) ? data : data.data)).catch(() => {});
    useEffect(() => {
        load();
    }, []);

    const toFormData = (p, banner, rmBanner = false) => {
        const fd = new FormData();
        if (p.name !== undefined) fd.append('name', p.name);
        if (p.price !== undefined && p.price !== '') fd.append('price', Number(p.price));
        if (p.is_active !== undefined) fd.append('is_active', p.is_active ? 1 : 0);
        if (p.rates) Object.entries(p.rates).forEach(([k, v]) => fd.append(`rates[${k}]`, Number(v) || 0));
        if (p.allowed_ranks) p.allowed_ranks.forEach((r) => fd.append('allowed_ranks[]', r));
        if (banner) fd.append('banner', banner);
        if (rmBanner) fd.append('remove_banner', 1);
        return fd;
    };

    const save = async (pack, banner) => {
        try {
            const { data } = await api.adminSavePack(pack.id, toFormData(pack, banner, !!removeBanner[pack.id]));
            setPacks((ps) => ps.map((p) => (p.id === data.id ? data : p)));
            setEditBanner((m) => ({ ...m, [pack.id]: null }));
            setRemoveBanner((m) => ({ ...m, [pack.id]: false }));
            toast(`${pack.name} tersimpan.`);
        } catch (err) {
            toast(errMsg(err), 'fa-circle-exclamation');
        }
    };

    const create = async () => {
        if (!form.name.trim()) { toast('Nama pack wajib diisi.', 'fa-circle-exclamation'); return; }
        if (!form.allowed_ranks.length) { toast('Pilih minimal satu kartu isi pack.', 'fa-circle-exclamation'); return; }
        try {
            const { data } = await api.adminStorePack(toFormData({ ...form, name: form.name.trim() }, bannerFile));
            setPacks((ps) => [...ps, data]);
            setForm(emptyPack);
            setBannerFile(null);
            toast(`${data.name} ditambahkan.`);
        } catch (err) {
            toast(errMsg(err), 'fa-circle-exclamation');
        }
    };

    const remove = async (pack) => {
        if (!window.confirm(`Hapus pack "${pack.name}"? Banner ikut terhapus.`)) return;
        try {
            const { data } = await api.adminDeletePack(pack.id);
            setPacks((ps) => ps.filter((p) => p.id !== pack.id));
            toast(data.message);
        } catch (err) {
            toast(errMsg(err), 'fa-circle-exclamation');
        }
    };

    const setRate = (id, rank, val, isNew) => {
        const apply = (p) => ({ ...p, rates: { ...p.rates, [rank]: Number(val) } });
        if (isNew) setForm(apply(form));
        else setPacks((ps) => ps.map((p) => (p.id === id ? apply(p) : p)));
    };

    const toggleAllowed = (id, rank, isNew) => {
        const apply = (p) => {
            const cur = p.allowed_ranks || [];
            return { ...p, allowed_ranks: cur.includes(rank) ? cur.filter((r) => r !== rank) : [...cur, rank] };
        };
        if (isNew) setForm(apply(form));
        else setPacks((ps) => ps.map((p) => (p.id === id ? apply(p) : p)));
    };

    const inputCls = 'w-full bg-midnight-950/80 text-sm text-white p-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400';

    const packCard = (pack, isNew) => {
        const allowed = pack.allowed_ranks || [];
        return (
            <div className="ff-card p-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                    {isNew ? (
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama pack baru..." maxLength={100} className={`${inputCls} font-bold`} />
                    ) : (
                        <>
                            <h3 className="font-display font-bold text-white">{pack.name}</h3>
                            <span className="text-[10px] text-midnight-300">/{pack.slug}</span>
                        </>
                    )}
                    {!isNew && (
                        <label className="ml-auto flex items-center gap-2 text-[11px] text-midnight-300 cursor-pointer shrink-0" title="Sembunyikan/tampilkan pack dari user">
                            <input
                                type="checkbox"
                                checked={!!pack.is_active}
                                onChange={(e) => setPacks((ps) => ps.map((p) => (p.id === pack.id ? { ...p, is_active: e.target.checked } : p)))}
                                className="accent-midnight-400"
                            />
                            Aktif
                        </label>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1">Harga (coins)</label>
                        <input
                            type="number" min={0}
                            value={isNew ? form.price : pack.price}
                            onChange={(e) => (isNew ? setForm({ ...form, price: e.target.value }) : setPacks((ps) => ps.map((p) => (p.id === pack.id ? { ...p, price: e.target.value } : p))))}
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1">Banner (opsional)</label>
                        <div className="flex items-center gap-2">
                            {(isNew ? bannerFile : editBanner[pack.id] || (!removeBanner[pack.id] && pack.banner_url)) && (
                                <img
                                    src={isNew || editBanner[pack.id] ? URL.createObjectURL(isNew ? bannerFile : editBanner[pack.id]) : pack.banner_url}
                                    alt="banner"
                                    className="w-16 h-10 rounded-lg object-cover border border-midnight-400/40 shrink-0"
                                />
                            )}
                            <input
                                type="file" accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => (isNew ? setBannerFile(e.target.files[0] || null) : (setEditBanner((m) => ({ ...m, [pack.id]: e.target.files[0] || null })), setRemoveBanner((m) => ({ ...m, [pack.id]: false }))))}
                                className="text-[11px] text-midnight-300 w-full"
                            />
                            {!isNew && pack.banner_url && !removeBanner[pack.id] && (
                                <button
                                    onClick={() => { setRemoveBanner((m) => ({ ...m, [pack.id]: true })); setEditBanner((m) => ({ ...m, [pack.id]: null })); }}
                                    title="Hapus banner saat Simpan Pack"
                                    className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase border border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-600 hover:text-white transition whitespace-nowrap shrink-0"
                                >
                                    <i className="fa-solid fa-trash mr-1"></i>Hapus
                                </button>
                            )}
                            {!isNew && removeBanner[pack.id] && (
                                <button
                                    onClick={() => setRemoveBanner((m) => ({ ...m, [pack.id]: false }))}
                                    title="Batalkan hapus banner"
                                    className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase border border-midnight-400/50 text-midnight-200 whitespace-nowrap shrink-0"
                                >
                                    Batal
                                </button>
                            )}
                        </div>
                        {!isNew && removeBanner[pack.id] && (
                            <p className="text-[10px] text-red-400 mt-1">Banner akan dihapus saat "Simpan Pack" ditekan.</p>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1">Kartu isi pack (centang yang boleh keluar)</label>
                    <div className="flex flex-wrap gap-1.5">
                        {PACK_RANKS.map((r) => (
                            <button
                                key={r}
                                onClick={() => toggleAllowed(isNew ? null : pack.id, r, isNew)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition ${
                                    allowed.includes(r)
                                        ? 'bg-midnight-600/60 border-midnight-300/60 text-white'
                                        : 'border-midnight-700 text-midnight-400 hover:border-midnight-500'
                                }`}
                            >
                                {r === 'potw' ? '★ POTW' : r}
                            </button>
                        ))}
                    </div>
                    {!isNew && pack.slug === 'potw' && (
                        <p className="text-[11px] text-[#7ee86a] mt-2">
                            <i className="fa-solid fa-star mr-1"></i>Contoh pack khusus: hanya ★ POTW yang dicentang.
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1">Kemungkinan % (hanya rank yang dicentang yang dipakai)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {PACK_RANKS.map((r) => (
                            <div key={r} className={allowed.includes(r) ? '' : 'opacity-40'}>
                                <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1 capitalize">{r === 'potw' ? '★ POTW' : r} %</label>
                                <input
                                    type="number" min={0} max={100}
                                    value={(isNew ? form.rates : pack.rates)?.[r] ?? 0}
                                    onChange={(e) => setRate(isNew ? null : pack.id, r, e.target.value, isNew)}
                                    className={inputCls}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => (isNew ? create() : save(pack, editBanner[pack.id]))} className="gold-btn px-5 py-2 rounded-xl text-[11px] font-bold uppercase flex-1">
                        {isNew ? 'Tambah Pack' : 'Simpan Pack'}
                    </button>
                    {!isNew && (
                        <button onClick={() => remove(pack)} className="px-4 py-2 rounded-xl text-[11px] font-bold uppercase border border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-600 hover:text-white transition" title="Hapus pack">
                            <i className="fa-solid fa-trash"></i>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="ff-card p-5 rounded-2xl flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <h2 className="font-display text-xl font-black ff-gradient-text">GACHA MANAGEMENT</h2>
                    <p className="text-xs text-midnight-300 mt-1">
                        Tambah / hapus / sembunyikan pack. Tentukan kartu isinya + % kemungkinan. Total bobot tidak harus 100.
                    </p>
                </div>
                <button onClick={() => setCreating((v) => !v)} className="gold-btn px-4 py-2.5 rounded-xl text-xs font-bold uppercase whitespace-nowrap">
                    <i className={`fa-solid ${creating ? 'fa-chevron-up' : 'fa-plus'} mr-1`}></i> {creating ? 'Tutup' : 'Tambah Pack'}
                </button>
            </div>

            {creating && packCard({ ...form, id: 'new' }, true)}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {packs.map((pack) => (
                    <div key={pack.id}>{packCard(pack, false)}</div>
                ))}
            </div>
        </div>
    );
}
