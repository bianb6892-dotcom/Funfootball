import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { codeFor, countryName } from '../../utils/countries';
import { CountryFlag, PlayerCard, RankBadge } from '../../components/common';
import { MatchEvents } from '../../components/MatchEvents';
import { MatchTheater } from '../../components/MatchTheater';
import { MiniGameResult } from '../../components/MiniGameResult';
import { errMsg, timeID, cardOf } from '../../utils/game';

export function EventDetail() {
    const { id } = useParams();
    const toast = useToast();
    const { refresh } = useAuth();
    const [data, setData] = useState(null);
    const [myLineup, setMyLineup] = useState(null);
    const [theaterOpen, setTheaterOpen] = useState(false);
    const [lastResult, setLastResult] = useState(null);
    const [rewardReveal, setRewardReveal] = useState(null); // overlay hadiah besar saat menang

    const load = async () => {
        const { data: d } = await api.eventDetail(id);
        setData(d);
        // Default pilih tier saat ini agar panel node langsung terisi.
        if (d?.current_tier && selectedTier == null) setSelectedTier(d.current_tier);
    };

    useEffect(() => {
        load().catch(() => {});
        api.lineup().then(({ data: d }) => setMyLineup(d)).catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const [selectedTier, setSelectedTier] = useState(null);

    const rewardText = (reward) => {
        const draws = (reward.pack_draws || []).map((d) => d.name).join(', ');
        return `Hadiah Tier ${reward.tier || 1}: ${Number(reward.coins || 0).toLocaleString('id-ID')} koin`
            + `${reward.tokens_granted ? ` + ${reward.tokens_granted} token` : ''}`
            + `${reward.player ? ` + ${reward.player.name}` : ''}`
            + `${draws ? ` + draw ${reward.pack?.name || 'pack'}: ${draws}` : ''}`
            + `${!draws && reward.pack_error ? ` (pack ${reward.pack?.name || ''}: ${reward.pack_error})` : ''}`;
    };

    // Menang tapi tanpa hadiah: bedakan sudah-diklaim vs tier tanpa hadiah.
    const noRewardText = (reward) => (reward?.no_reward_defined
        ? 'Menang! Tier ini tidak memiliki hadiah.'
        : 'Menang! Hadiah tier ini sudah diklaim sebelumnya.');

    // Ada sesuatu yang layak ditampilkan besar? (koin/token/pemain/isi pack)
    const hasReward = (reward) => !!reward?.granted && (
        Number(reward.coins || 0) > 0
        || Number(reward.tokens_granted || 0) > 0
        || !!reward.player
        || (reward.pack_draws || []).length > 0
    );

    const openTheater = async () => {
        setLastResult(null);
        if (!myLineup) {
            try {
                const { data: d } = await api.lineup();
                setMyLineup(d);
            } catch { /* preview tetap jalan dengan XI lawan saja */ }
        }
        setTheaterOpen(true);
    };

    const startTheater = async () => {
        const { data: res } = await api.eventChallenge(id);
        return res;
    };

    const handleTheaterError = (err) => {
        const fails = err?.response?.data?.failures;
        if (fails?.length) {
            const message = fails.map((f) => f.message).join(' ');
            toast(message, 'fa-circle-exclamation');
            return message;
        }
        if (err?.response?.data?.event_finished) {
            toast('Semua tier event sudah selesai.', 'fa-circle-check');
            load().catch(() => {});
            return 'Semua tier event sudah selesai.';
        }
        if (err?.response?.data?.need_tokens) {
            const message = errMsg(err, 'Token tidak cukup. Klaim harian dulu!');
            toast(message, 'fa-ticket');
            return message;
        }
        const message = errMsg(err, 'Tantangan gagal.');
        toast(message, 'fa-circle-exclamation');
        return message;
    };

    // Dipanggil MatchTheater saat layar hasil ditutup: tampilkan hasil + klaim + koin realtime.
    const finishTheater = async (res) => {
        setTheaterOpen(false);
        if (!res) return;
        setLastResult(res);
        if (res?.reward?.is_new_unlock && (res?.reward?.tokens_spent ?? 0) > 0) {
            toast(`Node Tier ${res.reward.tier} terbuka (🎟${res.reward.tokens_spent}) — retry berikutnya gratis.`, 'fa-ticket');
        } else if (res?.reward?.is_free_retry) {
            toast('Retry gratis — tidak potong token.', 'fa-rotate-right');
        }
        if (res?.reward?.granted) {
            if (hasReward(res.reward)) setRewardReveal(res.reward);
            else toast(`Klaim ${rewardText(res.reward)}.`, 'fa-gift');
        } else if (res?.attempt?.result === 'user_win') {
            toast(noRewardText(res.reward), 'fa-circle-exclamation');
        }
        // Koin/token masuk tanpa refresh halaman: sinkronkan state auth.
        try { await refresh(); } catch { /* abaikan */ }
        load().catch(() => {});
    };

    if (!data) return <p className="text-midnight-300 text-sm">Memuat event...</p>;

    const preview = data.rules_preview || {};
    const completed = !!data.is_completed;
    const canPlay = data.status === 'live' && preview.complete !== false && !!preview.passed;
    const xi = data.slots || [];
    // Theater selalu memakai tier yang sedang berjalan (bukan node yang dipilih untuk dilihat).
    const currentTier = (data.reward_tiers || []).find((t) => t.tier === (data.current_tier || 1));
    const theaterAwayStarters = currentTier?.effective_lineup?.length ? currentTier.effective_lineup : data.slots;
    const theaterAwayFormation = currentTier?.effective_formation || data.formation;

    return (
        <div className="space-y-6">
            <MatchTheater
                open={theaterOpen}
                title="Event Match Theater"
                home={myLineup ? {
                    name: 'Kamu',
                    formation: myLineup.formation,
                    starters: myLineup.starters,
                    ovr: myLineup.team_ovr,
                } : null}
                away={{
                    name: 'Event XI',
                    formation: theaterAwayFormation,
                    starters: theaterAwayStarters,
                    ovr: currentTier?.effective_team_ovr ?? data.team_ovr,
                }}
                formations={data.formations}
                startLabel={currentTier?.challenge_type && currentTier.challenge_type !== 'match'
                    ? `Mulai ${currentTier.challenge_label || 'Latihan'}`
                    : 'Lawan XI Event'}
                onStart={startTheater}
                onError={handleTheaterError}
                onFinish={finishTheater}
                onClose={() => setTheaterOpen(false)}
            />

            <Link to="/events" className="text-[11px] text-midnight-300 hover:text-white">
                <i className="fa-solid fa-chevron-left mr-1"></i>Kembali ke daftar event
            </Link>

            <div className="ff-card p-6 rounded-3xl text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-midnight-300">
                    {completed ? 'Semua Tier Selesai' : statusText(data.status)}
                </p>
                <h2 className="font-display text-2xl font-black ff-gradient-text mt-1">{data.name}</h2>
                <p className="text-[11px] text-midnight-300 mt-1">{timeID(data.starts_at)} &rarr; {timeID(data.ends_at)} &middot; Formasi lawan {data.formation} &middot; Team OVR {data.team_ovr}</p>
                {data.description && <p className="text-xs text-midnight-200 mt-2 max-w-xl mx-auto">{data.description}</p>}
                <p className="text-xs text-gold-300 mt-2">
                    <i className="fa-solid fa-gift mr-1"></i>
                    Hadiah menang: {Number(data.reward_coins || 0).toLocaleString('id-ID')} koin
                    {data.reward_player ? ` + ${data.reward_player.name} (${data.reward_player.position}, OVR ${data.reward_player.ovr})` : ''}
                    {data.reward_pack ? ` + ${(data.reward_pack_draws || 0)}x draw ${data.reward_pack.name} gratis` : ''}
                    {data.reward_claimed && <span className="ml-2 text-[10px]">(sudah diklaim)</span>}
                </p>
                <p className="text-[11px] text-midnight-300 mt-1">
                    Rekor-mu: {data.my_wins || 0} menang / {data.my_attempts_count || 0} percobaan
                    {data.max_entries_per_user ? ` · Sisa masuk: ${data.entries_left ?? 0}/${data.max_entries_per_user}` : ''}
                </p>
                <p className="text-xs text-sky-300 mt-2">
                    <i className="fa-solid fa-ticket mr-1"></i>
                    Token-mu: {Number(data.tokens ?? 0).toLocaleString('id-ID')}
                    {data.daily?.can_claim
                        ? <span className="ml-2 text-gold-300">· Klaim harian +{data.daily.claim_amount} tersedia di Dashboard!</span>
                        : <span className="ml-2 text-midnight-300">· Bayar token sekali untuk buka node, retry gratis sampai menang</span>}
                </p>
                {(data.reward_tiers || []).length > 0 && (
                    <ChallengePath
                        tiers={data.reward_tiers}
                        currentTier={data.current_tier || 1}
                        claimedTiers={data.claimed_tiers || []}
                        unlockedTiers={data.unlocked_tiers || []}
                        selectedTier={selectedTier ?? data.current_tier ?? 1}
                        completed={completed}
                        onSelect={setSelectedTier}
                    />
                )}
            </div>

            <div className="ff-card p-5 rounded-2xl">
                <h3 className="font-display font-bold text-midnight-200 text-sm uppercase mb-3">
                    <i className="fa-solid fa-scale-balanced mr-1"></i> Rules XI User
                </h3>
                {(preview.checks || []).length > 0 ? (
                    <div className="space-y-1.5">
                        {(preview.checks || []).map((c, i) => (
                            <div key={i} className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs ${c.passed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-red-500/10 border-red-500/30 text-red-200'}`}>
                                <i className={`fa-solid ${c.passed ? 'fa-circle-check' : 'fa-circle-xmark'}`}></i>
                                <span>{c.message}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-midnight-300">{preview.message || 'Tanpa rules — semua XI boleh melawan.'}</p>
                )}
                {!completed && preview.complete === false && (
                    <p className="text-[11px] text-amber-300 mt-2">
                        Lengkapi dulu 11 pemain di <Link to="/lineup" className="underline">Line-Up</Link>.
                    </p>
                )}
                {(() => {
                    const cur = (data.reward_tiers || []).find((t) => t.tier === (data.current_tier || 1));
                    const cost = cur?.token_cost ?? data.token_cost ?? 1;
                    const unlocked = (data.unlocked_tiers || []).includes(data.current_tier || 1) || (data.claimed_tiers || []).includes(data.current_tier || 1);
                    const isMini = cur?.challenge_type && cur.challenge_type !== 'match';
                    const label = isMini ? `Mulai ${cur.challenge_label || 'Latihan'}` : 'Lawan XI Event';
                    const btnLabel = data.status !== 'live'
                        ? (data.status === 'upcoming' ? `Mulai ${timeID(data.starts_at)}` : data.status === 'ended' ? 'Event Telah Selesai' : 'Event Dinonaktifkan Admin')
                        : completed
                            ? 'Semua Tier Selesai'
                            : (data.entries_left === 0 ? 'Kesempatan Masuk Habis' : (cost > 0 && !unlocked ? `Unlock Node ${data.current_tier} (🎟${cost})` : `${label} (Gratis)`));
                    return (
                        <>
                            <button onClick={openTheater} disabled={theaterOpen || data.status !== 'live' || completed || data.entries_left === 0}
                                className="gold-btn w-full mt-4 px-4 py-3 rounded-xl text-xs font-black uppercase disabled:opacity-50">
                                {btnLabel}
                            </button>
                            {data.status === 'live' && !completed && cost > 0 && !unlocked && (
                                <p className="text-[11px] text-sky-300 mt-2 text-center">Sekali unlock, retry node ini gratis sampai menang (selama sisa {data.entries_left ?? '∞'} masuk).</p>
                            )}
                            {data.status === 'live' && !completed && unlocked && (
                                <p className="text-[11px] text-emerald-300 mt-2 text-center">Node sudah terbuka — retry gratis!</p>
                            )}
                            {completed && (
                                <p className="text-[11px] text-emerald-300 mt-2 text-center">Semua tier event sudah kamu selesaikan.</p>
                            )}
                        </>
                    );
                })()}
                {!completed && data.status === 'live' && preview.complete !== false && !preview.passed && (preview.checks || []).length > 0 && (
                    <p className="text-[11px] text-red-300 mt-2 text-center">XI-mu melanggar rules di atas — ubah susunan di <Link to="/lineup" className="underline">Line-Up</Link> dulu.</p>
                )}
            </div>

            {lastResult && (
                lastResult.attempt?.challenge_type && lastResult.attempt.challenge_type !== 'match'
                    ? <MiniGameSummary attempt={lastResult.attempt} reward={lastResult.reward} />
                    : <ResultCard attempt={lastResult.attempt} reward={lastResult.reward} />
            )}
            {rewardReveal && (
                <RewardReveal reward={rewardReveal} onClose={() => setRewardReveal(null)} />
            )}

            {(() => {
                const cur = (data.reward_tiers || []).find((t) => t.tier === (data.current_tier || 1));
                const effXi = cur?.effective_lineup?.length ? cur.effective_lineup : null;
                const effForm = cur?.effective_formation || data.formation;
                if (!effXi || cur?.tier <= 1) return null;
                return (
                    <div className="ff-card p-5 rounded-2xl border-midnight-400/40">
                        <h3 className="font-display font-bold text-gold-300 text-sm uppercase mb-1">
                            <i className="fa-solid fa-users mr-1"></i> XI Lawan — Level {cur.tier} ({effForm}) · OVR {cur.effective_team_ovr ?? ''}
                        </h3>
                        <p className="text-[11px] text-midnight-300 mb-3">Tier ini memakai line-up khusus (berbeda dari XI utama). Menang untuk naik level.</p>
                        <div className="grid sm:grid-cols-2 gap-2">
                            {effXi.map((s) => (
                                <div key={s.slot_id} className="flex items-center gap-2 p-2.5 rounded-xl bg-midnight-950/60 border border-gold-300/20">
                                    <span className="text-[10px] font-black text-gold-300 w-10 shrink-0">{s.slot_id}</span>
                                    {s.player ? (
                                        <>
                                            <CountryFlag code={codeFor(s.player)} className="w-6 h-4" />
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-xs font-bold text-white truncate">{s.player.name}</span>
                                                <span className="block text-[10px] text-midnight-300">
                                                    {s.player.position} &middot; {countryName(s.player.country_code) || s.player.nationality || ''} &middot; OVR {s.adjusted_ovr ?? s.player.ovr}
                                                </span>
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-[11px] text-midnight-300">— kosong —</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            <div className="ff-card p-5 rounded-2xl">
                <h3 className="font-display font-bold text-midnight-200 text-sm uppercase mb-3">
                    <i className="fa-solid fa-users mr-1"></i> XI Event Utama ({data.filled}/11) · {data.formation}
                </h3>
                <div className="grid sm:grid-cols-2 gap-2">
                    {xi.map((s) => (
                        <div key={s.slot_id} className="flex items-center gap-2 p-2.5 rounded-xl bg-midnight-950/60 border border-midnight-700/50">
                            <span className="text-[10px] font-black text-gold-300 w-10 shrink-0">{s.slot_id}</span>
                                    {s.player ? (
                                        <>
                                            <CountryFlag code={codeFor(s.player)} className="w-6 h-4" />
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-xs font-bold text-white truncate">{s.player.name}</span>
                                                <span className="block text-[10px] text-midnight-300">
                                                    {s.player.position} &middot; {countryName(s.player.country_code) || s.player.nationality || ''} &middot; OVR {s.adjusted_ovr ?? s.player.ovr}
                                                </span>
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-[11px] text-midnight-300">— kosong —</span>
                                    )}
                        </div>
                    ))}
                </div>
            </div>

            {(data.my_attempts || []).length > 0 && (
                <div className="ff-card p-5 rounded-2xl">
                    <h3 className="font-display font-bold text-midnight-200 text-sm uppercase mb-3">
                        <i className="fa-solid fa-clock-rotate-left mr-1"></i> Percobaanku
                    </h3>
                    <div className="space-y-1.5 text-xs">
                        {(data.my_attempts || []).map((a) => (
                            <div key={a.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-midnight-950/60 border border-midnight-700/50">
                                <span className="font-display font-black text-white shrink-0">{a.user_score} - {a.event_score}</span>
                                <span className={`flex-1 min-w-0 truncate ${a.result === 'user_win' ? 'text-emerald-300 font-bold' : a.result === 'draw' ? 'text-midnight-200' : 'text-red-400'}`}>
                                    {a.challenge_type && a.challenge_type !== 'match' ? <i className="fa-solid fa-bullseye mr-1"></i> : null}
                                    {a.result === 'user_win' ? 'MENANG' : a.result === 'draw' ? 'DRAW' : 'KALAH'}
                                    {a.reward_granted ? ` (+${Number(a.reward_coins || 0).toLocaleString('id-ID')} koin${a.tokens_granted ? ` +${a.tokens_granted}🎟` : ''})` : ''}
                                    <span className="text-midnight-300 font-normal"> · 🎟{a.tokens_spent ?? 0}</span>
                                </span>
                                <span className="text-midnight-300 text-[10px] shrink-0">OVR {a.user_ovr} vs {a.event_ovr}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function statusText(s) {
    return s === 'live' ? 'Sedang Berlangsung' : s === 'upcoming' ? 'Segera Hadir' : s === 'ended' ? 'Telah Selesai' : 'Nonaktif';
}

/* Peta jalan node ala Ballon d'Or: zig-zag horizontal, klik node untuk lihat hadiah/biaya. */
function ChallengePath({ tiers, currentTier, claimedTiers = [], unlockedTiers = [], selectedTier, completed = false, onSelect }) {
    const sorted = [...(tiers || [])].sort((a, b) => a.tier - b.tier);
    const sel = sorted.find((t) => t.tier === selectedTier) || sorted.find((t) => t.tier === currentTier) || sorted[0];
    return (
        <div className="mt-4 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-midnight-300 mb-2 text-center">
                {completed ? 'Semua node selesai — semua tier sudah dimainkan' : `Peta Flashback — Node ${currentTier} · Unlock sekali, retry gratis`}
            </p>
            <div className="overflow-x-auto pb-2 -mx-1 px-1">
                <div className="flex items-start gap-0 min-w-max mx-auto w-max max-w-full">
                    {sorted.map((t, i) => {
                        const claimed = claimedTiers.includes(t.tier) || t.is_claimed;
                        const isCurrent = t.tier === currentTier;
                        const unlocked = unlockedTiers.includes(t.tier) || t.is_unlocked || claimed;
                        const locked = !claimed && !isCurrent;
                        const up = i % 2 === 0;
                        const circle = claimed
                            ? 'bg-emerald-500/20 border-emerald-400/70 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,.45)]'
                            : isCurrent
                                ? (unlocked
                                    ? 'bg-gold-300/20 border-gold-300 text-gold-200 shadow-[0_0_22px_rgba(250,204,21,.55)] animate-pulse'
                                    : 'bg-midnight-600/40 border-gold-300/80 text-gold-200 shadow-[0_0_22px_rgba(250,204,21,.45)]')
                                : 'bg-midnight-950/70 border-midnight-600/60 text-midnight-400';
                        return (
                            <div key={t.tier} className="flex items-start">
                                <button
                                    onClick={() => onSelect?.(t.tier)}
                                    className={`flex flex-col items-center gap-1.5 w-[76px] shrink-0 ${up ? 'mt-0' : 'mt-10'} group`}
                                    title={`Node ${t.tier}`}
                                >
                                    <span className={`relative w-14 h-14 rounded-full border-2 flex items-center justify-center text-lg transition-transform group-hover:scale-105 ${circle} ${selectedTier === t.tier ? 'ring-2 ring-white/70' : ''}`}>
                                        <i className={`fa-solid ${claimed ? 'fa-check' : locked ? 'fa-lock' : (t.challenge_icon || 'fa-trophy')}`}></i>
                                        {!claimed && (t.token_cost ?? 1) > 0 && !unlocked && (
                                            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black bg-sky-500 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                🎟{t.token_cost}
                                            </span>
                                        )}
                                        {!claimed && unlocked && isCurrent && (
                                            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                FREE
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-[10px] font-black text-midnight-200">
                                        {t.tier === currentTier ? `Lv.${t.tier} • ${completed ? 'SELESAI' : 'KAMU'}` : `Lv.${t.tier}`}
                                        {t.ovr_boost > 0 ? ` +${t.ovr_boost}` : ''}
                                    </span>
                                    <span className="text-[9px] text-midnight-400 max-w-[72px] truncate">
                                        {t.challenge_type && t.challenge_type !== 'match' ? (t.challenge_label || 'Latihan') : 'Match'}
                                    </span>
                                </button>
                                {i < sorted.length - 1 && (
                                    <span className={`w-8 h-0.5 mt-7 shrink-0 ${sorted[i + 1]?.tier <= currentTier || claimed ? 'bg-emerald-400/60' : 'bg-midnight-600/60 border-t border-dashed border-midnight-500'}`}></span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            {sel && (
                <div className="mt-2 p-3 rounded-2xl bg-midnight-950/60 border border-midnight-700/50 text-[11px] text-midnight-200">
                    <p className="font-black text-white text-xs">
                        <i className={`fa-solid ${sel.challenge_icon || 'fa-trophy'} mr-1 text-gold-300`}></i>
                        Node {sel.tier} — {sel.challenge_type && sel.challenge_type !== 'match' ? (sel.challenge_label || 'Latihan') : 'Full Match'}
                        {sel.ovr_boost > 0 ? <span className="ml-1 text-red-300">(+{sel.ovr_boost} OVR lawan)</span> : null}
                        <span className="ml-2 font-normal text-midnight-300">XI {sel.effective_formation || sel.formation || ''} · OVR {sel.effective_team_ovr ?? '-'}</span>
                    </p>
                    <p className="mt-1">
                        🎁 {Number(sel.reward_coins || 0).toLocaleString('id-ID')} koin
                        {sel.reward_tokens ? ` + ${sel.reward_tokens} token` : ''}
                        {sel.reward_player ? ` + ${sel.reward_player.name}` : ''}
                        {sel.reward_pack ? ` + ${sel.reward_pack_draws || 0}x ${sel.reward_pack.name}` : ''}
                    </p>
                    <p className="mt-1 text-sky-300">
                        {completed
                            ? 'Event selesai — semua tier sudah dimainkan.'
                            : (sel.token_cost ?? 1) > 0
                                ? ((unlockedTiers.includes(sel.tier) || sel.is_unlocked || claimedTiers.includes(sel.tier))
                                    ? 'Sudah di-unlock — main gratis.'
                                    : `Butuh 🎟${sel.token_cost} sekali untuk unlock.`)
                                : 'Node gratis tanpa token.'}
                        {!completed && sel.tier !== currentTier && !claimedTiers.includes(sel.tier) ? ' Selesaikan node berjalan dulu untuk membuka node ini.' : ''}
                    </p>
                </div>
            )}
        </div>
    );
}

/* Ringkasan hasil mini-game setelah sesi selesai (seperti ResultCard untuk match). */
function MiniGameSummary({ attempt, reward }) {
    const mini = attempt?.snapshot?.minigame;
    const win = attempt?.result === 'user_win';
    return (
        <div className="ff-card p-6 rounded-3xl text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-midnight-300">Hasil {mini?.label || 'Latihan'}</p>
            <p className="font-display text-4xl font-black text-gold-300 mt-2">{attempt?.user_score} <span className="text-lg text-midnight-300">/ {(mini?.total ?? 5)}</span></p>
            <p className={`font-display text-3xl font-black mt-3 ${win ? 'text-emerald-300' : 'text-red-400'}`}>
                {win ? 'LOLOS' : 'GAGAL'}
            </p>
            <div className="flex items-center justify-center gap-2 mt-3">
                {(mini?.rounds || []).map((r, i) => (
                    <span key={i} className={`w-9 h-9 rounded-xl border flex items-center justify-center ${r.success ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300' : 'bg-red-500/10 border-red-500/40 text-red-400'}`}>
                        <i className={`fa-solid text-sm ${r.success ? 'fa-futbol' : 'fa-xmark'}`}></i>
                    </span>
                ))}
            </div>
            <p className="text-[11px] text-midnight-300 mt-2">Skill {mini?.skill} vs target {mini?.target}</p>
            {reward?.granted && (
                <p className="text-xs text-gold-300 mt-2">
                    <i className="fa-solid fa-gift mr-1"></i>
                    Hadiah Tier {reward.tier || 1}: {Number(reward.coins || 0).toLocaleString('id-ID')} koin{reward.tokens_granted ? ` + ${reward.tokens_granted} token` : ''}{reward.player ? ` + ${reward.player.name}` : ''}
                </p>
            )}
            {reward?.granted && (reward.pack_draws || []).length === 0 && reward?.pack_error && (
                <p className="text-[11px] text-red-400 mt-2">
                    <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                    Pack {reward.pack?.name || ''}: {reward.pack_error}
                </p>
            )}
            {win && !reward?.granted && (
                <p className="text-[11px] text-midnight-300 mt-2">
                    {reward?.no_reward_defined ? 'Tier ini tidak memiliki hadiah.' : 'Hadiah tier ini sudah diklaim sebelumnya.'}
                </p>
            )}
            {!win && (
                <p className="text-[11px] text-midnight-300 mt-2">Node sudah terbuka — coba lagi gratis (tidak potong token).</p>
            )}
        </div>
    );
}

function ResultCard({ attempt, reward }) {
    const win = attempt.result === 'user_win';
    return (
        <div className="ff-card p-6 rounded-3xl text-center">
            <h3 className="font-display font-bold text-midnight-200 text-sm uppercase mb-4">Hasil Pertandingan</h3>
            <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                    <p className="font-display font-bold text-white">Kamu</p>
                    <p className="text-[11px] text-midnight-300">Team OVR {attempt.user_ovr}</p>
                    <p className="font-display text-5xl font-black text-gold-300 mt-1">{attempt.user_score}</p>
                </div>
                <span className="font-display text-2xl font-black text-midnight-300">VS</span>
                <div className="text-center">
                    <p className="font-display font-bold text-white">Event XI</p>
                    <p className="text-[11px] text-midnight-300">Team OVR {attempt.event_ovr}</p>
                    <p className="font-display text-5xl font-black text-gold-300 mt-1">{attempt.event_score}</p>
                </div>
            </div>
            <p className={`font-display text-3xl font-black mt-4 ${win ? 'text-emerald-300' : attempt.result === 'draw' ? 'text-midnight-200' : 'text-red-400'}`}>
                {win ? 'WIN' : attempt.result === 'draw' ? 'DRAW' : 'LOSS'}
            </p>
            {reward?.granted && (
                <p className="text-xs text-gold-300 mt-2">
                    <i className="fa-solid fa-gift mr-1"></i>
                    Hadiah Tier {reward.tier || 1}: {Number(reward.coins || 0).toLocaleString('id-ID')} koin{reward.tokens_granted ? ` + ${reward.tokens_granted} token` : ''}{reward.player ? ` + ${reward.player.name}` : ''}
                    {reward.player_duplicate ? ' (pemain sudah dimiliki)' : ''}
                    {(reward.pack_draws || []).length > 0 ? ` + draw ${reward.pack?.name || 'pack'} gratis` : ''}
                </p>
            )}
            {reward?.tokens_spent ? (
                <p className="text-[11px] text-midnight-300 mt-1">Unlock node: 🎟{reward.tokens_spent} token (retry gratis)</p>
            ) : reward?.is_free_retry ? (
                <p className="text-[11px] text-emerald-300 mt-1">Retry gratis — tidak potong token</p>
            ) : null}
            {reward?.granted && (reward.pack_draws || []).length > 0 && (
                <div className="mt-3 space-y-1.5 text-left">
                    {(reward.pack_draws || []).map((pl) => (
                        <div key={pl.result_id} className="flex items-center gap-2 p-2 rounded-xl bg-midnight-950/60 border border-midnight-700/50">
                            <span className="flex-1 min-w-0">
                                <span className="block text-xs font-bold text-white truncate">{pl.name}</span>
                                <span className="block text-[10px] text-midnight-300">{pl.position} &middot; OVR {pl.ovr} &middot; {pl.rank_rolled === 'potw' ? '★ POTW' : pl.rank_rolled === 'ucl' ? 'UCL' : pl.rank_rolled === 'uel' ? 'UEL' : pl.rank_rolled === 'uecl' ? 'UECL' : pl.rank_rolled}</span>
                            </span>
                        </div>
                    ))}
                </div>
            )}
            {reward?.granted && (reward.pack_draws || []).length === 0 && reward?.pack_error && (
                <p className="text-[11px] text-red-400 mt-2">
                    <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                    Pack {reward.pack?.name || ''}: {reward.pack_error}
                </p>
            )}
            {win && !reward?.granted && (
                <p className="text-[11px] text-midnight-300 mt-2">
                    {reward?.no_reward_defined ? 'Tier ini tidak memiliki hadiah.' : 'Hadiah tier ini sudah diklaim sebelumnya.'}
                </p>
            )}
            <div className="mt-4 text-left">
                <MatchEvents details={attempt.snapshot?.details} home="Kamu" away="Event XI" />
            </div>
        </div>
    );
}

/* Overlay hadiah besar saat menang event (koin/token/pemain/isi pack gratis).
   Dibuat mencolok + berkonfeti agar user tidak melewatkan hadiah yang diterima.
   Memakai ulang gaya kartu rank (.rank-*) & animasi reveal gacha. */
function RewardReveal({ reward, onClose }) {
    const coins = Number(reward.coins || 0);
    const tokens = Number(reward.tokens_granted || 0);
    const draws = reward.pack_draws || [];
    const confettiColors = ['#f3c760', '#ffffff', '#7cffb2', '#22d3ee', '#c4b5fd'];
    return (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose}></div>
            <div className="reward-pop relative ff-card rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 text-center">
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <span
                            key={i}
                            className="fc-confetti"
                            style={{
                                left: `${4 + i * 8}%`,
                                background: confettiColors[i % confettiColors.length],
                                animationDelay: `${(i % 6) * 0.22}s`,
                                ['--drift']: `${(i % 2 === 0 ? 1 : -1) * (10 + ((i * 6) % 26))}px`,
                            }}
                        />
                    ))}
                </div>

                <div className="relative z-10">
                    <div className="reward-bounce w-16 h-16 mx-auto rounded-2xl bg-gold-300/15 border border-gold-300/50 flex items-center justify-center text-3xl text-gold-300">
                        <i className="fa-solid fa-gift"></i>
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gold-300 mt-3">Hadiah Diterima</p>
                    <h2 className="font-display text-3xl font-black ff-gradient-text mt-1">SELAMAT!</h2>
                    <p className="text-xs text-midnight-300 mt-1">Kamu menang di Tier {reward.tier || 1} dan mendapatkan:</p>

                    {(coins > 0 || tokens > 0) && (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            {coins > 0 && (
                                <div className="rounded-2xl border border-gold-300/40 bg-gold-300/10 p-4">
                                    <i className="fa-solid fa-coins text-gold-300 text-xl"></i>
                                    <p className="font-display text-2xl font-black text-gold-300 tabular-nums">+{coins.toLocaleString('id-ID')}</p>
                                    <p className="text-[10px] uppercase tracking-wider text-midnight-300">Koin</p>
                                </div>
                            )}
                            {tokens > 0 && (
                                <div className={`rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-4 ${coins > 0 ? '' : 'col-span-2'}`}>
                                    <i className="fa-solid fa-ticket text-emerald-300 text-xl"></i>
                                    <p className="font-display text-2xl font-black text-emerald-300 tabular-nums">+{tokens}</p>
                                    <p className="text-[10px] uppercase tracking-wider text-midnight-300">Token Event</p>
                                </div>
                            )}
                        </div>
                    )}

                    {reward.player && (
                        <div className="mt-5">
                            <p className="text-[11px] font-black uppercase tracking-widest text-midnight-200 mb-2">
                                <i className="fa-solid fa-user-plus mr-1"></i> Pemain Baru
                            </p>
                            <div className="max-w-[240px] mx-auto">
                                <PlayerCard
                                    player={reward.player}
                                    footer={
                                        <div className="pt-3 border-t border-midnight-400/15 text-center text-[11px] font-bold">
                                            {reward.player_duplicate
                                                ? <span className="text-midnight-300">Sudah dimiliki</span>
                                                : <span className="text-emerald-300">Masuk koleksi!</span>}
                                        </div>
                                    }
                                />
                            </div>
                        </div>
                    )}

                    {draws.length > 0 && (
                        <div className="mt-5">
                            <p className="text-[11px] font-black uppercase tracking-widest text-midnight-200 mb-2">
                                <i className="fa-solid fa-box-open mr-1"></i> Isi {reward.pack?.name || 'Pack'} ({draws.length})
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {draws.map((pl, i) => (
                                    <div key={pl.result_id} className={`reveal-step p-3 rounded-2xl border rank-${cardOf(pl)} text-center`} style={{ animationDelay: `${i * 0.12}s` }}>
                                        <RankBadge rank={cardOf(pl)} />
                                        <p className="mt-2 text-xs font-bold text-white truncate">{pl.name}</p>
                                        <p className="text-[10px] text-midnight-200 font-semibold">{pl.position} &middot; OVR {pl.ovr}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {draws.length === 0 && reward.pack_error && (
                        <p className="text-[11px] text-red-400 mt-4">
                            <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                            Pack {reward.pack?.name || ''}: {reward.pack_error}
                        </p>
                    )}

                    <button onClick={onClose} className="gold-btn w-full mt-6 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider">
                        <i className="fa-solid fa-check mr-1"></i> Lanjut
                    </button>
                </div>
            </div>
        </div>
    );
}
