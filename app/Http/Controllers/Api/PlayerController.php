<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GachaResult;
use App\Models\Player;
use App\Services\GameService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;

class PlayerController extends Controller
{
    public function index(Request $request)
    {
        $query = Player::query()
            // Kartu yang disembunyikan admin (View OFF) tidak tampil di daftar user.
            // Admin tetap melihat semua agar bisa mengelola + mengaktifkan kembali.
            ->when(! $request->user()->isAdmin(), fn ($q) => $q->where('is_visible', true))
            ->when($request->position, function ($q) use ($request) {
                $pos = strtoupper(trim($request->position));
                // Filter grup lini (DF/MF/FW) mencakup posisi detail + data lama
                // + posisi alternatif (Mbappe ST + alt LW ikut muncul di filter LW/FW).
                if (isset(GameService::GROUP_MEMBERS[$pos])) {
                    $members = GameService::GROUP_MEMBERS[$pos];
                    $q->where(function ($w) use ($members) {
                        $w->whereIn('position', $members);
                        // orWhereJsonContains hanya didukung MySQL/MariaDB — SQLite (tests) dilewati.
                        if (DB::getDriverName() === 'mysql') {
                            foreach ($members as $m) {
                                $w->orWhereJsonContains('alt_positions', $m);
                            }
                        }
                    });
                } else {
                    $q->where(function ($w) use ($request, $pos) {
                        $w->where('position', $request->position);
                        if (DB::getDriverName() === 'mysql') {
                            $w->orWhereJsonContains('alt_positions', $pos);
                        }
                    });
                }
            })
            ->when($request->rank, fn ($q) => $q->where('rank', $request->rank))
            ->when($request->category, function ($q) use ($request) {
                // Kategori kartu: basic = kartu reguler tanpa legend, POTW, flashback, Halloween & UEFA,
                // legend = hanya kartu Legend, potw = hanya Player of the Week,
                // flashback = hanya kartu Flashback, halloween = hanya kartu Halloween,
                // ucl/uel/uecl = masing-masing kartu UEFA,
                // uefa = gabungan UCL + UEL + UECL, all/kosong = tanpa batasan.
                $cat = strtolower(trim($request->category));
                if ($cat === 'basic') {
                    $q->where('is_potw', false)->where('is_flashback', false)->where('is_halloween', false)->where('is_ucl', false)->where('is_uel', false)->where('is_uecl', false)->where('rank', '!=', 'legend');
                } elseif ($cat === 'legend') {
                    $q->where('is_potw', false)->where('is_flashback', false)->where('is_halloween', false)->where('is_ucl', false)->where('is_uel', false)->where('is_uecl', false)->where('rank', 'legend');
                } elseif ($cat === 'potw') {
                    $q->where('is_potw', true);
                } elseif ($cat === 'flashback') {
                    $q->where('is_flashback', true);
                } elseif ($cat === 'halloween') {
                    $q->where('is_halloween', true);
                } elseif ($cat === 'ucl') {
                    $q->where('is_ucl', true);
                } elseif ($cat === 'uel') {
                    $q->where('is_uel', true);
                } elseif ($cat === 'uecl') {
                    $q->where('is_uecl', true);
                } elseif ($cat === 'uefa') {
                    $q->where(fn ($w) => $w->where('is_ucl', true)->orWhere('is_uel', true)->orWhere('is_uecl', true));
                }
            })
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

    public function show(Request $request, Player $player)
    {
        abort_unless($player->is_visible || $request->user()->isAdmin(), 404);

        return response()->json($player);
    }

    public function compare(Request $request)
    {
        $data = $request->validate(['ids' => 'required|array|size:2', 'ids.*' => 'exists:players,id']);
        $players = Player::whereIn('id', $data['ids'])
            ->when(! $request->user()->isAdmin(), fn ($q) => $q->where('is_visible', true))
            ->get()
            ->sortBy(fn ($p) => array_search($p->id, $data['ids']))
            ->values();

        abort_unless($players->count() === 2, 404);

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
        if ($image = $this->storeImage($request)) {
            $data['image_path'] = $image;
        }
        $player = Player::create($data);

        return response()->json($player, 201);
    }

    public function update(Request $request, Player $player)
    {
        $data = $this->validated($request);
        if ($image = $this->storeImage($request)) {
            $oldImage = $player->image_path;
            $data['image_path'] = $image;
            if ($oldImage && $oldImage !== $image) {
                Storage::disk('public')->delete($oldImage);
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
        // FormData admin mengirim alt_positions sebagai JSON string / array —
        // normalisasi dulu agar lolos rule `array`.
        if ($request->has('alt_positions') && is_string($request->input('alt_positions'))) {
            $decoded = json_decode($request->input('alt_positions'), true);
            $request->merge(['alt_positions' => is_array($decoded)
                ? $decoded
                : preg_split('/[\s,;|]+/', (string) $request->input('alt_positions'), -1, PREG_SPLIT_NO_EMPTY)]);
        }
        $allowed = implode(',', GameService::POSITIONS);
        // Semua posisi outfield (detail + legacy) wajib punya 6 stat umum.
        $outfield = 'LB,CB,RB,LM,CM,CDM,CAM,RM,LW,ST,SS,RW,DF,MF,FW';
        $rules = [
            'name' => 'required|string|max:255',
            'club' => 'required|string|max:255',
            'nationality' => 'nullable|string|max:255',
            'country_code' => 'nullable|string|max:8',
            'position' => "required|in:{$allowed}",
            'alt_positions' => 'sometimes|nullable|array|max:3',
            'alt_positions.*' => 'string|in:'.implode(',', GameService::SELECTABLE_POSITIONS),
            'preferred_foot' => 'sometimes|in:left,right,both',
            'shirt_number' => 'required|integer|min:1|max:99',
            'age' => 'required|integer|min:15|max:50',
            'pac' => "required_if:position,{$outfield}|nullable|integer|min:30|max:99",
            'sho' => "required_if:position,{$outfield}|nullable|integer|min:30|max:99",
            'pas' => "required_if:position,{$outfield}|nullable|integer|min:30|max:99",
            'dri' => "required_if:position,{$outfield}|nullable|integer|min:30|max:99",
            'def' => "required_if:position,{$outfield}|nullable|integer|min:30|max:99",
            'phy' => "required_if:position,{$outfield}|nullable|integer|min:30|max:99",
            'div' => 'required_if:position,GK|nullable|integer|min:30|max:99',
            'han' => 'required_if:position,GK|nullable|integer|min:30|max:99',
            'kic' => 'required_if:position,GK|nullable|integer|min:30|max:99',
            'ref' => 'required_if:position,GK|nullable|integer|min:30|max:99',
            'spd' => 'required_if:position,GK|nullable|integer|min:30|max:99',
            'pos' => 'required_if:position,GK|nullable|integer|min:30|max:99',
            'rank' => 'nullable|in:bronze,silver,gold,diamond,legend',
            'is_potw' => 'sometimes|boolean',
            'is_flashback' => 'sometimes|boolean',
            'is_halloween' => 'sometimes|boolean',
            'is_ucl' => 'sometimes|boolean',
            'is_uel' => 'sometimes|boolean',
            'is_uecl' => 'sometimes|boolean',
            'is_visible' => 'sometimes|boolean',
            'is_active_in_gacha' => 'sometimes|boolean',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ];
        foreach (GameService::DETAILED_ATTRIBUTE_KEYS as $key) {
            $rules[$key] = 'sometimes|nullable|integer|min:30|max:99';
        }
        $data = $request->validate($rules);

        // OVR/rank manual dari frontend DIABAIKAN — dihitung ulang di model via GameService.
        unset($data['image']);
        // Normalisasi posisi alternatif (unik, tanpa posisi utama, GK tidak campur outfield).
        $data['alt_positions'] = GameService::normalizeAltPositions(
            $data['alt_positions'] ?? [], $data['position'] ?? 'MF'
        );
        if (empty($data['preferred_foot'])) {
            $data['preferred_foot'] = 'right';
        }
        if (! empty($data['country_code'])) {
            $data['country_code'] = strtoupper($data['country_code']);
        }
        $data['manual_rank'] = ! empty($data['rank']);
        if (empty($data['rank'])) {
            unset($data['rank']);
        }

        // Kunci set stat yang tidak relevan agar data konsisten (GK ↔ outfield).
        $isGk = GameService::baseGroup($data['position'] ?? 'MF') === 'GK';
        foreach ($isGk ? GameService::OUTFIELD_KEYS : GameService::GK_KEYS as $key) {
            $data[$key] = 0;
        }

        return $data;
    }

    /**
     * Simpan foto utama (foto penuh dipakai di kartu, lineup, bench, dan picker).
     * Kompresi otomatis: resize maks 1000px + WebP q88 agar tetap tajam namun ringan.
     * Bila kompresi gagal, fallback ke penyimpanan file asli agar upload tidak error.
     */
    private function storeImage(Request $request): ?string
    {
        if (! $request->hasFile('image')) {
            return null;
        }

        try {
            $manager = new ImageManager(new Driver);
            $image = $manager->decode($request->file('image')->getRealPath());
            $image->scaleDown(width: 1000);
            $encoded = $image->encode(new WebpEncoder(quality: 88));
            $path = 'players/'.uniqid('player_', true).'.webp';
            Storage::disk('public')->put($path, (string) $encoded);

            return $path;
        } catch (\Throwable $e) {
            report($e);

            return $request->file('image')->store('players', 'public');
        }
    }
}
