export const RANK_ICON = { bronze: 'fa-shield-halved', silver: 'fa-shield-halved', gold: 'fa-shield-halved', diamond: 'fa-gem' };

export const POS_STYLE = {
    FW: 'from-rose-900 to-midnight-800 text-rose-200 border-rose-400/40',
    MF: 'from-midnight-600 to-midnight-800 text-midnight-100 border-midnight-400/40',
    DF: 'from-emerald-900 to-midnight-800 text-emerald-200 border-emerald-400/40',
    GK: 'from-sky-900 to-midnight-800 text-sky-200 border-sky-400/40',
};

export const imgSrc = (player) =>
    player?.image_url || (player?.image_path ? `/storage/${player.image_path}` : null);

export const errMsg = (err, fallback = 'Terjadi kesalahan.') =>
    err?.response?.data?.message || err?.response?.data?.error || fallback;

export const timeID = (iso) =>
    new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
