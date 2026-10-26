<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CoinTransaction;
use App\Models\GachaPack;
use App\Models\GachaResult;
use App\Models\Player;
use App\Models\User;
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
        $data = $request->validate(['count' => 'sometimes|integer|in:1,5']);
        $count = $data['count'] ?? 1;
        $total = $pack->price * $count;

        return DB::transaction(function () use ($request, $pack, $count, $total) {
            $user = $request->user()->lockForUpdate()->find($request->user()->id);

            if ($user->coins < $total) {
                return response()->json(['message' => 'Not enough coins.'], 422);
            }

            try {
                $draws = self::performDraws($user, $pack, $count, $pack->price);
            } catch (\RuntimeException $e) {
                return response()->json(['message' => $e->getMessage()], 422);
            }

            $user->decrement('coins', $total);
            $user->refresh();

            CoinTransaction::create([
                'user_id' => $user->id, 'type' => 'gacha_spend',
                'amount' => -$total, 'balance_after' => $user->coins,
                'description' => $count > 1 ? "Gacha {$pack->name} x{$count}" : "Gacha {$pack->name}",
            ]);

            if ($count === 1) {
                return response()->json(array_merge($draws[0], ['coins' => $user->coins]));
            }

            return response()->json([
                'players' => array_map(fn ($d) => array_merge($d['player']->toArray(), [
                    'rank_rolled' => $d['rank_rolled'], 'result_id' => $d['result_id'],
                ]), $draws),
                'count' => $count, 'total_paid' => $total, 'coins' => $user->coins,
            ]);
        });
    }

    /**
     * Inti draw gacha yang reusable: dipakai draw berbayar maupun hadiah
     * event (gratis, price_paid = 0). Wajib dipanggil di dalam transaksi DB.
     *
     * @return array<int, array{player: Player, rank_rolled: string, result_id: int}>
     *
     * @throws \RuntimeException bila pool/rates/candidates kosong.
     */
    public static function performDraws(User $user, GachaPack $pack, int $count, int $pricePaid = 0): array
    {
        $allowed = $pack->allowed_ranks;
        if (empty($allowed)) {
            // Fallback pack lama sebelum kolom allowed_ranks ada.
            $allowed = $pack->slug === 'potw' ? ['potw'] : ['bronze', 'silver', 'gold', 'diamond'];
        }
        $rankAllowed = array_values(array_diff($allowed, ['potw', 'flashback', 'halloween', 'ucl', 'uel', 'uecl']));

        // Pool = pemain aktif gacha + visible yang rank-nya diizinkan pack
        // (rank biasa mengecualikan pemain POTW, Flashback, Halloween & UEFA;
        //  'potw'/'flashback'/'halloween'/'ucl'/'uel'/'uecl' = pemain berstatus tersebut).
        $pool = Player::where('is_active_in_gacha', true)
            ->where('is_visible', true)
            ->where(function ($q) use ($allowed, $rankAllowed) {
                if (! empty($rankAllowed)) {
                    $q->where(fn ($w) => $w->whereIn('rank', $rankAllowed)->where('is_potw', false)->where('is_flashback', false)->where('is_halloween', false)->where('is_ucl', false)->where('is_uel', false)->where('is_uecl', false));
                }
                if (in_array('potw', $allowed, true)) {
                    $q->orWhere('is_potw', true);
                }
                if (in_array('flashback', $allowed, true)) {
                    $q->orWhere('is_flashback', true);
                }
                if (in_array('halloween', $allowed, true)) {
                    $q->orWhere('is_halloween', true);
                }
                if (in_array('ucl', $allowed, true)) {
                    $q->orWhere('is_ucl', true);
                }
                if (in_array('uel', $allowed, true)) {
                    $q->orWhere('is_uel', true);
                }
                if (in_array('uecl', $allowed, true)) {
                    $q->orWhere('is_uecl', true);
                }
            })->get();
        if ($pool->isEmpty()) {
            throw new \RuntimeException('Tidak ada pemain di pack ini.');
        }

        $counts = array_fill_keys(array_merge(GameService::RANKS, ['potw', 'flashback', 'halloween', 'ucl', 'uel', 'uecl']), 0);
        foreach ($pool as $p) {
            $counts[GameService::rankFor($p)]++;
        }
        $counts['potw'] = $pool->where('is_potw', true)->count();
        $counts['flashback'] = $pool->where('is_flashback', true)->count();
        $counts['halloween'] = $pool->where('is_halloween', true)->count();
        $counts['ucl'] = $pool->where('is_ucl', true)->count();
        $counts['uel'] = $pool->where('is_uel', true)->count();
        $counts['uecl'] = $pool->where('is_uecl', true)->count();

        $draws = [];
        for ($i = 0; $i < $count; $i++) {
            $rolled = GameService::rollRank($pack->rates, $counts);
            if ($rolled === null) {
                throw new \RuntimeException('Rates pack ini kosong.');
            }
            if ($rolled === 'potw') {
                $candidates = $pool->where('is_potw', true)->values();
            } elseif ($rolled === 'flashback') {
                $candidates = $pool->where('is_flashback', true)->values();
            } elseif ($rolled === 'halloween') {
                $candidates = $pool->where('is_halloween', true)->values();
            } elseif ($rolled === 'ucl') {
                $candidates = $pool->where('is_ucl', true)->values();
            } elseif ($rolled === 'uel') {
                $candidates = $pool->where('is_uel', true)->values();
            } elseif ($rolled === 'uecl') {
                $candidates = $pool->where('is_uecl', true)->values();
            } else {
                $candidates = $pool->filter(fn ($p) => ! $p->is_potw && ! $p->is_flashback && ! $p->is_halloween && ! $p->is_ucl && ! $p->is_uel && ! $p->is_uecl && GameService::rankFor($p) === $rolled)->values();
            }
            if ($candidates->isEmpty()) {
                throw new \RuntimeException("Tidak ada pemain {$rolled} di pack ini.");
            }
            $player = $candidates->random();

            UserPlayer::firstOrCreate(
                ['user_id' => $user->id, 'player_id' => $player->id],
                ['acquired_via' => 'gacha']
            );

            $result = GachaResult::create([
                'user_id' => $user->id, 'pack_id' => $pack->id, 'player_id' => $player->id,
                'player_name' => $player->name, 'ovr' => $player->fresh()->ovr,
                'rank_rolled' => $rolled, 'price_paid' => $pricePaid,
            ]);

            $draws[] = [
                'player' => $player->fresh(), 'rank_rolled' => $rolled,
                'result_id' => $result->id,
            ];
        }

        return $draws;
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
