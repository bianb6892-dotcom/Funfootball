import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Modal, RankBadge, OvrBadge, PlayerAvatar, StatRow, CountryFlag, FootBadge } from './common';
import { POS_STYLE, RANK_ICON, altPositionsOf, cardOf, naturalPositionsOf } from '../utils/game';
import { codeFor } from '../utils/countries';
import { DETAIL_GROUPS, GK_DETAIL_GROUP, detailedStatsOf } from '../utils/playerAttributes';

const WEIGHTS = {
    GK: { div: 0.2, han: 0.2, kic: 0.1, ref: 0.25, spd: 0.05, pos: 0.2 },
    DF: { pac: 0.15, sho: 0.05, pas: 0.1, dri: 0.1, def: 0.35, phy: 0.25 },
    MF: { pac: 0.15, sho: 0.15, pas: 0.3, dri: 0.2, def: 0.1, phy: 0.1 },
    FW: { pac: 0.25, sho: 0.3, pas: 0.1, dri: 0.25, def: 0.0, phy: 0.1 },
};

const STAT_LABELS = {
    pac: 'Pace', sho: 'Shooting', pas: 'Passing', dri: 'Dribbling', def: 'Defending', phy: 'Physical',
    div: 'Diving', han: 'Handling', kic: 'Kicking', ref: 'Reflexes', spd: 'Speed', pos: 'Positioning',
};

const POS_GROUP = {
    GK: 'GK',
    LB: 'DF', CB: 'DF', RB: 'DF', DF: 'DF',
    LM: 'MF', CM: 'MF', CDM: 'MF', CAM: 'MF', RM: 'MF', MF: 'MF',
    LW: 'FW', ST: 'FW', SS: 'FW', RW: 'FW', FW: 'FW',
};
const baseGroup = (pos) => POS_GROUP[String(pos || '').toUpperCase()] || 'MF';

function DetailStatRow({ label, value }) {
    return (
        <div className="flex items-center gap-2 text-[11px]">
            <span className="flex-1 truncate text-midnight-300">{label}</span>
            <span className="w-6 text-right font-bold text-midnight-100">{value}</span>
            <div className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-midnight-800">
                <div className="h-full rounded-full bg-gradient-to-r from-midnight-600 to-midnight-300" style={{ width: `${value}%` }}></div>
            </div>
        </div>
    );
}

