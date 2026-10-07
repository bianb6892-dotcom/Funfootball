<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lineup;
use App\Services\GameService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LineupController extends Controller
{
    public function show(Request $request)
    {
        $lineup = Lineup::with('slots.player')->firstOrCreate(
            ['user_id' => $request->user()->id], ['formation' => '4-3-3']
        );

        return response()->json($this->present($lineup));
    }

    public function save(Request $request)
    {
        $data = $request->validate([
            'formation' => 'required|in:4-3-3,4-4-2,4-2-3-1,3-4-3,3-5-2,5-3-2',
            'starters' => 'required|array|size:11',
            'starters.*.slot_id' => 'required|string',
            'starters.*.player_id' => 'required|integer|exists:players,id',
            'bench' => 'sometimes|array|max:7',
            'bench.*' => 'integer|exists:players,id',
        ]);

        $ownedIds = $request->user()->userPlayers()->pluck('player_id')->all();
        $usedIds = array_merge(
            collect($data['starters'])->pluck('player_id')->all(),
            $data['bench'] ?? []
        );

        // WAJIB milik sendiri + tidak duplikat.
        if (count($usedIds) !== count(array_unique($usedIds))) {
            return response()->json(['message' => 'Duplicate player in lineup.'], 422);
        }
        if (count(array_diff($usedIds, $ownedIds)) > 0) {
            return response()->json(['message' => 'You can only use players from your collection.'], 422);
        }

        $formation = GameService::FORMATIONS[$data['formation']];
        $slotMap = collect($formation)->keyBy('id');
        foreach ($data['starters'] as $s) {
            if (! isset($slotMap[$s['slot_id']])) {
                return response()->json(['message' => "Invalid slot {$s['slot_id']} for formation."], 422);
            }
        }

        $lineup = DB::transaction(function () use ($request, $data, $formation) {
            $lineup = Lineup::firstOrCreate(['user_id' => $request->user()->id]);
            $lineup->update(['formation' => $data['formation']]);
            $lineup->slots()->delete();

            foreach ($data['starters'] as $s) {
                $slot = collect($formation)->firstWhere('id', $s['slot_id']);
                $lineup->slots()->create([
                    'slot_id' => $s['slot_id'], 'slot_position' => $slot['pos'],
                    'player_id' => $s['player_id'], 'is_bench' => false,
                ]);
            }
            foreach (array_values($data['bench'] ?? []) as $i => $pid) {
                $lineup->slots()->create([
                    'slot_id' => 'BENCH'.($i + 1), 'slot_position' => 'MF',
                    'player_id' => $pid, 'is_bench' => true, 'bench_order' => $i + 1,
                ]);
            }

            return $lineup->load('slots.player');
        });

        return response()->json($this->present($lineup));
    }

    private function present(Lineup $lineup): array
    {
        $starters = [];
        $adjusted = [];
        $penaltyTotal = 0;

        foreach ($lineup->slots->where('is_bench', false) as $slot) {
            if (! $slot->player) {
                continue;
            }
            $adj = GameService::adjustedOvr($slot->player, $slot->slot_position);
            $adjusted[] = $adj['ovr'];
            $penaltyTotal += abs($adj['penalty']);
            $starters[] = [
                'slot_id' => $slot->slot_id, 'slot_position' => $slot->slot_position,
                'player' => $slot->player, 'adjusted_ovr' => $adj['ovr'],
                'penalty' => $adj['penalty'], 'compat' => $adj['compat'],
            ];
        }

        return [
            'formation' => $lineup->formation,
            'formations' => GameService::FORMATIONS,
            'starters' => $starters,
            'bench' => $lineup->slots->where('is_bench', true)->map(fn ($s) => $s->player)->filter()->values(),
            'team_ovr' => GameService::teamOvr($adjusted),
            'filled' => count($starters),
            'penalty_total' => $penaltyTotal,
        ];
    }
}
