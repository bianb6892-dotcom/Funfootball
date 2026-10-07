<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CoinTransaction;
use App\Models\GachaPack;
use App\Models\GachaResult;
use App\Models\Player;
use App\Models\UserPlayer;
use App\Services\GameService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GachaController extends Controller
{
    public function packs(Request $request)
    {
        $query = GachaPack::query();
        if (! ($request->boolean('all') && $request->user()->isAdmin())) {
            $query->where('is_active', true);
        }

        return response()->json($query->get());
    }

    public function draw(Request $request, GachaPack $pack)
    {
        if (! $pack->is_active) {
            return response()->json(['message' => 'Pack is inactive.'], 422);
        }

        return DB::transaction(function () use ($request, $pack) {
            $user = $request->user()->lockForUpdate()->find($request->user()->id);

            if ($user->coins < $pack->price) {
                return response()->json(['message' => 'Not enough coins.'], 422);
            }

            $pool = Player::where('is_active_in_gacha', true)->get();
            if ($pool->isEmpty()) {
                return response()->json(['message' => 'Gacha pool is empty.'], 422);
            }

            $counts = ['bronze' => 0, 'silver' => 0, 'gold' => 0, 'diamond' => 0];
            foreach ($pool as $p) {
                $counts[GameService::rankFor($p)]++;
            }

            $rolled = GameService::rollRank($pack->rates, $counts);
            $candidates = $pool->filter(fn ($p) => GameService::rankFor($p) === $rolled)->values();
            if ($candidates->isEmpty()) {
                return response()->json(['message' => 'No player for rolled rank.'], 422);
            }
            $player = $candidates->random();

            $user->decrement('coins', $pack->price);
            $user->refresh();

            CoinTransaction::create([
                'user_id' => $user->id, 'type' => 'gacha_spend',
                'amount' => -$pack->price, 'balance_after' => $user->coins,
                'description' => "Gacha {$pack->name}",
            ]);

            UserPlayer::firstOrCreate(
                ['user_id' => $user->id, 'player_id' => $player->id],
                ['acquired_via' => 'gacha']
            );

            $result = GachaResult::create([
                'user_id' => $user->id, 'pack_id' => $pack->id, 'player_id' => $player->id,
                'player_name' => $player->name, 'ovr' => $player->fresh()->ovr,
                'rank_rolled' => $rolled, 'price_paid' => $pack->price,
            ]);

            return response()->json([
                'player' => $player->fresh(), 'rank_rolled' => $rolled,
                'coins' => $user->coins, 'result_id' => $result->id,
            ]);
        });
    }

    public function history(Request $request)
    {
        return response()->json(
            GachaResult::with(['pack', 'player'])
                ->where('user_id', $request->user()->id)
                ->latest()->paginate(20)
        );
    }
}
