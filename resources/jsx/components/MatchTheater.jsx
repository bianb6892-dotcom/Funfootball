import { useEffect, useState } from 'react';
import { MatchPitch } from './MatchPitch';
import { MiniGameResult } from './MiniGameResult';
import { useMatchClock } from '../utils/useMatchClock';
import { errMsg } from '../utils/game';

const isMiniResult = (res) => {
    const type = res?.attempt?.challenge_type;
    return (type && type !== 'match') || !!res?.attempt?.snapshot?.minigame;
};

const phaseLabel = (half) => {
    if (half === 'ht') return 'HT';
    if (half === 'ft') return 'FT';
    return `Babak ${half}`;
};

function TeamSide({ team, align = 'left' }) {
    return (
        <div className={`theater-team theater-team--${align}`}>
            <p className="theater-team-name" title={team?.name || ''}>{team?.name || '—'}</p>
            <p className="theater-team-meta">
                OVR {team?.ovr ?? '—'}
                {team?.formation ? ` · ${team.formation}` : ''}
            </p>
        </div>
    );
}

/**
 * Match Theater — overlay full-screen berisi pratinjau XI vs XI dan tombol
 * mulai di tengah, lalu animasi pertandingan (atau mini-game) di layar yang
 * sama. Hasil server baru diminta saat tombol mulai ditekan.
 */
