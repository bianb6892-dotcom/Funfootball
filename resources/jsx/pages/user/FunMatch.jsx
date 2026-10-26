import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { MatchTheater } from '../../components/MatchTheater';
import { MatchEvents } from '../../components/MatchEvents';
import { EmptyState } from '../../components/common';
import { RANK_ICON, cardLabel, cardOf, errMsg, imgSrc } from '../../utils/game';

const DIFF_STYLE = {
    mudah: 'from-emerald-600 to-emerald-400 text-white',
    sedang: 'from-midnight-600 to-midnight-400 text-white',
    sulit: 'from-orange-600 to-amber-500 text-white',
    legenda: 'from-[#8a6414] to-[#f0cd56] text-[#3a2800]',
};

export function FunMatch() {
    const { user } = useAuth();
    const toast = useToast();
    const [categories, setCategories] = useState([]);
    const [uncategorized, setUncategorized] = useState([]);
    const [myLineup, setMyLineup] = useState(null);
    const [difficulties, setDifficulties] = useState({});
    const [formations, setFormations] = useState({});
    const [difficulty, setDifficulty] = useState('sedang');
    const [categoryId, setCategoryId] = useState(null);
    const [mode, setMode] = useState('league');
    const [leagueId, setLeagueId] = useState(null);
    const [expanded, setExpanded] = useState(null);
    const [theater, setTheater] = useState(null);
    const [result, setResult] = useState(null);

    useEffect(() => {
        api.lineup().then(({ data }) => setMyLineup(data)).catch(() => {});
        api.funTeams()
            .then(({ data }) => {
                const list = data.categories || [];
                setCategories(list);
                setUncategorized(data.uncategorized || []);
                setDifficulties(data.difficulties || {});
                setFormations(data.formations || {});
                if (!data.difficulties?.[difficulty]) {
                    const first = Object.keys(data.difficulties || {})[0];
                    if (first) setDifficulty(first);
                }
            })
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedCategory = categories.find((c) => c.id === categoryId) || null;
    const leagues = selectedCategory?.leagues || [];
    const selectedLeague = leagues.find((l) => l.id === leagueId) || null;
    const nationalTeams = selectedCategory?.national_teams || [];

    const cpuOvrOf = (team) => {
        const mod = difficulties[difficulty]?.modifier ?? 0;
        return Math.max(40, Math.min(99, (team.team_ovr ?? 0) + mod));
    };

    const pickCategory = (category) => {
        setCategoryId(category.id);
        setExpanded(null);
        setLeagueId(null);
        const hasLeagues = (category.leagues || []).length > 0;
        const hasNational = (category.national_teams || []).length > 0;
        setMode(! hasLeagues && hasNational ? 'national' : 'league');
    };

    const pickMode = (nextMode) => {
        setMode(nextMode);
        setLeagueId(null);
        setExpanded(null);
    };

    const openTheater = (team) => {
        setResult(null);
        setTheater(team);
    };

    const startTheater = async () => {
        const { data } = await api.funTeamPlay(theater.id, difficulty);
        return data;
    };

    const finishTheater = (res) => {
        setTheater(null);
        if (res) setResult(res);
    };

    const verdict = (m) => {
        if (m.result === 'draw') return { text: 'DRAW', cls: 'text-midnight-200' };
        return m.result === 'challenger_win'
            ? { text: 'WIN', cls: 'text-emerald-300' }
            : { text: 'LOSS', cls: 'text-red-400' };
    };

    const resAway = result?.snapshot?.fun_team?.name || 'Tim CPU';

    const teamsToShow = mode === 'national'
        ? nationalTeams
        : (selectedLeague?.teams || []);

    const renderTeamList = (list) => (
        <div className="space-y-2">
            {list.map((t) => (
                <div key={t.id} className="p-3 rounded-xl bg-midnight-950/60 border border-midnight-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#101d68] to-[#060b30] border border-cyan-300/50 flex items-center justify-center text-cyan-200 font-display font-black text-xs shrink-0">
                            {t.short_name || t.name.slice(0, 3).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{t.name}</p>
                            <p className="text-[10px] text-midnight-300">
                                {t.formation} &middot; Chemistry <span className="text-emerald-300 font-bold">{t.chemistry ?? 0}</span>
                                (+{t.chemistry_bonus ?? 0} OVR) &middot; Base OVR {t.base_team_ovr ?? t.team_ovr}
                                &rarr; <span className="text-cyan-200 font-bold">CPU {cpuOvrOf(t)}</span> ({difficulties[difficulty]?.label})
                                &middot; {t.filled}/11 terisi
                            </p>
                        </div>
                        <button
                            onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                            className="ff-outline-btn px-3 py-2 rounded-xl text-[10px] font-bold uppercase"
                            title="Tampilkan line-up XI tim di lapangan"
                        >
                            <i className={`fa-solid ${expanded === t.id ? 'fa-chevron-up' : 'fa-chess-board'} mr-1`}></i>
                            {expanded === t.id ? 'Tutup' : 'Line-Up'}
                        </button>
                        <button
                            onClick={() => openTheater(t)}
                            disabled={t.filled < 11 || (myLineup && myLineup.filled < 11)}
                            className="gold-btn px-4 py-2 rounded-xl text-[10px] font-bold uppercase disabled:opacity-50"
                            title={t.filled < 11 || (myLineup && myLineup.filled < 11) ? 'Kedua lineup harus lengkap 11 pemain' : 'Main sekarang'}
                        >
                            Main
                        </button>
                    </div>
                    {expanded === t.id && (
                        <div className="mt-3">
                            <FunTeamPitch team={t} formations={formations} />
                            <p className="text-center text-[10px] text-midnight-300 mt-2">
                                Chemistry {t.chemistry ?? 0} (+{t.chemistry_bonus ?? 0} OVR). OVR lingkaran = adjusted OVR per slot.
                                CPU OVR saat laga (level {difficulties[difficulty]?.label}) = <span className="text-cyan-200 font-bold">{cpuOvrOf(t)}</span>
                            </p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    return (
        <div className="space-y-6">
            <MatchTheater
                open={!!theater}
                title="Fun Match Theater"
                home={myLineup ? {
                    name: user?.team_name,
                    formation: myLineup.formation,
                    starters: myLineup.starters,
                    ovr: myLineup.team_ovr,
                } : null}
                away={theater ? {
                    name: theater.name,
                    formation: theater.formation,
                    starters: theater.starters,
                    ovr: cpuOvrOf(theater),
                } : null}
                formations={formations}
                startLabel="Main Sekarang"
                onStart={startTheater}
                onError={(err) => {
                    toast(errMsg(err, 'Fun match gagal.'), 'fa-circle-exclamation');
                    return errMsg(err, 'Fun match gagal.');
                }}
                onFinish={finishTheater}
                onClose={() => setTheater(null)}
            />

            <div className="ff-card p-6 rounded-3xl text-center">
                <i className="fa-solid fa-gamepad text-midnight-300 text-3xl mb-3 inline-block"></i>
                <h2 className="font-display text-2xl font-black ff-gradient-text mb-1">FUN MATCH</h2>
                <p className="text-xs text-midnight-300 max-w-lg mx-auto">
                    Pilih benua, lalu liga atau tim nasional, dan tantang tim upload-an admin.
                    Pilih level kesulitan, pastikan starting XI-mu sudah lengkap (11 tersimpan).
                    Mode latihan — tanpa hadiah pack.
                </p>
            </div>

            {myLineup && (
                <div className="ff-card p-4 rounded-2xl">
                    <h3 className="font-display font-bold text-midnight-200 text-sm uppercase tracking-wider mb-1">
                        <i className="fa-solid fa-shield-halved mr-1"></i> Kekuatan Tim Kamu
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-midnight-300">
                        <span>Formasi <b className="text-white">{myLineup.formation}</b></span>
                        <span>Team OVR <b className="text-white">{myLineup.team_ovr}</b>
                            {myLineup.base_team_ovr != null && <span className="text-midnight-300"> (base {myLineup.base_team_ovr})</span>}
                        </span>
                        <span>Chemistry <b className="text-emerald-300">{myLineup.chemistry ?? 0}</b>
                            <span className="text-emerald-300 font-bold"> +{myLineup.chemistry_bonus ?? 0} OVR</span>
                        </span>
                        <span>Terisi <b className="text-white">{myLineup.filled}/11</b></span>
                    </div>
                    <p className="text-[10px] text-midnight-300/80 mt-1">
                        Chemistry: pemain satu klub +1, satu negara +2. Total chemistry menambah Team OVR (maks +5).
                    </p>
                </div>
            )}

            {result && (
                <div className="ff-card p-6 rounded-3xl text-center">
                    <h3 className="font-display font-bold text-midnight-200 text-sm uppercase tracking-wider mb-1">Hasil Fun Match</h3>
                    <p className="text-[11px] text-midnight-300 mb-4">
                        vs {resAway} &middot; Level {result.snapshot?.difficulty_label || result.difficulty} (CPU OVR {result.opponent_ovr})
                    </p>
                    <div className="flex items-center justify-center gap-6 flex-wrap">
                        <TeamScore name={user.team_name} ovr={result.challenger_ovr} score={result.challenger_score} />
                        <span className="font-display text-2xl font-black text-midnight-300">VS</span>
                        <TeamScore name={resAway} ovr={result.opponent_ovr} score={result.opponent_score} />
                    </div>
                    <p className={`font-display text-3xl font-black mt-4 ${verdict(result).cls}`}>
                        {verdict(result).text}
                    </p>
                    <div className="mt-4 text-left">
                        <MatchEvents details={result.snapshot?.details} home={user.team_name} away={resAway} />
                    </div>
                </div>
            )}

            <div className="ff-card p-5 rounded-2xl">
                <h3 className="font-display font-bold text-midnight-200 text-sm uppercase tracking-wider mb-1">
                    <i className="fa-solid fa-gauge-high mr-1"></i> Level Kesulitan
                </h3>
                <p className="text-[10px] text-midnight-300 mb-3">Mengubah OVR tim CPU pada laga. XI dan Team OVR-mu tidak berubah.</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {Object.entries(difficulties).map(([key, d]) => (
                        <button
                            key={key}
                            onClick={() => setDifficulty(key)}
                            className={`p-3 rounded-xl text-left border transition ${
                                difficulty === key
                                    ? `bg-gradient-to-r ${DIFF_STYLE[key] || DIFF_STYLE.sedang} border-white/40 shadow-lg`
                                    : 'bg-midnight-950/60 border-midnight-700/60 hover:border-midnight-400/60'
                            }`}
                        >
                            <p className={`text-xs font-black uppercase tracking-wider ${difficulty === key ? '' : 'text-white'}`}>
                                <i className={`fa-solid ${d.icon || 'fa-gamepad'} mr-1.5`}></i>{d.label}
                            </p>
                            <p className={`text-[10px] mt-1 ${difficulty === key ? 'opacity-90' : 'text-midnight-300'}`}>
                                CPU {d.modifier > 0 ? `+${d.modifier}` : d.modifier} OVR
                            </p>
                            <p className={`text-[9px] mt-0.5 ${difficulty === key ? 'opacity-80' : 'text-midnight-300/70'}`}>{d.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="ff-card p-5 rounded-2xl">
                <h3 className="font-display font-bold text-midnight-200 text-sm uppercase tracking-wider mb-3">
                    <i className="fa-solid fa-globe mr-1"></i> 1. Pilih Benua
                </h3>
                {categories.length === 0 ? (
                    <EmptyState icon="fa-earth-asia" title="Belum Ada Kategori" subtitle="Admin belum membuat kategori benua. Cek lagi nanti!" />
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {categories.map((c) => {
                            const selected = categoryId === c.id;
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => pickCategory(c)}
                                    className={`group flex items-center gap-3 p-3 rounded-2xl border text-left transition ${
                                        selected
                                            ? 'bg-midnight-600/30 border-midnight-400/70 shadow-lg'
                                            : 'bg-midnight-950/60 border-midnight-700/60 hover:border-midnight-400/60'
                                    }`}
                                >
                                    <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition ${
                                        selected
                                            ? 'bg-white/15 text-white'
                                            : 'bg-midnight-800/80 text-cyan-200 group-hover:text-white'
                                    }`}>
                                        <i className={`fa-solid ${c.icon || 'fa-globe'} text-lg`}></i>
                                    </span>
                                    <span className="min-w-0">
                                        <span className={`block text-xs font-black uppercase tracking-wider truncate ${selected ? 'text-white' : 'text-midnight-200'}`}>
                                            {c.name}
                                        </span>
                                        <span className="block text-[10px] text-midnight-300/80">{c.teams_count} tim</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedCategory && (
                <div className="ff-card p-5 rounded-2xl space-y-4">
                    <h3 className="font-display font-bold text-midnight-200 text-sm uppercase tracking-wider">
                        <i className="fa-solid fa-trophy mr-1"></i> 2. Pilih Liga atau National
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => pickMode('league')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition ${
                                mode === 'league'
                                    ? 'bg-midnight-600/30 border-midnight-400/70 text-white'
                                    : 'bg-midnight-950/60 border-midnight-700/60 text-midnight-300'
                            }`}
                        >
                            <i className="fa-solid fa-trophy mr-1"></i> Liga
                        </button>
                        <button
                            onClick={() => pickMode('national')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition ${
                                mode === 'national'
                                    ? 'bg-midnight-600/30 border-midnight-400/70 text-white'
                                    : 'bg-midnight-950/60 border-midnight-700/60 text-midnight-300'
                            }`}
                        >
                            <i className="fa-solid fa-flag mr-1"></i> National
                        </button>
                    </div>

                    {mode === 'league' && (
                        leagues.length === 0 ? (
                            <p className="text-[11px] text-midnight-300">Belum ada liga di benua ini.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {leagues.map((l) => (
                                    <button
                                        key={l.id}
                                        onClick={() => { setLeagueId(l.id); setExpanded(null); }}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                                            leagueId === l.id
                                                ? 'bg-midnight-500/25 border-midnight-300/70 text-white'
                                                : 'bg-midnight-950/60 border-midnight-700/60 text-midnight-300 hover:border-midnight-400/60'
                                        }`}
                                    >
                                        {l.name}
                                        <span className="ml-1.5 text-[9px] text-midnight-300/80">{l.teams.length}</span>
                                    </button>
                                ))}
                            </div>
                        )
                    )}

                    {mode === 'national' && (
                        <p className="text-[11px] text-midnight-300">
                            Mode National menampilkan tim nasional di benua {selectedCategory.name}.
                        </p>
                    )}

                    {mode === 'league' && !selectedLeague && leagues.length > 0 && (
                        <p className="text-[11px] text-midnight-300">
                            <i className="fa-solid fa-circle-info mr-1"></i> Pilih liga dulu untuk melihat daftar tim.
                        </p>
                    )}
                </div>
            )}

            {selectedCategory && (mode === 'national' || selectedLeague) && (
                <div className="ff-card p-5 rounded-2xl">
                    <h3 className="font-display font-bold text-midnight-200 text-sm uppercase tracking-wider mb-1">
                        <i className="fa-solid fa-shield-halved mr-1"></i> 3. Pilih Tim Lawan
                    </h3>
                    <p className="text-[10px] text-midnight-300 mb-3">
                        {mode === 'national'
                            ? `Tim nasional ${selectedCategory.name}`
                            : `Liga ${selectedLeague.name} · ${selectedCategory.name}`}
                    </p>
                    {teamsToShow.length === 0 ? (
                        <EmptyState
                            icon="fa-shield-halved"
                            title="Belum Ada Tim"
                            subtitle={mode === 'national' ? 'Admin belum mengupload tim nasional di benua ini.' : 'Admin belum mengupload tim di liga ini.'}
                        />
                    ) : (
                        renderTeamList(teamsToShow)
                    )}
                </div>
            )}

            {uncategorized.length > 0 && (
                <div className="ff-card p-5 rounded-2xl">
                    <h3 className="font-display font-bold text-midnight-200 text-sm uppercase tracking-wider mb-1">
                        <i className="fa-solid fa-folder-open mr-1"></i> Tanpa Kategori
                    </h3>
                    <p className="text-[10px] text-midnight-300 mb-3">Tim lama yang belum dimasukkan admin ke benua/liga.</p>
                    {renderTeamList(uncategorized)}
                </div>
            )}
        </div>
    );
}

function TeamScore({ name, ovr, score }) {
    return (
        <div className="text-center">
            <p className="font-display font-bold text-white">{name}</p>
            <p className="text-[11px] text-midnight-300">Team OVR {ovr}</p>
            <p className="font-display text-5xl font-black text-gold-300 mt-1">{score}</p>
        </div>
    );
}

/* Lapangan XI tim fun (read-only, mirip lapangan Line-Up user):
   11 pemain sesuai formasi + foto, OVR dasar, dan identitas kartu. */
function FunTeamPitch({ team, formations }) {
    const slots = (formations && formations[team.formation]) || [];
    const bySlot = Object.fromEntries((team.starters || []).filter((s) => s?.player?.id).map((s) => [s.slot_id, s]));
    const ovrCls = (compat) => (compat === 'exact' ? 'green' : (compat === 'adjacent' || compat === 'shift') ? 'yellow' : 'red');

    return (
        <div className="ff-card p-2 rounded-3xl">
            <div className="pitch mini">
                <div className="pitch-box-top"></div>
                <div className="pitch-box-bottom"></div>
                {slots.map((sl) => {
                    const filled = bySlot[sl.id];
                    return (
                        <div
                            key={sl.id}
                            className={`player-slot ${filled ? '' : 'empty'}`}
                            style={{ left: `${sl.x}%`, top: `${sl.y}%` }}
                            title={filled ? `${filled.player.name} (${sl.label}, OVR ${filled.adjusted_ovr ?? filled.player.ovr})` : `Slot ${sl.label} kosong`}
                        >
                            {filled ? (
                                <>
                                    <div
                                        className={`slot-circle rank-${cardOf(filled.player)}`}
                                        style={imgSrc(filled.player) ? { backgroundImage: `url('${imgSrc(filled.player)}')` } : {}}
                                    >
                                        {!imgSrc(filled.player) && <i className="fa-solid fa-user"></i>}
                                        <div className={`slot-card-chip rank-${cardOf(filled.player)}`} title={`Kartu ${cardLabel(filled.player)}`}>
                                            <i className={`fa-solid ${RANK_ICON[cardOf(filled.player)] || 'fa-shield-halved'}`}></i>
                                        </div>
                                        <div className={`slot-ovr-badge ${ovrCls(filled.compat || 'exact')}`}>{filled.adjusted_ovr ?? filled.player.ovr}</div>
                                    </div>
                                    <div className="slot-label">
                                        {filled.player.name.split(' ').slice(-1)[0]} &middot; {sl.label}
                                    </div>
                                    <div className={`slot-card-name rank-${cardOf(filled.player)}`}>
                                        {cardLabel(filled.player)}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="slot-circle"><i className="fa-solid fa-plus"></i></div>
                                    <div className="slot-label">{sl.label}</div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
