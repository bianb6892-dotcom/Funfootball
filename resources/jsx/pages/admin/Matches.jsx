import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { EmptyState } from '../../components/common';
import { timeID } from '../../utils/game';

export function AdminMatches() {
    const [matches, setMatches] = useState([]);

    useEffect(() => {
        api.adminMatches().then(({ data }) => setMatches(data.data)).catch(() => {});
    }, []);

    if (matches.length === 0) return <EmptyState icon="fa-trophy" title="Belum Ada Pertandingan" />;

    return (
        <div className="space-y-6">
            <div className="ff-card p-5 rounded-2xl">
                <h2 className="font-display text-xl font-black ff-gradient-text">SEMUA PERTANDINGAN</h2>
                <p className="text-xs text-midnight-300">Total: {matches.length} (halaman pertama)</p>
            </div>
            <div className="ff-card rounded-2xl overflow-x-auto">
                <table className="w-full text-xs min-w-[720px]">
                    <thead>
                        <tr className="text-left text-midnight-300 uppercase text-[10px] tracking-wider border-b border-midnight-700">
                            <th className="p-4">Waktu</th>
                            <th className="p-4 text-center">Challenger (OVR)</th>
                            <th className="p-4 text-center">Skor</th>
                            <th className="p-4 text-center">Opponent (OVR)</th>
                            <th className="p-4 text-center">Hasil</th>
                        </tr>
                    </thead>
                    <tbody>
                        {matches.map((m) => (
                            <tr key={m.id} className="border-b border-midnight-700/40 hover:bg-midnight-800/40">
                                <td className="p-4 text-midnight-300 whitespace-nowrap">{timeID(m.played_at)}</td>
                                <td className="p-4 text-center text-white font-semibold">#{m.challenger_id} ({m.challenger_ovr})</td>
                                <td className="p-4 text-center font-display font-black text-gold-300 text-base">
                                    {m.challenger_score} - {m.opponent_score}
                                </td>
                                <td className="p-4 text-center text-white font-semibold">
                                    {m.opponent_id
                                        ? `#${m.opponent_id} (${m.opponent_ovr})`
                                        : <span title={`Fun Match vs ${m.snapshot?.fun_team?.name || 'Tim CPU'} · Level ${m.snapshot?.difficulty_label || m.difficulty || '—'}`}>🤖 {m.snapshot?.fun_team?.name || 'CPU'} ({m.opponent_ovr})</span>}
                                </td>
                                <td className="p-4 text-center text-midnight-200">{m.result}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