export function PlayerDetail({ player, onClose, onCompare }) {
    if (!player) return null;
    const group = baseGroup(player.position);
    const alts = altPositionsOf(player);
    const naturals = naturalPositionsOf(player);
    const w = WEIGHTS[group] || WEIGHTS.MF;
    const keys = group === 'GK'
        ? ['div', 'han', 'kic', 'ref', 'spd', 'pos']
        : ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];
    const stats = keys.map((key) => [STAT_LABELS[key], player[key], w[key]]);
    const detailed = detailedStatsOf(player);
    const detailGroups = group === 'GK' ? [GK_DETAIL_GROUP, ...DETAIL_GROUPS] : DETAIL_GROUPS;

    return (
        <Modal open={!!player} onClose={onClose} maxWidth="max-w-3xl">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                <div className="w-40 h-48 rounded-2xl overflow-hidden bg-midnight-950 border border-midnight-400/35 shrink-0 shadow-lg relative">
                    <PlayerAvatar player={player} />
                    <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-md bg-midnight-950/85 text-midnight-200 font-display font-bold text-xs border border-midnight-400/35">
                        #{player.shirt_number}
                    </div>
                    <div className="absolute bottom-2 left-2">
                        <RankBadge rank={cardOf(player)} />
                    </div>
                </div>
                <div className="flex-1 text-center md:text-left space-y-2 min-w-0">
                    <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                        <span className={`px-3 py-1 rounded-lg bg-gradient-to-r ${POS_STYLE[player.position] || POS_STYLE.MF} border font-bold text-xs uppercase tracking-wider`}>
                            {player.position}
                        </span>
                        {alts.map((alt) => (
                            <span
                                key={alt}
                                title={`Posisi alternatif ${alt} — dipasang di ${alt} OVR tidak turun`}
                                className={`px-2.5 py-1 rounded-lg bg-gradient-to-r ${POS_STYLE[alt] || POS_STYLE.MF} border border-dashed font-bold text-[11px] uppercase tracking-wider opacity-90`}
                            >
                                <i className="fa-solid fa-shuffle mr-1 text-[9px]"></i>{alt}
                            </span>
                        ))}
                        <span className="text-xs text-midnight-300 font-medium flex items-center gap-1.5">
                            <CountryFlag code={codeFor(player)} />
                            {player.nationality}
                        </span>
                    </div>
                    <h2 className="font-display text-3xl font-bold text-white">{player.name}</h2>
                    <p className="text-sm text-midnight-300 font-medium flex items-center justify-center md:justify-start gap-2 flex-wrap">
                        <span>{player.club} &bull; {player.age} Tahun</span>
                        <FootBadge foot={player?.preferred_foot} />
                    </p>
                    {alts.length > 0 && (
                        <p className="text-[11px] text-emerald-300/90 font-medium flex items-center justify-center md:justify-start gap-1.5">
                            <i className="fa-solid fa-circle-check text-[11px]"></i>
                            Natural di {naturals.join(' · ')} — OVR utuh tanpa penalti posisi
                        </p>
                    )}
                    <div className="pt-3 flex items-center justify-center md:justify-start gap-4">
                        <div className="ovr-badge px-5 py-2 rounded-xl text-center">
                            <span className="text-[10px] uppercase block tracking-wider opacity-80">Overall</span>
                            <span className="font-display font-extrabold text-2xl">{player.ovr}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="pt-4 mt-6 border-t border-midnight-400/20">
                <h4 className="font-display text-base font-bold text-midnight-200 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-chart-simple text-sm"></i> RINGKASAN ATRIBUT
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {stats.map(([label, value, weight]) => (
                        <StatRow key={label} label={label} value={value} weight={weight} />
                    ))}
                </div>
            </div>
            <div className="pt-4 mt-4 border-t border-midnight-400/20">
                <h4 className="font-display text-base font-bold text-midnight-200 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-list-check text-sm"></i> ATRIBUT DETAIL
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {detailGroups.map((grp) => (
                        <div key={grp.key} className="rounded-xl border border-midnight-700/70 bg-midnight-950/50 p-3">
                            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-midnight-200">
                                <i className={`fa-solid ${grp.icon} text-midnight-400`}></i>{grp.label}
                            </div>
                            <div className="space-y-1.5">
                                {grp.fields.map(([key, label]) => (
                                    <DetailStatRow key={key} label={label} value={detailed[key]} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="pt-4 mt-4 flex justify-end gap-3 border-t border-midnight-400/20 flex-wrap">
                {onCompare && (
                    <button onClick={() => onCompare(player)} className="ff-outline-btn px-4 py-2 rounded-xl text-xs font-semibold">
                        <i className="fa-solid fa-code-compare mr-1"></i> Komparasi
                    </button>
                )}
                <button onClick={onClose} className="gold-btn px-5 py-2 rounded-xl text-xs font-bold uppercase">
                    Tutup
                </button>
            </div>
        </Modal>
    );
}

export function CompareModal({ open, onClose, initialId, allPlayers }) {
    const [id1, setId1] = useState(initialId || '');
    const [id2, setId2] = useState('');
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setId1(initialId || allPlayers?.[0]?.id || '');
            const other = allPlayers?.find((p) => String(p.id) !== String(initialId));
            setId2(other?.id || allPlayers?.[1]?.id || '');
            setResult(null);
        }
    }, [open, initialId, allPlayers]);

    useEffect(() => {
        if (!open || !id1 || !id2 || id1 === id2) {
            setResult(null);
            return;
        }
        setBusy(true);
        api.compare([id1, id2])
            .then(({ data }) => setResult(data))
            .finally(() => setBusy(false));
    }, [open, id1, id2]);

    const selCls =
        'w-full bg-midnight-950 text-xs text-white p-3 rounded-xl border border-midnight-700 cursor-pointer';

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-4xl">
            <div className="text-center mb-6">
                <i className="fa-solid fa-code-compare text-midnight-300 text-xl mb-2"></i>
                <h3 className="font-display text-2xl font-black ff-gradient-text">KOMPARASI PEMAIN</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <select value={id1} onChange={(e) => setId1(e.target.value)} className={selCls}>
                    {allPlayers?.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name} ({p.position})
                        </option>
                    ))}
                </select>
                <select value={id2} onChange={(e) => setId2(e.target.value)} className={selCls}>
                    {allPlayers?.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name} ({p.position})
                        </option>
                    ))}
                </select>
            </div>
            {busy && <p className="text-center text-xs text-midnight-300">Membandingkan...</p>}
            {result && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-midnight-400/20 text-center">
                        {result.players.map((p) => (
                            <div key={p.id} className="bg-midnight-950/80 p-4 rounded-2xl border border-midnight-700">
                                <h4 className="font-display font-bold text-white">{p.name}</h4>
                                <p className="text-xs text-midnight-300 font-semibold flex items-center justify-center gap-1.5 flex-wrap">
                                    <span>{p.club} &middot; {p.position}</span>
                                    <FootBadge foot={p?.preferred_foot} size="xs" />
                                </p>
                                <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                                    <RankBadge rank={cardOf(p)} />
                                    <OvrBadge ovr={p.ovr} />
                                </div>
                            </div>
                        ))}
                    </div>
                    {result.mixed && (
                        <p className="text-center text-[11px] text-gold-300">
                            <i className="fa-solid fa-circle-info mr-1"></i>
                            Posisi berbeda (kiper vs non-kiper) — atribut ditampilkan berdampingan, bukan head-to-head.
                        </p>
                    )}
                    <div className="space-y-3">
                        {result.rows.map((r) => (
                            <div key={r.label} className="bg-midnight-950/60 p-3 rounded-xl border border-midnight-700/70">
                                <p className="text-center text-xs text-midnight-300 uppercase font-semibold mb-2">{r.label}</p>
                                <div className="flex items-center gap-3 text-xs">
                                    <span className={`w-10 text-right font-bold ${r.winner > 0 ? 'text-emerald-300' : 'text-midnight-300'}`}>{r.a ?? '—'}</span>
                                    <div className="flex-1 bg-midnight-800 h-2 rounded-full overflow-hidden">
                                        <div className="bg-gradient-to-r from-midnight-600 to-midnight-300 h-full" style={{ width: `${r.a ?? 0}%` }}></div>
                                    </div>
                                    <div className="flex-1 bg-midnight-800 h-2 rounded-full overflow-hidden flex justify-end">
                                        <div className="bg-gradient-to-l from-midnight-600 to-midnight-300 h-full" style={{ width: `${r.b ?? 0}%` }}></div>
                                    </div>
                                    <span className={`w-10 font-bold ${r.winner < 0 ? 'text-emerald-300' : 'text-midnight-300'}`}>{r.b ?? '—'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 rounded-2xl bg-midnight-900 border border-midnight-400/35 text-center">
                        <p className="text-sm text-midnight-100">
                            {result.ovr.winner > 0
                                ? `${result.players[0].name} unggul ${result.ovr.a} vs ${result.ovr.b}`
                                : result.ovr.winner < 0
                                  ? `${result.players[1].name} unggul ${result.ovr.b} vs ${result.ovr.a}`
                                  : `OVR sama (${result.ovr.a})`}
                        </p>
                    </div>
                </div>
            )}
        </Modal>
    );
}

export { RANK_ICON };
