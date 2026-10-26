const GOAL_TYPE = { open: null, solo: 'Solo run', freekick: 'Tendangan bebas', penalty: 'Penalti' };

function GoalRow({ g }) {
    return (
        <div className="flex items-start gap-2 py-1">
            <span className="min-w-[34px] text-center text-[10px] font-black text-white bg-emerald-500/25 border border-emerald-500/50 rounded-md px-1 py-0.5 shrink-0">
                {g.minute}&prime;
            </span>
            <i className="fa-solid fa-futbol text-emerald-300 text-xs mt-0.5 shrink-0"></i>
            <p className="text-xs text-white min-w-0">
                <span className="font-bold">{g.player}</span>
                {g.assist ? (
                    <span className="text-midnight-300"> <span className="text-[10px]">(ast. {g.assist})</span></span>
                ) : GOAL_TYPE[g.type] ? (
                    <span className="text-midnight-300"> <span className="text-[10px]">· {GOAL_TYPE[g.type]}</span></span>
                ) : null}
            </p>
        </div>
    );
}

function CardRow({ c, red }) {
    return (
        <div className="flex items-start gap-2 py-1">
            <span className="min-w-[34px] text-center text-[10px] font-black text-white bg-midnight-800 border border-midnight-700 rounded-md px-1 py-0.5 shrink-0">
                {c.minute}&prime;
            </span>
            <span
                title={red ? (c.type === 'second_yellow' ? 'Kartu kuning kedua' : 'Kartu merah langsung') : 'Kartu kuning'}
                className={`w-3 h-4 rounded-[3px] mt-0.5 shrink-0 border ${red ? 'bg-red-600 border-red-400' : 'bg-yellow-400 border-yellow-200'}`}
            ></span>
            <p className="text-xs text-white min-w-0">
                <span className="font-bold">{c.player}</span>
                {red && <span className="text-midnight-300"> <span className="text-[10px]">· {c.type === 'second_yellow' ? 'kuning kedua' : 'merah langsung'}</span></span>}
            </p>
        </div>
    );
}

const STAT_ROWS = [
    ['possession', 'Penguasaan bola', '%'],
    ['shots', 'Total tendangan', ''],
    ['shots_on_target', 'Tendangan ke gawang', ''],
    ['touches_in_box', 'Sentuhan di kotak lawan', ''],
    ['big_chances', 'Kesempatan besar', ''],
    ['accurate_passes', 'Umpan akurat', ''],
    ['fouls', 'Pelanggaran', ''],
    ['corners', 'Sepak pojok', ''],
    ['offsides', 'Offside', ''],
];

