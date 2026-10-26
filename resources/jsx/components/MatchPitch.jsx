import { useMemo } from 'react';

const lastName = (name = '') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : '—';
};

function buildTokens(starters, formation, formations, side) {
    const slots = formations?.[formation] || [];
    const bySlot = Object.fromEntries(
        (starters || []).filter((s) => s?.player).map((s) => [s.slot_id, s])
    );
    const tokens = [];
    slots.forEach((slot, index) => {
        const starter = bySlot[slot.id];
        if (!starter) return;
        tokens.push({
            slotId: slot.id,
            side,
            name: starter.player.name,
            number: starter.player.shirt_number ?? index + 1,
            position: slot.label,
            ovr: starter.adjusted_ovr ?? starter.player.ovr,
            x: side === 'home' ? slot.x : 100 - slot.x,
            y: side === 'home' ? 50 + slot.y * 0.44 : 50 - slot.y * 0.44,
        });
    });
    return tokens;
}

/**
 * Lapangan theater: dua XI (home di paruh bawah, away di paruh atas yang
 * dicerminkan) + bola beranimasi dan sorotan gol. Tanpa foto pemain.
 */
export function MatchPitch({
    home, away, formations,
    minute = 0, live = false, events = [],
}) {
    const homeTokens = useMemo(
        () => buildTokens(home?.starters, home?.formation, formations, 'home'),
        [home, formations]
    );
    const awayTokens = useMemo(
        () => buildTokens(away?.starters, away?.formation, formations, 'away'),
        [away, formations]
    );

    const lastEvent = events[events.length - 1];
    const goalFlash = live && lastEvent?.kind === 'goal' && lastEvent.minute === minute
        ? { key: `${minute}-${lastEvent.team}-${lastEvent.player}`, player: lastEvent.player }
        : null;

    // Bola bergerak halus antar-menit agar lapangan terasa hidup.
    const ball = live
        ? { x: 50 + Math.sin(minute * 0.55) * 26, y: 50 + Math.cos(minute * 0.8) * 18 }
        : { x: 50, y: 50 };

    const renderToken = (t) => (
        <div
            key={`${t.side}-${t.slotId}`}
            className={`theater-token theater-token--${t.side}`}
            style={{ left: `${t.x}%`, top: `${t.y}%` }}
            title={`${t.name} (${t.position}, OVR ${t.ovr})`}
        >
            <span className="theater-token-circle">{t.number}</span>
            <span className="theater-token-name">{lastName(t.name)}</span>
        </div>
    );

    return (
        <div className={`theater-pitch ${live ? 'theater-pitch--live' : 'theater-pitch--preview'}`}>
            <span className="theater-line theater-line--halfway" aria-hidden="true"></span>
            <span className="theater-line theater-line--circle" aria-hidden="true"></span>
            <span className="theater-line theater-line--box theater-line--box-top" aria-hidden="true"></span>
            <span className="theater-line theater-line--box theater-line--box-bottom" aria-hidden="true"></span>
            <span className="theater-line theater-line--goal theater-line--goal-top" aria-hidden="true"></span>
            <span className="theater-line theater-line--goal theater-line--goal-bottom" aria-hidden="true"></span>

            {awayTokens.map(renderToken)}
            {homeTokens.map(renderToken)}

            {live && (
                <span
                    className="theater-ball"
                    style={{ left: `${ball.x}%`, top: `${ball.y}%` }}
                    aria-hidden="true"
                >
                    <i className="fa-solid fa-futbol"></i>
                </span>
            )}

            {goalFlash && (
                <span key={goalFlash.key} className="theater-goal-flash" aria-hidden="true">
                    GOAL! <span>{lastName(goalFlash.player)}</span>
                </span>
            )}
        </div>
    );
}
