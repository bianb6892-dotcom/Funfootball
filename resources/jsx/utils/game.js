export const RANK_ICON = { bronze: 'fa-shield-halved', silver: 'fa-shield-halved', gold: 'fa-shield-halved', diamond: 'fa-gem', legend: 'fa-crown', potw: 'fa-star', flashback: 'fa-bolt', halloween: 'fa-ghost', ucl: 'fa-trophy', uel: 'fa-medal', uecl: 'fa-award' };

const DF_STYLE = 'from-emerald-900 to-midnight-800 text-emerald-200 border-emerald-400/40';
const MF_STYLE = 'from-midnight-600 to-midnight-800 text-midnight-100 border-midnight-400/40';
const FW_STYLE = 'from-rose-900 to-midnight-800 text-rose-200 border-rose-400/40';
const GK_STYLE = 'from-sky-900 to-midnight-800 text-sky-200 border-sky-400/40';

export const POS_STYLE = {
    GK: GK_STYLE,
    // DF: LB, CB, RB ( + legacy DF )
    LB: DF_STYLE, CB: DF_STYLE, RB: DF_STYLE, DF: DF_STYLE,
    // MF: LM, CM, CDM, CAM, RM ( + legacy MF )
    LM: MF_STYLE, CM: MF_STYLE, CDM: MF_STYLE, CAM: MF_STYLE, RM: MF_STYLE, MF: MF_STYLE,
    // FW: LW, ST, SS, RW ( + legacy FW )
    LW: FW_STYLE, ST: FW_STYLE, SS: FW_STYLE, RW: FW_STYLE, FW: FW_STYLE,
};

export const POS_GROUP = {
    GK: 'GK',
    LB: 'DF', CB: 'DF', RB: 'DF', DF: 'DF',
    LM: 'MF', CM: 'MF', CDM: 'MF', CAM: 'MF', RM: 'MF', MF: 'MF',
    LW: 'FW', ST: 'FW', SS: 'FW', RW: 'FW', FW: 'FW',
};

export const posGroup = (pos) => POS_GROUP[String(pos || '').toUpperCase()] || 'MF';

export const posStyle = (pos) => POS_STYLE[String(pos || '').toUpperCase()] || MF_STYLE;

// Kartu efektif: 'flashback' bila flag Flashback (prioritas tertinggi),
// lalu 'halloween', 'ucl' > 'uel' > 'uecl', lalu 'potw', selain itu rank reguler
// (mirror Player::card). 'uefa' adalah grup (ucl/uel/uecl), bukan kartu.
// BASIC adalah kelompok (diamond/gold/silver/bronze), bukan kartu baru.
export const cardOf = (player) =>
    player?.is_flashback ? 'flashback'
    : (player?.is_halloween ? 'halloween'
    : (player?.is_ucl ? 'ucl'
    : (player?.is_uel ? 'uel'
    : (player?.is_uecl ? 'uecl'
    : player?.is_potw ? 'potw' : (player?.card || player?.rank || 'bronze')))));

// Identitas pemain lintas kartu: satu pemain = satu nama. Varian kartu berbeda
// (mis. base vs POTW/UCL) tetap dianggap pemain yang sama, jadi tidak boleh
// dipakai dua kali dalam satu line-up. Mirror validasi backend.
export const playerKey = (player) => String(player?.name || '').trim().toLowerCase();

export const cardLabel = (player) => {
    const c = cardOf(player);
    if (c === 'potw') return '★ POTW';
    if (c === 'flashback') return 'Flashback';
    if (c === 'halloween') return 'Halloween';
    if (c === 'ucl') return 'UCL';
    if (c === 'uel') return 'UEL';
    if (c === 'uecl') return 'UECL';
    return player?.rank || 'bronze';
};

// True bila kartu bagian dari keluarga UEFA (UCL/UEL/UECL).
export const isUefaCard = (player) => {
    const c = cardOf(player);
    return c === 'ucl' || c === 'uel' || c === 'uecl';
};

