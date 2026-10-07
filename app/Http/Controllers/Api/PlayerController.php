<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GachaResult;
use App\Models\Player;
use App\Services\GameService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PlayerController extends Controller
{
    public function index(Request $request)
    {
        $query = Player::query()
            ->when($request->position, fn ($q) => $q->where('position', $request->position))
            ->when($request->rank, fn ($q) => $q->where('rank', $request->rank))
            ->when($request->search, fn ($q) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$request->search}%")
                ->orWhere('club', 'like', "%{$request->search}%")
                ->orWhere('nationality', 'like', "%{$request->search}%")));

        $sort = $request->get('sort', 'ovr-desc');
        match ($sort) {
            'ovr-asc' => $query->orderBy('ovr'),
            'name-asc' => $query->orderBy('name'),
            'number-asc' => $query->orderBy('shirt_number'),
            default => $query->orderByDesc('ovr'),
        };

        return response()->json($query->paginate($request->get('per_page', 24)));
    }

    public function show(Player $player)
    {
        return response()->json($player);
    }

    public function compare(Request $request)
    {
        $data = $request->validate(['ids' => 'required|array|size:2', 'ids.*' => 'exists:players,id']);
        $players = Player::whereIn('id', $data['ids'])->get()->sortBy(fn ($p) => array_search($p->id, $data['ids']))->values();

        $labels = [
            'pac' => 'PAC', 'sho' => 'SHO', 'pas' => 'PAS', 'dri' => 'DRI', 'def' => 'DEF', 'phy' => 'PHY',
            'div' => 'DIV', 'han' => 'HAN', 'kic' => 'KIC', 'ref' => 'REF', 'spd' => 'SPD', 'pos' => 'POS',
        ];
        $keysA = GameService::statKeysFor($players[0]->position);
        $keysB = GameService::statKeysFor($players[1]->position);
        $keys = array_values(array_unique(array_merge($keysA, $keysB)));

        $rows = [];
        foreach ($keys as $key) {
            $a = in_array($key, $keysA, true) ? (int) $players[0][$key] : null;
            $b = in_array($key, $keysB, true) ? (int) $players[1][$key] : null;
            $rows[] = [
                'key' => $key, 'label' => $labels[$key],
                'a' => $a, 'b' => $b,
                'winner' => ($a === null || $b === null) ? 0 : ($a <=> $b),
            ];
        }

        return response()->json([
            'players' => $players,
            'rows' => $rows,
            'mixed' => $keysA !== $keysB,
            'ovr' => ['a' => $players[0]->ovr, 'b' => $players[1]->ovr, 'winner' => $players[0]->ovr <=> $players[1]->ovr],
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $data['image_path'] = $this->storeImage($request);
        $player = Player::create($data);

        return response()->json($player, 201);
    }

    public function update(Request $request, Player $player)
    {
        $data = $this->validated($request);
        if ($image = $this->storeImage($request)) {
            $old = $player->image_path;
            $data['image_path'] = $image;
            if ($old && $old !== $image) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($old);
            }
        }
        $player->update($data);

        return response()->json($player->fresh());
    }

    public function destroy(Player $player)
    {
        $collections = $player->owners()->count();
        $history = GachaResult::where('player_id', $player->id)->count();

        DB::transaction(function () use ($player) {
            if ($player->image_path) {
                Storage::disk('public')->delete($player->image_path);
            }
            // user_players ikut terhapus (cascade), slot lineup jadi kosong (nullOnDelete),
            // riwayat gacha dipertahankan dengan player NULL + snapshot nama/OVR.
            $player->delete();
        });

        return response()->json([
            'message' => "Pemain dihapus (lepas dari {$collections} koleksi, {$history} riwayat gacha dipertahankan).",
            'removed_from_collections' => $collections,
            'kept_history' => $history,
        ]);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'club' => 'required|string|max:255',
            'nationality' => 'nullable|string|max:255',
            'country_code' => 'nullable|string|max:8',
            'position' => 'required|in:GK,DF,MF,FW',
            'shirt_number' => 'required|integer|min:1|max:99',
            'age' => 'required|integer|min:15|max:50',
            'pac' => 'required_if:position,DF,MF,FW|nullable|integer|min:30|max:99',
            'sho' => 'required_if:position,DF,MF,FW|nullable|integer|min:30|max:99',
            'pas' => 'required_if:position,DF,MF,FW|nullable|integer|min:30|max:99',
            'dri' => 'required_if:position,DF,MF,FW|nullable|integer|min:30|max:99',
            'def' => 'required_if:position,DF,MF,FW|nullable|integer|min:30|max:99',
            'phy' => 'required_if:position,DF,MF,FW|nullable|integer|min:30|max:99',
            'div' => 'required_if:position,GK|nullable|integer|min:30|max:99',
            'han' => 'required_if:position,GK|nullable|integer|min:30|max:99',
            'kic' => 'required_if:position,GK|nullable|integer|min:30|max:99',
            'ref' => 'required_if:position,GK|nullable|integer|min:30|max:99',
            'spd' => 'required_if:position,GK|nullable|integer|min:30|max:99',
            'pos' => 'required_if:position,GK|nullable|integer|min:30|max:99',
            'rank' => 'nullable|in:bronze,silver,gold,diamond',
            'is_active_in_gacha' => 'sometimes|boolean',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        // OVR/rank manual dari frontend DIABAIKAN — dihitung ulang di model via GameService.
        unset($data['image']);
        if (! empty($data['country_code'])) {
            $data['country_code'] = strtoupper($data['country_code']);
        }
        $data['manual_rank'] = ! empty($data['rank']);
        if (empty($data['rank'])) {
            unset($data['rank']);
        }

        // Kunci set stat yang tidak relevan agar data konsisten (GK ↔ outfield).
        $isGk = ($data['position'] ?? null) === 'GK';
        foreach ($isGk ? GameService::OUTFIELD_KEYS : GameService::GK_KEYS as $key) {
            $data[$key] = 0;
        }

        return $data;
    }

    private function storeImage(Request $request): ?string
    {
        if (! $request->hasFile('image')) {
            return null;
        }

        return $request->file('image')->store('players', 'public');
    }
}
