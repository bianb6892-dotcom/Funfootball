import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { COUNTRIES, flagUrl } from '../../utils/countries';
import { PlayerCard, EmptyState, Modal, RankBadge } from '../../components/common';
import { PlayerDetail } from '../../components/PlayerModals';
import { errMsg } from '../../utils/game';

const OUT_STATS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];
const GK_STATS = ['div', 'han', 'kic', 'ref', 'spd', 'pos'];
const LABELS = {
    pac: 'PAC', sho: 'SHO', pas: 'PAS', dri: 'DRI', def: 'DEF', phy: 'PHY',
    div: 'DIV', han: 'HAN', kic: 'KIC', ref: 'REF', spd: 'SPD', pos: 'POS',
};

export function AdminPlayers() {
    const toast = useToast();
    const [players, setPlayers] = useState([]);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [detail, setDetail] = useState(null);
    const [editing, setEditing] = useState(null); // null | {} | player

    const load = async () => {
        const { data } = await api.players({ page, per_page: 24, sort: 'ovr-desc', search: search.trim() || undefined });
        setPlayers(data.data);
        setMeta(data);
    };

    useEffect(() => {
        load().catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    useEffect(() => {
        const t = setTimeout(() => {
            setPage(1);
            if (page === 1) load().catch(() => {});
        }, 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const remove = async (p) => {
        if (!confirm(`Hapus "${p.name}"? Pemain ikut lepas dari koleksi & lineup user yang memilikinya.`)) return;
        try {
            const { data } = await api.adminPlayersDelete(p.id);
            toast(data.message || `"${p.name}" dihapus.`);
            load();
        } catch (err) {
            toast(errMsg(err), 'fa-circle-exclamation');
        }
    };

    const togglePool = async (p) => {
        try {
            await api.adminTogglePool(p.id);
            toast(`${p.name}: pool ${p.is_active_in_gacha ? 'dinonaktifkan' : 'diaktifkan'}.`);
            load();
        } catch (err) {
            toast(errMsg(err), 'fa-circle-exclamation');
        }
    };

    return (
        <div className="space-y-6">
            <div className="ff-card p-5 rounded-2xl flex flex-wrap items-center gap-3">
                <div>
                    <h2 className="font-display text-xl font-black ff-gradient-text">KELOLA PEMAIN</h2>
                    <p className="text-xs text-midnight-300">OVR & rank dihitung otomatis server. Total: {meta?.total ?? 0}</p>
                </div>
                <div className="ml-auto flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-56">
                        <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-midnight-300 text-xs"></i>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari pemain..."
                            className="w-full bg-midnight-950/80 text-xs text-white placeholder-midnight-300/60 pl-9 pr-4 py-2.5 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400 transition"
                        />
                    </div>
                    <button onClick={() => setEditing({})} className="gold-btn px-4 py-2.5 rounded-xl text-xs font-bold uppercase whitespace-nowrap">
                        <i className="fa-solid fa-plus mr-1"></i> Tambah
                    </button>
                </div>
            </div>

            {players.length === 0 ? (
                <EmptyState title="Belum Ada Pemain" subtitle="Tambahkan pemain master pertama." />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {players.map((p) => (
                        <div key={p.id} className="relative">
                            <PlayerCard player={p} onClick={() => setDetail(p)} />
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 translate-y-14 flex gap-1.5 opacity-0 hover:opacity-100 focus-within:opacity-100 transition">
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => setEditing(p)} className="flex-1 ff-outline-btn py-1.5 rounded-lg text-[10px] font-bold uppercase">
                                    <i className="fa-solid fa-pen mr-1"></i> Edit
                                </button>
                                <button onClick={() => togglePool(p)} title="Aktif/nonaktif pool gacha" className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition ${p.is_active_in_gacha ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10' : 'border-midnight-700 text-midnight-300'}`}>
                                    <i className="fa-solid fa-dice mr-1"></i> {p.is_active_in_gacha ? 'Pool ON' : 'Pool OFF'}
                                </button>
                                <button onClick={() => remove(p)} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-600 hover:text-white transition">
                                    <i className="fa-solid fa-trash mr-1"></i> Hapus
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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

            <PlayerDetail player={detail} onClose={() => setDetail(null)} />
            {editing !== null && (
                <PlayerForm
                    player={editing.id ? editing : null}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        load();
                    }}
                />
            )}
        </div>
    );
}

function PlayerForm({ player, onClose, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState(() => ({
        name: player?.name || '',
        club: player?.club || '',
        nationality: player?.nationality || '',
        country_code: player?.country_code || '',
        position: player?.position || 'FW',
        shirt_number: player?.shirt_number || 10,
        age: player?.age || 25,
        pac: player?.pac || 80, sho: player?.sho || 80, pas: player?.pas || 80,
        dri: player?.dri || 80, def: player?.def || 50, phy: player?.phy || 70,
        div: player?.div || 75, han: player?.han || 75, kic: player?.kic || 70,
        ref: player?.ref || 78, spd: player?.spd || 60, pos: player?.pos || 75,
        rank: '',
        is_active_in_gacha: player?.is_active_in_gacha ?? true,
    }));
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [imgError, setImgError] = useState('');
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

    const pickCountry = (e) => {
        const code = e.target.value;
        const found = COUNTRIES.find((c) => c.code === code);
        setForm({ ...form, country_code: code, nationality: found ? found.name : form.nationality });
    };

    const pickFile = (e) => {
        const f = e.target.files[0] || null;
        setImgError('');
        if (f && !/^image\/(jpeg|png|webp)$/.test(f.type)) {
            setImgError('Format harus JPG / PNG / WebP. Foto iPhone (HEIC) perlu dikonversi dulu.');
            setFile(null);
            e.target.value = '';
            return;
        }
        setFile(f);
    };

    // Downscale di browser (seperti prototype): foto HP puluhan MB jadi ~150KB JPEG.
    const processImage = (f) =>
        new Promise((resolve, reject) => {
            const url = URL.createObjectURL(f);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                const MAX = 1024;
                let { width: w, height: h } = img;
                if (w > h && w > MAX) {
                    h = Math.round((h * MAX) / w);
                    w = MAX;
                } else if (h >= w && h > MAX) {
                    w = Math.round((w * MAX) / h);
                    h = MAX;
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Foto tidak bisa diproses browser ini.'));
                            return;
                        }
                        resolve(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
                    },
                    'image/jpeg',
                    0.85
                );
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('File foto rusak / tidak bisa dibaca.'));
            };
            img.src = url;
        });

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => {
                if (k === 'rank' && !v) return;
                // FormData hanya string: boolean harus jadi 1/0 agar lolos rule `boolean` Laravel
                fd.append(k, typeof v === 'boolean' ? (v ? 1 : 0) : v);
            });
            if (file) fd.append('image', await processImage(file));
            let saved;
            if (player) {
                fd.append('_method', 'PUT'); // spoof via body (bukan query) agar file ikut terkirim
                saved = (await api.adminPlayersUpdate(player.id, fd)).data;
            } else {
                saved = (await api.adminPlayersStore(fd)).data;
            }
            if (file && !saved.image_path) {
                toast('Data tersimpan, tapi foto tidak ikut tersimpan. Coba lagi.', 'fa-triangle-exclamation');
            } else {
                toast(player ? 'Pemain diperbarui.' : 'Pemain ditambahkan.');
            }
            onSaved();
        } catch (err) {
            const errors = err?.response?.data?.errors;
            toast(errors ? Object.values(errors)[0]?.[0] : err.message || errMsg(err, 'Gagal menyimpan.'), 'fa-circle-exclamation');
        } finally {
            setBusy(false);
        }
    };

    const inputCls = 'w-full bg-midnight-950/80 text-xs text-white p-3 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400 transition';

    return (
        <Modal open onClose={onClose} maxWidth="max-w-xl">
            <h3 className="font-display text-lg font-bold ff-gradient-text mb-6">
                {player ? `Edit: ${player.name}` : 'Tambah Pemain Baru'}
            </h3>
            <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input required value={form.name} onChange={set('name')} placeholder="Nama pemain *" className={inputCls} />
                    <input required value={form.club} onChange={set('club')} placeholder="Klub *" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <select value={form.position} onChange={set('position')} className={inputCls}>
                        <option value="FW">FW (Forward)</option>
                        <option value="MF">MF (Midfielder)</option>
                        <option value="DF">DF (Defender)</option>
                        <option value="GK">GK (Goalkeeper)</option>
                    </select>
                    <input type="number" min={1} max={99} value={form.shirt_number} onChange={set('shirt_number')} placeholder="No. punggung" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            {form.country_code && (
                                <img src={flagUrl(form.country_code, 40)} alt="" className="w-6 h-[18px] rounded-[3px] object-cover shadow shrink-0" />
                            )}
                            <select value={form.country_code} onChange={pickCountry} className={`${inputCls} cursor-pointer`}>
                                <option value="">— Negara (tanpa bendera) —</option>
                                {COUNTRIES.map((c) => (
                                    <option key={c.code} value={c.code}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <input value={form.nationality} onChange={set('nationality')} placeholder="Nama negara (otomatis)" className={`${inputCls} mt-2`} />
                    </div>
                    <input type="number" min={15} max={50} value={form.age} onChange={set('age')} placeholder="Umur" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <select value={form.rank} onChange={set('rank')} className={inputCls}>
                        <option value="">Rank: Auto dari OVR</option>
                        <option value="bronze">Bronze (manual)</option>
                        <option value="silver">Silver (manual)</option>
                        <option value="gold">Gold (manual)</option>
                        <option value="diamond">Diamond (manual)</option>
                    </select>
                    <label className="flex items-center gap-2 text-xs text-midnight-300 cursor-pointer">
                        <input type="checkbox" checked={!!form.is_active_in_gacha} onChange={set('is_active_in_gacha')} className="accent-midnight-400" />
                        Aktif di pool gacha
                    </label>
                </div>
                <div>
                    <label className="block text-[10px] text-midnight-300 uppercase font-semibold mb-1">Foto (jpg/png/webp, max 5MB)</label>
                    {(file || player?.image_url) && (
                        <div className="flex items-center gap-3 mb-2">
                            <img
                                src={file ? URL.createObjectURL(file) : player.image_url}
                                alt="preview"
                                className="w-16 h-16 rounded-xl object-cover object-top border border-midnight-400/40"
                            />
                            <span className="text-[11px] text-midnight-300 truncate">
                                {file ? file.name : 'Foto saat ini tersimpan'}
                            </span>
                        </div>
                    )}
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} className="text-xs text-midnight-300" />
                    {imgError && <p className="text-[11px] text-red-400 mt-1">{imgError}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {(form.position === 'GK' ? GK_STATS : OUT_STATS).map((s) => (
                        <div key={s}>
                            <label className="flex justify-between text-xs text-midnight-300 mb-1">
                                <span>{LABELS[s]}{form.position === 'GK' && <span className="ml-1 text-[9px] text-gold-300">GK</span>}</span>
                                <span className="text-midnight-200 font-bold">{form[s]}</span>
                            </label>
                            <input type="range" min={30} max={99} value={form[s]} onChange={set(s)} className="w-full cursor-pointer" />
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-midnight-300">
                    {form.position === 'GK'
                        ? 'Kiper memakai atribut DIV/HAN/KIC/REF/SPD/POS (Diving, Handling, Kicking, Reflexes, Speed, Positioning).'
                        : 'OVR & rank dihitung otomatis server dari statistik + posisi.'}
                </p>
                <div className="flex justify-end gap-3 pt-4 border-t border-midnight-400/20">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs text-midnight-300">Batal</button>
                    <button type="submit" disabled={busy} className="gold-btn px-6 py-2.5 rounded-xl text-xs font-bold uppercase disabled:opacity-50">
                        {busy ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export { RankBadge };