// Kompatibilitas posisi (mirror GameService::slotCompatibility):
// exact 0, shift selini beda detail (-2 kaki sesuai / -3 bila tidak),
// adjacent -3, far -10. Posisi detail dipetakan ke grup lini dulu.
export const compatOf = (playerPos, slotPos) => {
    const a = String(playerPos || '').toUpperCase();
    const b = String(slotPos || '').toUpperCase();
    if (a === b) return 'exact';
    const ga = posGroup(a);
    const gb = posGroup(b);
    if (ga === gb) return 'shift';
    if ((ga === 'DF' && gb === 'MF') || (ga === 'MF' && (gb === 'DF' || gb === 'FW')) || (ga === 'FW' && gb === 'MF')) return 'adjacent';
    return 'far';
};

// Posisi alternatif (secondary): mis. Mbappe utama ST + alt LW.
// Dipasang di posisi natural mana pun = exact (OVR utuh, tanpa penalti).
export const MAX_ALT_POSITIONS = 3;

export const altPositionsOf = (player) => {
    const raw = player?.alt_positions ?? player?.altPositions ?? [];
    const arr = Array.isArray(raw)
        ? raw
        : String(raw || '').split(/[\s,;|]+/).filter(Boolean);
    const main = String(player?.position || '').toUpperCase();
    const out = [];
    arr.forEach((item) => {
        const p = String(item || '').toUpperCase().trim();
        if (!p || p === main || out.includes(p)) return;
        out.push(p);
    });
    return out.slice(0, MAX_ALT_POSITIONS);
};

export const naturalPositionsOf = (player) => {
    const main = String(player?.position || '').toUpperCase();
    if (!main) return altPositionsOf(player);
    return [...new Set([main, ...altPositionsOf(player)])];
};

// True bila slot adalah posisi natural (utama ATAU alternatif).
export const isNaturalFit = (playerOrPos, slotIdOrPos) => {
    const slotKey = slotBaseKey(slotIdOrPos);
    if (playerOrPos && typeof playerOrPos === 'object') {
        return naturalPositionsOf(playerOrPos).includes(slotKey);
    }
    return String(playerOrPos || '').toUpperCase() === slotKey;
};

// Kompat final dengan mempertimbangkan ID slot: detail sama dengan slotnya
// (mis. LB di slot LB yang posisinya grup DF) = exact, kaki diabaikan.
// Menerima string posisi ATAU objek pemain (agar alt_positions ikut dihitung).
export const compatOfSlot = (playerOrPos, slotPos, slotId) => {
    const key = slotBaseKey(slotId || slotPos);
    if (playerOrPos && typeof playerOrPos === 'object') {
        if (isNaturalFit(playerOrPos, slotId || slotPos)) return 'exact';
        const c = compatOf(playerOrPos?.position, slotPos);
        if (c === 'shift' && String(playerOrPos?.position || '').toUpperCase() === key) return 'exact';
        return c;
    }
    const c = compatOf(playerOrPos, slotPos);
    if (c === 'shift' && String(playerOrPos || '').toUpperCase() === key) return 'exact';
    return c;
};

export const PENALTY_VAL = { exact: 0, adjacent: -3, far: -10 };

// Jembatan CAM ↔ SS dua arah: hanya -2 total, kaki diabaikan.
export const BRIDGE_PENALTY_CAM_SS = -2;

export const isCamSsBridge = (playerOrPos, slotIdOrPos) => {
    const s = slotBaseKey(slotIdOrPos);
    const positions = playerOrPos && typeof playerOrPos === 'object'
        ? naturalPositionsOf(playerOrPos)
        : [String(playerOrPos || '').toUpperCase().trim()];
    return positions.some((p) => {
        if (p === s) return false;
        return (p === 'CAM' && s === 'SS') || (p === 'SS' && s === 'CAM');
    });
};

export const FOOT_PENALTY_VAL = { exact: 0, mismatch: -2 };

// Sisi slot: L / C / R. Tengah (ST, CB, CM, GK, bench, grup DF/MF/FW) netral.
export const SLOT_SIDES = {
    LB: 'L', LM: 'L', LW: 'L', LWB: 'L', LAM: 'L',
    RB: 'R', RM: 'R', RW: 'R', RWB: 'R', RAM: 'R',
};