export function MatchTheater({
    open,
    title = 'Match Theater',
    home,
    away,
    formations,
    onStart,
    onFinish,
    onClose,
    onError,
    startLabel = 'Mulai Pertandingan',
    finishLabel = 'Lihat Hasil & Hadiah',
}) {
    const [phase, setPhase] = useState('preview');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const details = result?.attempt?.snapshot?.details || result?.snapshot?.details;
    const clock = useMatchClock(details, { enabled: open && phase === 'live' });

    useEffect(() => {
        if (!open) return;
        setPhase('preview');
        setResult(null);
        setError('');
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (event) => {
            if (event.key === 'Escape' && (phase === 'preview' || phase === 'error')) {
                onClose?.();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, phase, onClose]);

    if (!open) return null;

    const start = async () => {
        if (!onStart) return;
        setPhase('loading');
        setError('');
        try {
            const res = await onStart();
            if (!res) {
                setPhase('preview');
                return;
            }
            setResult(res);
            setPhase(isMiniResult(res) ? 'minigame' : 'live');
        } catch (err) {
            const message = onError?.(err);
            setError(typeof message === 'string' && message ? message : errMsg(err, 'Pertandingan gagal dimulai.'));
            setPhase('error');
        }
    };

    const finish = () => {
        if (result) {
            onFinish?.(result);
            return;
        }
        onClose?.();
    };

    const dismiss = () => {
        if (result) {
            onFinish?.(result);
            return;
        }
        onClose?.();
    };

    const showScoreboard = phase !== 'preview';

    return (
        <div className="theater-overlay" role="dialog" aria-modal="true" aria-label={title}>
            <div className="theater-shell">
                <div className="theater-top">
                    <div className="min-w-0">
                        <p className="theater-kicker">{title}</p>
                        <p className="theater-sub">XI Kamu vs XI Lawan</p>
                    </div>
                    {phase !== 'loading' && (
                        <button type="button" onClick={dismiss} className="theater-close" aria-label="Tutup">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    )}
                </div>

                {showScoreboard ? (
                    <div className="theater-scoreboard">
                        <TeamSide team={home} align="left" />
                        <div className="theater-clockbox">
                            {phase === 'live' ? (
                                <>
                                    <p className="theater-score">{clock.scoreA} - {clock.scoreB}</p>
                                    <p className="theater-clock">
                                        <span className={`theater-live-dot ${clock.half === 'ht' || clock.half === 'ft' ? 'is-static' : ''}`}></span>
                                        {clock.half === 'ht' || clock.half === 'ft'
                                            ? phaseLabel(clock.half)
                                            : <>LIVE {clock.minute}&prime; · {phaseLabel(clock.half)}</>}
                                    </p>
                                </>
                            ) : phase === 'minigame' ? (
                                <>
                                    <p className="theater-score theater-score--mini">MINI</p>
                                    <p className="theater-clock">Sesi Latihan</p>
                                </>
                            ) : (
                                <>
                                    <p className="theater-score">{result?.attempt?.user_score ?? 0} - {result?.attempt?.event_score ?? 0}</p>
                                    <p className="theater-clock">{phase === 'error' ? 'Gagal dimulai' : 'Menyiapkan…'}</p>
                                </>
                            )}
                        </div>
                        <TeamSide team={away} align="right" />
                    </div>
                ) : (
                    <div className="theater-duel">
                        <TeamSide team={home} align="left" />
                        <span className="theater-vs-chip">VS</span>
                        <TeamSide team={away} align="right" />
                    </div>
                )}

                {phase === 'live' && (
                    <div className="theater-progress">
                        <span style={{ width: `${Math.min(100, (clock.minute / 90) * 100)}%` }}></span>
                    </div>
                )}

                <div className={`theater-stage ${phase === 'minigame' || phase === 'loading' || phase === 'error' ? 'theater-stage--center' : ''}`}>
                    {(phase === 'preview' || phase === 'live') && (
                        <MatchPitch
                            home={home}
                            away={away}
                            formations={formations}
                            minute={clock.minute}
                            live={phase === 'live'}
                            events={clock.visible}
                        />
                    )}

                    {phase === 'preview' && (
                        <div className="theater-start-overlay">
                            <span className="theater-vs-badge">VS</span>
                            <button type="button" onClick={start} className="gold-btn theater-start-btn">
                                <i className="fa-solid fa-futbol"></i>
                                {startLabel}
                            </button>
                        </div>
                    )}

                    {phase === 'live' && clock.half === 'ht' && (
                        <div className="theater-result-panel">
                            <p className="theater-result-kicker">Jeda — babak pertama selesai</p>
                            <p className="theater-result-score">{clock.scoreA} - {clock.scoreB}</p>
                            <p className="theater-result-meta">{home?.name} vs {away?.name}</p>
                            <button type="button" onClick={clock.startSecond} className="gold-btn theater-result-btn">
                                <i className="fa-solid fa-play"></i> Mulai Babak Kedua
                            </button>
                        </div>
                    )}

                    {phase === 'live' && clock.half === 'ft' && (
                        <div className="theater-result-panel">
                            <p className="theater-result-kicker">Peluit akhir</p>
                            <p className="theater-result-score theater-result-score--gold">{clock.totalA} - {clock.totalB}</p>
                            <p className="theater-result-meta">{home?.name} vs {away?.name}</p>
                            <button type="button" onClick={finish} className="gold-btn theater-result-btn">
                                {finishLabel}
                            </button>
                        </div>
                    )}

                    {phase === 'live' && clock.half !== 'ht' && clock.half !== 'ft' && (
                        <button type="button" onClick={clock.skip} className="theater-skip">
                            <i className="fa-solid fa-forward"></i> Lewati
                        </button>
                    )}

                    {phase === 'loading' && (
                        <div className="theater-loading">
                            <span className="theater-spinner" aria-hidden="true"></span>
                            <p>Menyiapkan pertandingan…</p>
                        </div>
                    )}

                    {phase === 'error' && (
                        <div className="theater-error ff-card">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            <p>{error}</p>
                            <div className="theater-error-actions">
                                <button type="button" onClick={start} className="gold-btn px-5 py-2.5 rounded-xl text-[11px] font-black uppercase">
                                    Coba Lagi
                                </button>
                                <button type="button" onClick={onClose} className="ff-outline-btn px-5 py-2.5 rounded-xl text-[11px] font-black uppercase">
                                    Tutup
                                </button>
                            </div>
                        </div>
                    )}

                    {phase === 'minigame' && result && (
                        <div className="theater-minigame">
                            <MiniGameResult payload={result} onDone={finish} />
                        </div>
                    )}
                </div>

                {phase === 'live' && clock.half !== 'ht' && clock.half !== 'ft' && (
                    <div className="theater-feed">
                        {clock.visible.length === 0 ? (
                            <p className="theater-feed-empty">Kick-off… menanti momen pertama.</p>
                        ) : (
                            clock.visible.slice(-3).reverse().map((item, index) => (
                                <div key={`${item.minute}-${item.team}-${item.player}-${index}`} className="theater-feed-item">
                                    <span className="theater-feed-minute">{item.minute}&prime;</span>
                                    {item.kind === 'goal'
                                        ? <i className="fa-solid fa-futbol text-emerald-300"></i>
                                        : <span className={`theater-feed-card ${item.kind === 'red' ? 'is-red' : ''}`}></span>}
                                    <span className="theater-feed-text">
                                        <b>{item.player}</b>
                                        <span className={`theater-feed-team ${item.team === 'a' ? 'is-home' : 'is-away'}`}>
                                            {item.team === 'a' ? home?.name : away?.name}
                                        </span>
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {phase === 'preview' && (
                    <p className="theater-hint">
                        <i className="fa-solid fa-circle-info"></i> Pratinjau susunan XI. Pertandingan baru dihitung setelah kamu menekan tombol mulai.
                    </p>
                )}
            </div>
        </div>
    );
}
