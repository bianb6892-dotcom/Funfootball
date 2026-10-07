<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CoinTransaction;
use App\Models\FootballMatch;
use App\Models\GachaPack;
use App\Models\GachaResult;
use App\Models\Player;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    public function dashboard()
    {
        return response()->json([
            'total_users' => User::where('role', 'user')->count(),
            'total_players' => Player::count(),
            'total_gacha' => GachaResult::count(),
            'total_matches' => FootballMatch::count(),
            'coins_distributed' => (int) CoinTransaction::sum('amount'),
            'top_players' => Player::orderByDesc('ovr')->limit(5)->get(),
            'recent_users' => User::latest()->limit(5)->get(),
            'recent_matches' => FootballMatch::latest('played_at')->limit(5)->get(),
            'recent_gacha' => GachaResult::with(['pack', 'player'])->latest()->limit(5)->get(),
        ]);
    }

    public function users(Request $request)
    {
        return response()->json(
            User::when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%"))
                ->withCount(['userPlayers'])
                ->paginate(15)
        );
    }

    public function userDetail(User $user)
    {
        $user->loadCount(['userPlayers']);

        return response()->json([
            'user' => $user,
            'matches' => FootballMatch::where('challenger_id', $user->id)
                ->orWhere('opponent_id', $user->id)->latest('played_at')->limit(10)->get(),
            'coins_history' => CoinTransaction::where('user_id', $user->id)->latest()->limit(20)->get(),
        ]);
    }

    public function adjustCoins(Request $request, User $user)
    {
        $data = $request->validate([
            'amount' => 'required|integer|min:-100000|max:100000',
            'description' => 'nullable|string|max:255',
        ]);

        $result = DB::transaction(function () use ($request, $user, $data) {
            $user->lockForUpdate()->find($user->id);
            $user->refresh();
            $new = max(0, $user->coins + $data['amount']);
            $user->update(['coins' => $new]);

            $tx = CoinTransaction::create([
                'user_id' => $user->id, 'admin_id' => $request->user()->id,
                'type' => 'admin_adjust', 'amount' => $data['amount'],
                'balance_after' => $new, 'description' => $data['description'] ?? 'Admin adjustment',
            ]);

            return ['user' => $user->fresh(), 'transaction' => $tx];
        });

        return response()->json($result);
    }

    public function toggleUser(User $user)
    {
        $user->update(['is_active' => ! $user->is_active]);

        return response()->json($user->fresh());
    }

    public function matches()
    {
        return response()->json(FootballMatch::latest('played_at')->paginate(15));
    }

    public function updatePack(Request $request, GachaPack $pack)
    {
        $data = $request->validate([
            'price' => 'sometimes|integer|min:0',
            'rates' => 'sometimes|array',
            'rates.bronze' => 'integer|min:0|max:100',
            'rates.silver' => 'integer|min:0|max:100',
            'rates.gold' => 'integer|min:0|max:100',
            'rates.diamond' => 'integer|min:0|max:100',
            'is_active' => 'sometimes|boolean',
        ]);
        $pack->update($data);

        return response()->json($pack->fresh());
    }

    public function togglePool(Player $player)
    {
        $player->update(['is_active_in_gacha' => ! $player->is_active_in_gacha]);

        return response()->json($player->fresh());
    }
}
