import { useMatchClock } from '../utils/useMatchClock';

const GOAL_TYPE = { open: null, solo: 'Solo run', freekick: 'Tendangan bebas', penalty: 'Penalti' };

/**
 * LiveMatch — pertandingan berjalan menit per menit (tidak instan).
 * Babak 1 (≤45') → JEDA paruh waktu (tombol lanjut) → Babak 2 → peluit akhir.
 * Skor babak 2 selalu melanjutkan skor babak 1 (tidak reset ke 0-0).
 */
export function LiveMatch({ details, home = 'Kamu', away = 'Lawan', onDone }) {
    const {
        visible, half, minute, scoreA, scoreB, totalA, totalB,
        skip, startSecond,
    } = useMatchClock(details);

    if (half === 'ht') {
        return (
            <div className="ff-card p-8 rounded-3xl text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-midnight-300">Jeda — babak pertama selesai</p>
                <p className="font-display text-5xl font-black text-white mt-3">{scoreA} - {scoreB}</p>
                <p className="text-xs text-midnight-300 mt-1">{home} vs {away}</p>
                <button onClick={startSecond} className="gold-btn px-8 py-3 rounded-xl text-xs font-black uppercase mt-5">
                    <i className="fa-solid fa-play mr-1"></i> Mulai Babak Kedua
                </button>
            </div>
        );
    }

    if (half === 'ft') {
        return (
            <div className="ff-card p-8 rounded-3xl text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-midnight-300">Peluit akhir</p>
                <p className="font-display text-5xl font-black text-gold-300 mt-3 tabular-nums">{totalA} - {totalB}</p>
                <p className="text-xs text-midnight-300 mt-1">{home} vs {away}</p>
                <button onClick={onDone} className="gold-btn px-8 py-3 rounded-xl text-xs font-black uppercase mt-5">
                    Lihat Hasil &amp; Hadiah
                </button>
            </div>
        );
    }

    return (
        <div className="ff-card rounded-3xl overflow-hidden">
            <div className="p-4 bg-midnight-950/60 border-b border-midnight-700/50">
                <div className="flex items-center justify-center gap-4">
                    <p className="flex-1 text-right text-xs font-bold text-white truncate">{home}</p>
                    <p className="font-display text-3xl font-black text-white tabular-nums shrink-0">{scoreA} - {scoreB}</p>
                    <p className="flex-1 text-xs font-bold text-white truncate">{away}</p>
                </div>
                <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                    <span className="text-[11px] font-black text-red-400 tabular-nums">LIVE {minute}&prime; &middot; Babak {half}</span>
                    <button onClick={skip} className="ml-2 text-[10px] text-midnight-300 hover:text-white underline">Lewati</button>
                </div>
                <div className="h-1 rounded-full bg-midnight-800 mt-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-midnight-500 to-emerald-400 transition-all duration-700" style={{ width: `${Math.min(100, (minute / 90) * 100)}%` }}></div>
                </div>
            </div>
            <div className="p-4 space-y-1 min-h-[120px]">
                {visible.length === 0 && <p className="text-[11px] text-midnight-300 text-center py-4">Kick-off… menanti momen pertama.</p>}
                {visible.map((it, i) => (
                    <div key={i} className={`flex items-center gap-2 py-1 px-2 rounded-lg ${it.team === 'a' ? '' : 'flex-row-reverse text-right'} bg-midnight-950/40`}>
                        <span className="text-[10px] font-black text-midnight-200 tabular-nums shrink-0">{it.minute}&prime;</span>
                        {it.kind === 'goal' ? (
                            <i className="fa-solid fa-futbol text-emerald-300 text-xs shrink-0"></i>
                        ) : (
                            <span className={`w-3 h-4 rounded-[3px] shrink-0 border ${it.kind === 'red' ? 'bg-red-600 border-red-400' : 'bg-yellow-400 border-yellow-200'}`}></span>
                        )}
                        <p className="text-xs text-white min-w-0">
                            <span className="font-bold">{it.player}</span>
                            {it.kind === 'goal' && (it.assist
                                ? <span className="text-midnight-300 text-[10px]"> (ast. {it.assist})</span>
                                : GOAL_TYPE[it.type] ? <span className="text-midnight-300 text-[10px]"> · {GOAL_TYPE[it.type]}</span> : null)}
                            {it.kind === 'red' && <span className="text-midnight-300 text-[10px]"> · {it.type === 'second_yellow' ? 'kuning kedua' : 'merah langsung'}</span>}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