// Kaki ideal tiap sisi: bek sayap lurus (LB=kiri, RB=kanan),
// gelandang/sayap serang inverted (LM/LW=kaki kanan, RM/RW=kaki kiri).
export const FOOT_PREFERENCE = {
    LB: 'left', LWB: 'left',
    RB: 'right', RWB: 'right',
    LM: 'right', LW: 'right', LAM: 'right',
    RM: 'left', RW: 'left', RAM: 'left',
};

export const normalizeFoot = (player) => {
    const f = String(player?.preferred_foot || 'right').toLowerCase();
    return f === 'left' || f === 'both' ? f : 'right';
};

export const footLabel = (foot) =>
    String(foot || '').toLowerCase() === 'left' ? 'Kiri'
    : String(foot || '').toLowerCase() === 'both' ? 'Dua kaki' : 'Kanan';

export const slotBaseKey = (slotIdOrPos) => {
    const s = String(slotIdOrPos || '').toUpperCase().trim();
    if (s.startsWith('BENCH')) return 'BENCH';
    const m = s.match(/^(GK|LWB|RWB|LAM|RAM|LB|CB|RB|LM|CDM|CAM|CM|RM|LW|ST|SS|RW|DF|MF|FW)(?=\d|\b)/);
    return m ? m[1] : s;
};

export const slotSide = (slotIdOrPos) => SLOT_SIDES[slotBaseKey(slotIdOrPos)] || 'C';

// Kecocokan kaki utama vs slot (mirror GameService::footCompatibility,
// info murni kaki-vs-slot): tengah/GK/bench/grup lini selalu exact
// (mengikuti kaki utama), dua kaki selalu exact, sayap bisa mismatch.
// Penalti -2 dari mismatch hanya diberlakukan bila posisi juga tidak exact.
export const footCompatOf = (player, slotIdOrPos) => {
    const key = slotBaseKey(slotIdOrPos);
    const side = slotSide(slotIdOrPos);
    const wanted = FOOT_PREFERENCE[key] || null;
    if (!wanted) return { compat: 'exact', side, wanted: null };
    if (posGroup(player?.position) === 'GK') return { compat: 'exact', side, wanted };
    const foot = normalizeFoot(player);
    if (foot === 'both') return { compat: 'exact', side, wanted };
    return { compat: foot === wanted ? 'exact' : 'mismatch', side, wanted };
};

// OVR yang disesuaikan slot (mirror GameService::adjustedOvr) agar penalty
// langsung terlihat setiap pemain ditempatkan, tanpa menunggu Simpan.
// Posisi natural (utama ATAU alternatif, mis. ST+alt LW di slot LW) = 0, kaki diabaikan.
// Selini beda detail (LM→CM, ST→LW, RB→LB) = -2 bila kaki sesuai preferensi
// slot (dua kaki dihitung sesuai), -3 bila tidak; slot netral = -3.
// Pengecualian CAM↔SS dua arah = -2 total.
// Beda lini lain = -3 dekat / -10 jauh (+ -2 bila kaki juga tak cocok).
export const adjustedFor = (player, slotPos, slotId) => {
    const compat = compatOfSlot(player, slotPos, slotId);
    const foot = footCompatOf(player, slotId || slotPos);
    const isNatural = isNaturalFit(player, slotId || slotPos);
    const naturalPositions = player && typeof player === 'object' ? naturalPositionsOf(player) : [];
    let posPenalty, footPenalty;
    if (compat === 'exact') {
        posPenalty = 0; footPenalty = 0;
    } else if (isCamSsBridge(player, slotId || slotPos)) {
        // Pengecualian: CAM→SS maupun SS→CAM hanya -2 total, kaki diabaikan.
        posPenalty = BRIDGE_PENALTY_CAM_SS; footPenalty = 0;
    } else if (compat === 'shift') {
        const wanted = FOOT_PREFERENCE[slotBaseKey(slotId || slotPos)] || null;
        posPenalty = (wanted !== null && foot.compat === 'exact') ? -2 : -3;
        footPenalty = 0;
    } else {
        posPenalty = PENALTY_VAL[compat];
        footPenalty = FOOT_PENALTY_VAL[foot.compat] ?? 0;
    }
    const penalty = posPenalty + footPenalty;
    return {
        adjusted_ovr: (player?.ovr ?? 0) + penalty,
        penalty, compat, pos_penalty: posPenalty,
        foot_penalty: footPenalty, foot_compat: foot.compat, slot_side: foot.side,
        is_natural: isNatural, natural_positions: naturalPositions,
    };
};

