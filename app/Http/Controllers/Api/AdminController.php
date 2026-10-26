<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CoinTransaction;
use App\Models\Event;
use App\Models\FootballMatch;
use App\Models\GachaPack;
use App\Models\GachaResult;
use App\Models\Player;
use App\Models\TokenTransaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;

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
            'tokens_history' => TokenTransaction::where('user_id', $user->id)->latest()->limit(20)->get(),
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

    public function adjustTokens(Request $request, User $user)
    {
        $data = $request->validate([
            'amount' => 'required|integer|min:-100000|max:100000',
            'description' => 'nullable|string|max:255',
        ]);

        $result = DB::transaction(function () use ($request, $user, $data) {
            $user->lockForUpdate()->find($user->id);
            $user->refresh();
            $new = max(0, (int) $user->event_tokens + $data['amount']);
            $user->update(['event_tokens' => $new]);

            $tx = TokenTransaction::create([
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
        $data = $this->validatePack($request);
        unset($data['banner'], $data['remove_banner']);
        if ($request->hasFile('banner')) {
            $stored = $this->storeBanner($request);
            if ($stored) {
                if ($pack->banner_path) {
                    Storage::disk('public')->delete($pack->banner_path);
                }
                $data['banner_path'] = $stored;
            }
        } elseif ($request->boolean('remove_banner') && $pack->banner_path) {
            Storage::disk('public')->delete($pack->banner_path);
            $data['banner_path'] = null;
        }
        $pack->update($data);

        return response()->json($pack->fresh());
    }

    public function storePack(Request $request)
    {
        $data = $this->validatePack($request, true);
        unset($data['banner']);
        $data['slug'] = $this->uniqueSlug($data['name']);
        if ($request->hasFile('banner')) {
            $data['banner_path'] = $this->storeBanner($request);
        }
        $pack = GachaPack::create($data);

        return response()->json($pack->fresh(), 201);
    }

    public function destroyPack(GachaPack $pack)
    {
        if (GachaResult::where('pack_id', $pack->id)->exists()) {
            return response()->json(['message' => 'Pack tidak bisa dihapus karena sudah ada riwayat gacha. Nonaktifkan saja.'], 422);
        }
        DB::transaction(function () use ($pack) {
            if ($pack->banner_path) {
                Storage::disk('public')->delete($pack->banner_path);
            }
            $pack->delete();
        });

        return response()->json(['message' => "Pack {$pack->name} dihapus."]);
    }

    /** Validasi pack: rates 0–100, rank berbobot harus termasuk kartu isi pack. */
    private function validatePack(Request $request, bool $creating = false): array
    {
        $data = $request->validate([
            'name' => ($creating ? 'required' : 'sometimes').'|string|max:100',
            'price' => 'sometimes|integer|min:0|max:1000000',
            'rates' => 'sometimes|array',
            'rates.bronze' => 'integer|min:0|max:100',
            'rates.silver' => 'integer|min:0|max:100',
            'rates.gold' => 'integer|min:0|max:100',
            'rates.diamond' => 'integer|min:0|max:100',
            'rates.legend' => 'integer|min:0|max:100',
            'rates.potw' => 'integer|min:0|max:100',
            'rates.flashback' => 'integer|min:0|max:100',
            'rates.halloween' => 'integer|min:0|max:100',
            'rates.ucl' => 'integer|min:0|max:100',
            'rates.uel' => 'integer|min:0|max:100',
            'rates.uecl' => 'integer|min:0|max:100',
            'allowed_ranks' => 'sometimes|array|min:1',
            'allowed_ranks.*' => 'in:bronze,silver,gold,diamond,legend,potw,flashback,halloween,ucl,uel,uecl',
            'is_active' => 'sometimes|boolean',
            'banner' => 'sometimes|image|mimes:jpg,jpeg,png,webp|max:5120',
            'remove_banner' => 'sometimes|boolean',
        ]);

        $allowed = $data['allowed_ranks'] ?? null;
        $rates = $data['rates'] ?? null;
        if ($allowed !== null && $rates !== null) {
            foreach ($rates as $rank => $weight) {
                if ($weight > 0 && ! in_array($rank, $allowed, true)) {
                    abort(response()->json([
                        'message' => "Rate {$rank} berbobot tapi {$rank} tidak ada di kartu isi pack.",
                    ], 422));
                }
            }
            if (array_sum($rates) <= 0) {
                abort(response()->json(['message' => 'Minimal satu rate harus lebih dari 0.'], 422));
            }
        }

        return $data;
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'pack';
        $slug = $base;
        $i = 2;
        while (GachaPack::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    /** Banner pack: resize maks 1200px + WebP q80. Gagal → null (tanpa banner). */
    private function storeBanner(Request $request): ?string
    {
        try {
            $manager = new ImageManager(new Driver);
            $image = $manager->decode($request->file('banner')->getRealPath());
            $image->scaleDown(width: 1200);
            $encoded = $image->encode(new WebpEncoder(quality: 80));
            $path = 'packs/'.uniqid('banner_', true).'.webp';
            Storage::disk('public')->put($path, (string) $encoded);

            return $path;
        } catch (\Throwable $e) {
            report($e);

            return null;
        }
    }

    /** Aktif/nonaktif event tanpa buka form edit. */
    public function toggleEventActive(Event $event)
    {
        $event->update(['is_active' => ! $event->is_active]);

        return response()->json($event->fresh()->load(['slots.player', 'rules', 'rewardPlayer', 'rewardPack:id,name,slug']));
    }

    public function togglePool(Player $player)
    {
        $player->update(['is_active_in_gacha' => ! $player->is_active_in_gacha]);

        return response()->json($player->fresh());
    }

    /** View ON/OFF: tampil/sembunyikan kartu dari daftar pemain user. */
    public function toggleVisibility(Player $player)
    {
        $player->update(['is_visible' => ! $player->is_visible]);

        return response()->json($player->fresh());
    }

    public function togglePotw(Player $player)
    {
        $player->update(['is_potw' => ! $player->is_potw]);

        return response()->json($player->fresh());
    }
}
