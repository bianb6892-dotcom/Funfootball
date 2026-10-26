<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FootballMatch;
use App\Models\GachaPack;
use App\Models\Lineup;
use App\Models\User;
use App\Services\GameService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MatchController extends Controller
{
    public function opponents(Request $request)
    {
        return response()->json(
            User::where('role', 'user')->where('id', '!=', $request->user()->id)
                ->select(['id', 'name', 'team_name'])
                ->withCount('userPlayers')
                ->paginate(12)
        );
    }

    public function challenge(Request $request)
    {
        $data = $request->validate(['opponent_id' => 'required|exists:users,id']);

        if ((int) $data['opponent_id'] === (int) $request->user()->id) {
            return response()->json(['message' => 'Cannot challenge yourself.'], 422);
        }

        $challenger = Lineup::with('slots.player')->where('user_id', $request->user()->id)->first();
        $opponent = Lineup::with('slots.player')->where('user_id', $data['opponent_id'])->first();

        // Slot yang pemainnya sudah dihapus (player_id null via nullOnDelete) tidak dihitung sebagai terisi.
        $filledCount = function (Lineup $lineup) {
            return $lineup->slots->where('is_bench', false)->filter(fn ($s) => $s->player)->count();
        };

        if (! $challenger || $filledCount($challenger) < 11) {
            return response()->json(['message' => 'Your starting XI is incomplete (need 11).'], 422);
        }
        if (! $opponent || $filledCount($opponent) < 11) {
            return response()->json(['message' => 'Opponent lineup is incomplete.'], 422);
        }

        // Hitung ulang SEMUA di server — nilai frontend tidak dipercaya.
        $build = function (Lineup $lineup) {
            $adj = [];
            $names = [];
            $players = [];
            foreach ($lineup->slots->where('is_bench', false) as $slot) {
                if (! $slot->player) {
                    continue;
                }
                $a = GameService::adjustedOvr($slot->player, $slot->slot_position, $slot->slot_id);
                $adj[] = $a['ovr'];
                $names[] = ['name' => $slot->player->name, 'pos' => $slot->slot_id, 'ovr' => $a['ovr']];
                $players[] = $slot->player;
            }
            $strength = GameService::teamStrength($adj, $players);

            return [
                'ovr' => $strength['ovr'], 'base_ovr' => $strength['base'],
                'chemistry' => $strength['chemistry']['points'],
                'chemistry_bonus' => $strength['bonus'],
                'xi' => $names, 'formation' => $lineup->formation,
            ];
        };

        $a = $build($challenger);
        $b = $build($opponent);
        $sim = GameService::simulateMatchDetail($a['ovr'], $b['ovr'], $a['xi'], $b['xi']);
        $result = $sim['winner'] === 'A' ? 'challenger_win' : ($sim['winner'] === 'B' ? 'opponent_win' : 'draw');

        $payload = DB::transaction(function () use ($request, $data, $a, $b, $sim, $result) {
            $match = FootballMatch::create([
                'challenger_id' => $request->user()->id,
                'opponent_id' => (int) $data['opponent_id'],
                'challenger_ovr' => $a['ovr'], 'opponent_ovr' => $b['ovr'],
                'challenger_score' => $sim['a'], 'opponent_score' => $sim['b'],
                'result' => $result,
                'snapshot' => ['challenger' => $a, 'opponent' => $b, 'details' => [
                    'events' => $sim['events'], 'stats' => $sim['stats'],
                    'ratings' => $sim['ratings'], 'motm' => $sim['motm'],
                ]],
            ]);

            // Hadiah kemenangan: 1x draw gratis otomatis dari pack aktif
            // termurah (menyesuaikan ekonomi admin). Menang = challenger_win
            // (penantang selalu user yang request). Pack kosong/nonaktif →
            // tidak ada hadiah, pertandingan tetap tersimpan.
            $rewardPack = null;
            $rewardDraws = [];
            if ($result === 'challenger_win') {
                $pack = GachaPack::where('is_active', true)->orderBy('price')->first();
                if ($pack) {
                    $user = $request->user()->lockForUpdate()->find($request->user()->id);
                    try {
                        $draws = GachaController::performDraws($user, $pack, 1, 0);
                    } catch (\RuntimeException $e) {
                        report($e);
                        $draws = [];
                    }
                    if (! empty($draws)) {
                        $rewardPack = GachaPack::select(['id', 'name', 'slug'])->find($pack->id);
                        $rewardDraws = array_map(fn ($d) => array_merge($d['player']->toArray(), [
                            'rank_rolled' => $d['rank_rolled'], 'result_id' => $d['result_id'],
                        ]), $draws);
                    }
                }
            }

            return array_merge($match->toArray(), [
                'reward_pack' => $rewardPack,
                'reward_draws' => $rewardDraws,
            ]);
        });

        return response()->json($payload, 201);
    }

    public function history(Request $request)
    {
        $id = $request->user()->id;

        return response()->json(
            FootballMatch::where('challenger_id', $id)->orWhere('opponent_id', $id)
                ->latest('played_at')->paginate(15)
        );
    }
}