// Chemistry antar pemain (mirror GameService::chemistry):
// tiap pasangan satu klub +1, satu negara +2; bonus OVR maks +5.
export const CHEMISTRY_CLUB_POINTS = 1;
export const CHEMISTRY_NATION_POINTS = 2;
export const CHEMISTRY_OVR_DIVISOR = 10;
export const CHEMISTRY_MAX_BONUS = 5;

const sameClub = (a, b) => {
    const x = String(a?.club || '').trim().toLowerCase();
    const y = String(b?.club || '').trim().toLowerCase();
    return x !== '' && x === y;
};

const sameNation = (a, b) => {
    const codeA = String(a?.country_code || '').trim().toLowerCase();
    const codeB = String(b?.country_code || '').trim().toLowerCase();
    if (codeA !== '' && codeA === codeB) return true;
    const natA = String(a?.nationality || '').trim().toLowerCase();
    const natB = String(b?.nationality || '').trim().toLowerCase();
    return natA !== '' && natA === natB;
};

export const chemistryOf = (players) => {
    const list = (players || []).filter(Boolean);
    const n = list.length;
    const perPlayer = Array(n).fill(0);
    let clubLinks = 0;
    let nationLinks = 0;
    let points = 0;

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            let pair = 0;
            if (sameClub(list[i], list[j])) { pair += CHEMISTRY_CLUB_POINTS; clubLinks++; }
            if (sameNation(list[i], list[j])) { pair += CHEMISTRY_NATION_POINTS; nationLinks++; }
            if (pair > 0) {
                points += pair;
                perPlayer[i] += pair;
                perPlayer[j] += pair;
            }
        }
    }

    const possible = ((n * (n - 1)) / 2) * (CHEMISTRY_CLUB_POINTS + CHEMISTRY_NATION_POINTS);
    return {
        points,
        possible,
        club_links: clubLinks,
        nation_links: nationLinks,
        average: n > 0 ? Math.round((points / n) * 10) / 10 : 0,
        bonus: n > 0 ? Math.min(CHEMISTRY_MAX_BONUS, Math.floor(points / CHEMISTRY_OVR_DIVISOR)) : 0,
        per_player: perPlayer,
    };
};

export const teamStrengthOf = (adjustedOvrs, players) => {
    const avgs = (adjustedOvrs || []).filter((v) => Number.isFinite(Number(v))).map(Number);
    const base = avgs.length ? Math.round(avgs.reduce((x, y) => x + y, 0) / avgs.length) : 0;
    const chemistry = chemistryOf(players);
    return { base, bonus: chemistry.bonus, ovr: Math.min(99, base + chemistry.bonus), chemistry };
};

// Ringkasan header (mirror present(): team OVR = rata-rata adjusted + chemistry).
export const summarizeLineup = (starters) => {
    const list = (starters || []).filter((s) => s?.player?.id);
    const adj = list.map((s) => adjustedFor(s.player, s.slot_position, s.slot_id));
    const ovrs = adj.map((a) => a.adjusted_ovr);
    const strength = teamStrengthOf(ovrs, list.map((s) => s.player));
    return {
        team_ovr: strength.ovr,
        base_team_ovr: strength.base,
        chemistry: strength.chemistry.points,
        chemistry_possible: strength.chemistry.possible,
        chemistry_bonus: strength.bonus,
        chemistry_links: { club: strength.chemistry.club_links, nation: strength.chemistry.nation_links },
        filled: ovrs.length,
        penalty_total: adj.reduce((t, a) => t + Math.abs(a.penalty), 0),
    };
};

export const imgSrc = (player) =>
    player?.image_url || (player?.image_path ? `/storage/${player.image_path}` : null);

export const errMsg = (err, fallback = 'Terjadi kesalahan.') =>
    err?.response?.data?.message || err?.response?.data?.error || fallback;

export const timeID = (iso) =>
    new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
