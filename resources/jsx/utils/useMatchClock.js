import { useEffect, useMemo, useState } from 'react';

export const MATCH_STEP_MS = 1200;
export const MATCH_CLOCK_STEP = 5; // menit per tick → satu babak ± 11 detik

/**
 * Timeline pertandingan (menit per menit) dari snapshot details.
 * Dipakai LiveMatch (PVP) dan MatchTheater (Fun Match/Event).
 * Babak 2 melanjutkan skor babak 1; skor final dihitung dari seluruh kejadian.
 */
export function useMatchClock(details, {
    enabled = true,
    stepMs = MATCH_STEP_MS,
    clockStep = MATCH_CLOCK_STEP,
} = {}) {
    const items = useMemo(() => {
        if (!details?.events) return [];
        const list = [];
        for (const team of ['a', 'b']) {
            const ev = details.events[team] || { goals: [], yellows: [], reds: [] };
            (ev.goals || []).forEach((g) => list.push({ minute: g.minute, team, kind: 'goal', ...g }));
            (ev.yellows || []).forEach((c) => list.push({ minute: c.minute, team, kind: 'yellow', ...c }));
            (ev.reds || []).forEach((c) => list.push({ minute: c.minute, team, kind: 'red', ...c }));
        }
        return list.sort((x, y) => x.minute - y.minute);
    }, [details]);

    const first = useMemo(() => items.filter((i) => i.minute <= 45), [items]);
    const second = useMemo(() => items.filter((i) => i.minute > 45), [items]);
    const firstGoalsA = first.filter((i) => i.team === 'a' && i.kind === 'goal').length;
    const firstGoalsB = first.filter((i) => i.team === 'b' && i.kind === 'goal').length;

    const [half, setHalf] = useState(1); // 1 | 'ht' | 2 | 'ft'
    const [minute, setMinute] = useState(0);

    useEffect(() => {
        setHalf(1);
        setMinute(0);
    }, [details]);

    const visible = (half === 2 ? second : first).filter((i) => i.minute <= minute);
    const scoreA = (half === 2 ? firstGoalsA : 0) + visible.filter((i) => i.team === 'a' && i.kind === 'goal').length;
    const scoreB = (half === 2 ? firstGoalsB : 0) + visible.filter((i) => i.team === 'b' && i.kind === 'goal').length;
    const totalA = items.filter((i) => i.team === 'a' && i.kind === 'goal').length;
    const totalB = items.filter((i) => i.team === 'b' && i.kind === 'goal').length;

    useEffect(() => {
        if (!enabled || (half !== 1 && half !== 2)) return;
        const end = half === 1 ? 45 : 90;
        if (minute >= end) {
            const t = setTimeout(() => setHalf(half === 1 ? 'ht' : 'ft'), 1200);
            return () => clearTimeout(t);
        }
        const t = setTimeout(() => setMinute((m) => Math.min(end, m + clockStep)), stepMs);
        return () => clearTimeout(t);
    }, [enabled, half, minute, stepMs, clockStep]);

    const skip = () => setHalf('ft');
    const startSecond = () => {
        setMinute(45);
        setHalf(2);
    };
    const reset = () => {
        setHalf(1);
        setMinute(0);
    };

    return {
        items, first, second, visible,
        half, minute, scoreA, scoreB, totalA, totalB,
        skip, startSecond, reset,
    };
}