function MatchStats({ stats, home, away }) {
    if (!stats?.a || !stats?.b) return null;

    return (
        <div className="rounded-2xl bg-midnight-950/60 border border-midnight-700/50 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-midnight-300 mb-2">
                <i className="fa-solid fa-chart-simple mr-1"></i>Statistik Pertandingan
            </p>
            <div className="flex items-center justify-between gap-2 mb-2 text-[10px] font-bold text-white">
                <span className="truncate">{home}</span>
                <span className="text-midnight-300 shrink-0">VS</span>
                <span className="truncate text-right">{away}</span>
            </div>
            <div className="space-y-2">
                {STAT_ROWS.map(([key, label, suffix]) => {
                    const va = Number(stats.a[key]) || 0;
                    const vb = Number(stats.b[key]) || 0;
                    const total = va + vb || 1;
                    const passInfo = key === 'accurate_passes'
                        ? { a: stats.a.pass_accuracy, b: stats.b.pass_accuracy }
                        : null;
                    return (
                        <div key={key}>
                            <div className="flex items-center gap-2 text-[11px]">
                                <span className="w-12 shrink-0 text-left font-black text-white tabular-nums" title={passInfo ? `Akurasi umpan ${passInfo.a}%` : undefined}>
                                    {va}{suffix}
                                </span>
                                <span className="flex-1 text-center text-[9px] font-semibold uppercase tracking-wide text-midnight-300">{label}</span>
                                <span className="w-12 shrink-0 text-right font-black text-white tabular-nums" title={passInfo ? `Akurasi umpan ${passInfo.b}%` : undefined}>
                                    {vb}{suffix}
                                </span>
                            </div>
                            <div className="flex h-1.5 mt-1 rounded-full overflow-hidden bg-midnight-800">
                                <div className="h-full bg-cyan-400/80 transition-all" style={{ width: `${(va / total) * 100}%` }}></div>
                                <div className="h-full bg-gold-400/80 transition-all" style={{ width: `${(vb / total) * 100}%` }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function TeamEvents({ title, ev }) {
    const empty = (ev.goals || []).length === 0 && (ev.yellows || []).length === 0 && (ev.reds || []).length === 0;
    return (
        <div className="flex-1 min-w-[220px] rounded-2xl bg-midnight-950/60 border border-midnight-700/50 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-midnight-300 mb-1 truncate">{title}</p>
            {empty && <p className="text-[11px] text-midnight-300 py-1">Tanpa kejadian.</p>}
            {(ev.goals || []).map((g, i) => <GoalRow key={`g${i}`} g={g} />)}
            {(ev.yellows || []).map((c, i) => <CardRow key={`y${i}`} c={c} />)}
            {(ev.reds || []).map((c, i) => <CardRow key={`r${i}`} c={c} red />)}
        </div>
    );
}

/**
 * Rincian pertandingan: pencetak gol + assist/tipe gol, kartu, rating & MOTM.
 * Aman untuk snapshot lama (tanpa details → tidak render apa-apa).
 */
export function MatchEvents({ details, home = 'Tim A', away = 'Tim B' }) {
    if (!details || !details.events) return null;
    const { events, stats, ratings, motm } = details;
    const top = [...(ratings?.a || []).map((r) => ({ ...r, team: home })), ...(ratings?.b || []).map((r) => ({ ...r, team: away }))]
        .sort((x, y) => y.rating - x.rating)
        .slice(0, 5);
    return (
        <div className="space-y-3">
            {motm && motm.player && motm.player !== '—' && (
                <div className="rounded-2xl border border-gold-500/40 bg-gold-500/10 p-3 flex items-center gap-3">
                    <i className="fa-solid fa-star text-gold-300 text-xl shrink-0"></i>
                    <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gold-300">Pemain Terbaik (MOTM)</p>
                        <p className="text-sm font-bold text-white truncate">{motm.player} <span className="text-gold-300 font-black">{Number(motm.rating).toFixed(1)}</span></p>
                    </div>
                </div>
            )}
            <MatchStats stats={stats} home={home} away={away} />
            <div className="flex gap-3 flex-wrap">
                <TeamEvents title={home} ev={events.a || { goals: [], yellows: [], reds: [] }} />
                <TeamEvents title={away} ev={events.b || { goals: [], yellows: [], reds: [] }} />
            </div>
            {top.length > 0 && (
                <div className="rounded-2xl bg-midnight-950/60 border border-midnight-700/50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-midnight-300 mb-2">
                        <i className="fa-solid fa-ranking-star mr-1"></i>Rating Tertinggi
                    </p>
                    <div className="space-y-1">
                        {top.map((r, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                                <span className="text-midnight-300 font-black w-4 shrink-0">{i + 1}</span>
                                <span className="flex-1 min-w-0 text-white font-semibold truncate">{r.player}</span>
                                <span className="text-[10px] text-midnight-300 truncate max-w-[90px]">{r.team}</span>
                                {(r.goals > 0 || r.assists > 0) && (
                                    <span className="text-[10px] text-midnight-300 shrink-0">{r.goals}G {r.assists}A</span>
                                )}
                                <span className="font-display font-black text-gold-300 shrink-0">{Number(r.rating).toFixed(1)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
