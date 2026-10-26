import { useEffect, useState } from 'react';

/* Sesi mini-game latihan: 5x percobaan dibuka satu per satu, butuh >=3 gol. */
export function MiniGameResult({ payload, onDone }) {
    const mini = payload?.attempt?.snapshot?.minigame;
    const rounds = mini?.rounds || [];
    const [shown, setShown] = useState(0);
    const done = shown >= rounds.length;

    useEffect(() => {
        setShown(0);
        if (!rounds.length) return;
        const t = setInterval(() => {
            setShown((s) => {
                if (s >= rounds.length) {
                    clearInterval(t);
                    return s;
                }
                return s + 1;
            });
        }, 650);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payload]);

    const goals = rounds.slice(0, shown).filter((r) => r.success).length;

    return (
        <div className="ff-card p-6 rounded-3xl text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-midnight-300">Mini-Game Event</p>
            <h3 className="font-display text-xl font-black ff-gradient-text mt-1">{mini?.label || 'Latihan'}</h3>
            <p className="text-[11px] text-midnight-300 mt-1">
                Skill tim {mini?.skill ?? '-'} vs target {mini?.target ?? '-'} · butuh {mini?.need ?? 3} gol dari {mini?.total ?? 5} percobaan
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
                {rounds.map((r, i) => (
                    <div
                        key={i}
                        className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-xl transition-all ${i < shown
                            ? (r.success ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 scale-100' : 'bg-red-500/10 border-red-500/40 text-red-400 scale-100')
                            : 'bg-midnight-950/60 border-midnight-700/50 text-midnight-300/40 scale-95'}`}
                    >
                        <i className={`fa-solid ${i < shown ? (r.success ? 'fa-futbol' : 'fa-xmark') : 'fa-question'}`}></i>
                    </div>
                ))}
            </div>
            <p className="font-display text-4xl font-black text-gold-300 mt-4">{goals} <span className="text-lg text-midnight-300">/ {rounds.length}</span></p>
            {done ? (
                <>
                    <p className={`font-display text-2xl font-black mt-2 ${payload?.attempt?.result === 'user_win' ? 'text-emerald-300' : 'text-red-400'}`}>
                        {payload?.attempt?.result === 'user_win' ? 'LATIHAN LOLOS!' : 'BELUM LOLOS'}
                    </p>
                    <p className="text-[11px] text-midnight-300 mt-1">Biaya masuk: 🎟{payload?.reward?.tokens_spent ?? payload?.attempt?.tokens_spent ?? 0} token</p>
                    <button onClick={onDone} className="gold-btn px-6 py-3 rounded-xl text-xs font-black uppercase mt-4">
                        Lihat Hasil
                    </button>
                </>
            ) : (
                <p className="text-[11px] text-midnight-300 mt-3">Tendangan {Math.min(shown + 1, rounds.length)} dari {rounds.length}...</p>
            )}
        </div>
    );
}
