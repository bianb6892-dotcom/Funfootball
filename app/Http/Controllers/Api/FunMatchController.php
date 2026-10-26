<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FootballMatch;
use App\Models\FunCategory;
use App\Models\FunLeague;
use App\Models\FunTeam;
use App\Models\Lineup;
use App\Services\GameService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FunMatchController extends Controller
{
    // ---------- USER ----------

    /** Daftar tim fun aktif + level kesulitan (modifier OVR CPU). */
    public function index()
    {
        $categories = FunCategory::with([
            'leagues' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')->orderBy('name'),
            'teams' => fn ($q) => $q->where('is_active', true)->with(['slots.player', 'category', 'league'])->orderBy('name'),
        ])
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $uncategorized = FunTeam::with(['slots.player', 'category', 'league'])
            ->where('is_active', true)
            ->whereNull('fun_category_id')
            ->orderBy('name')
            ->get();

        $allTeams = $uncategorized->concat($categories->flatMap->teams);

        return response()->json([
            'difficulties' => GameService::FUN_DIFFICULTIES,
            'formations' => GameService::FORMATIONS,
            'categories' => $categories->map(fn ($category) => $this->presentCategory($category))->values(),
            'uncategorized' => $uncategorized->map(fn ($t) => $this->present($t))->values(),
            'data' => $allTeams->map(fn ($t) => $this->present($t))->values(),
        ]);
    }

    /** Susun satu benua menjadi liga-liga + tim nasional (tanpa liga). */
    private function presentCategory(FunCategory $category): array
    {
        $teams = $category->teams;
        $activeLeagueIds = $category->leagues->pluck('id')->all();
        $byLeague = $teams->whereIn('fun_league_id', $activeLeagueIds)->groupBy('fun_league_id');

        $leagues = $category->leagues->map(fn ($league) => [
            'id' => $league->id,
            'name' => $league->name,
            'sort_order' => $league->sort_order,
            'teams' => $byLeague->get($league->id, collect())
                ->map(fn ($t) => $this->present($t))->values(),
        ])->values();

        $nationalTeams = $teams->whereNull('fun_league_id')
            ->map(fn ($t) => $this->present($t))->values();

        return [
            'id' => $category->id,
            'name' => $category->name,
            'icon' => $category->icon,
            'sort_order' => $category->sort_order,
            'leagues' => $leagues,
            'national_teams' => $nationalTeams,
            'teams_count' => $teams->count(),
        ];
    }

    /** Main melawan tim fun: XI user (wajib 11 tersimpan) vs XI tim + modifier kesulitan. */
    public function play(Request $request, FunTeam $funTeam)
    {
        $data = $request->validate([
            'difficulty' => 'required|in:mudah,sedang,sulit,legenda',
        ]);
        if (! $funTeam->is_active) {
            return response()->json(['message' => 'Tim fun ini sedang nonaktif.'], 422);
        }

        $lineup = Lineup::with('slots.player')->where('user_id', $request->user()->id)->first();
        $filled = $lineup
            ? $lineup->slots->where('is_bench', false)->filter(fn ($s) => $s->player)->count()
            : 0;
        if (! $lineup || $filled < 11) {
            return response()->json(['message' => 'Starting XI-mu belum lengkap (butuh 11 tersimpan).'], 422);
        }

        $funTeam->load('slots.player');
        $cpu = $this->buildCpu($funTeam);
        if ($cpu['filled'] < 11) {
            return response()->json(['message' => 'Lineup tim fun belum lengkap (butuh 11).'], 422);
        }

        // Hitung ulang SEMUA di server — nilai frontend tidak dipercaya.
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
        $userOvr = $strength['ovr'];

        $modifier = GameService::FUN_DIFFICULTIES[$data['difficulty']]['modifier'];
        $cpuOvr = max(40, min(99, $cpu['ovr'] + $modifier));

        $sim = GameService::simulateMatchDetail($userOvr, $cpuOvr,
            array_map(fn ($p) => ['name' => $p['name'], 'pos' => $p['pos']], $names),
            array_map(fn ($p) => ['name' => $p['name'], 'pos' => $p['pos']], $cpu['xi']));
        $result = $sim['winner'] === 'A' ? 'challenger_win' : ($sim['winner'] === 'B' ? 'opponent_win' : 'draw');

        // Fun match = latihan, tanpa hadiah pack.
        $match = FootballMatch::create([
            'challenger_id' => $request->user()->id,
            'opponent_id' => null,
            'fun_team_id' => $funTeam->id,
            'difficulty' => $data['difficulty'],
            'challenger_ovr' => $userOvr, 'opponent_ovr' => $cpuOvr,
            'challenger_score' => $sim['a'], 'opponent_score' => $sim['b'],
            'result' => $result,
            'snapshot' => [
                'challenger' => [
                    'ovr' => $userOvr, 'base_ovr' => $userOvr,
                    'raw_ovr' => $strength['base'],
                    'chemistry' => $strength['chemistry']['points'],
                    'chemistry_bonus' => $strength['bonus'],
                    'xi' => $names, 'formation' => $lineup->formation,
                ],
                'opponent' => [
                    'ovr' => $cpuOvr, 'base_ovr' => $cpu['ovr'],
                    'raw_ovr' => $cpu['base'],
                    'chemistry' => $cpu['chemistry']['points'],
                    'chemistry_bonus' => $cpu['chemistry']['bonus'],
                    'xi' => $cpu['xi'], 'formation' => $funTeam->formation,
                ],
                'fun_team' => ['id' => $funTeam->id, 'name' => $funTeam->name, 'short_name' => $funTeam->short_name],
                'difficulty' => $data['difficulty'],
                'difficulty_label' => GameService::FUN_DIFFICULTIES[$data['difficulty']]['label'],
                'modifier' => $modifier,
                'details' => [
                    'events' => $sim['events'], 'stats' => $sim['stats'],
                    'ratings' => $sim['ratings'], 'motm' => $sim['motm'],
                ],
            ],
        ]);

        return response()->json($match, 201);
    }

    // ---------- ADMIN ----------

    public function adminIndex()
    {
        $teams = FunTeam::with(['slots.player', 'category', 'league'])->orderBy('name')->get();

        return response()->json($teams->map(fn ($t) => $this->present($t))->values());
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $team = DB::transaction(function () use ($data) {
            $team = FunTeam::create([
                'name' => $data['name'], 'short_name' => $data['short_name'] ?? null,
                'fun_category_id' => $data['fun_category_id'],
                'fun_league_id' => $data['fun_league_id'] ?? null,
                'formation' => $data['formation'], 'is_active' => $data['is_active'] ?? true,
            ]);
            foreach ($data['starters'] as $s) {
                $slot = collect(GameService::FORMATIONS[$data['formation']])->firstWhere('id', $s['slot_id']);
                $team->slots()->create([
                    'slot_id' => $s['slot_id'], 'slot_position' => $slot['pos'],
                    'player_id' => $s['player_id'],
                ]);
            }

            return $team->load(['slots.player', 'category', 'league']);
        });

        return response()->json($this->present($team), 201);
    }

    public function update(Request $request, FunTeam $funTeam)
    {
        $data = $this->validated($request);
        $team = DB::transaction(function () use ($funTeam, $data) {
            $funTeam->update([
                'name' => $data['name'], 'short_name' => $data['short_name'] ?? null,
                'fun_category_id' => $data['fun_category_id'],
                'fun_league_id' => $data['fun_league_id'] ?? null,
                'formation' => $data['formation'],
                'is_active' => $data['is_active'] ?? $funTeam->is_active,
            ]);
            $funTeam->slots()->delete();
            foreach ($data['starters'] as $s) {
                $slot = collect(GameService::FORMATIONS[$data['formation']])->firstWhere('id', $s['slot_id']);
                $funTeam->slots()->create([
                    'slot_id' => $s['slot_id'], 'slot_position' => $slot['pos'],
                    'player_id' => $s['player_id'],
                ]);
            }

            return $funTeam->load(['slots.player', 'category', 'league']);
        });

        return response()->json($this->present($team));
    }

    public function destroy(FunTeam $funTeam)
    {
        $funTeam->delete();

        return response()->json(['message' => "Tim fun \"{$funTeam->name}\" dihapus. Riwayat laga yang sudah dimainkan tetap tersimpan."]);
    }

    public function toggleActive(FunTeam $funTeam)
    {
        $funTeam->update(['is_active' => ! $funTeam->is_active]);

        return response()->json($this->present($funTeam->load(['slots.player', 'category', 'league'])));
    }

    /** Pindahkan/keluarkan tim dari kategori tanpa menyentuh lineup XI. */
    public function assignCategory(Request $request, FunTeam $funTeam)
    {
        $data = $request->validate([
            'fun_category_id' => 'nullable|integer|exists:fun_categories,id',
            'fun_league_id' => 'nullable|integer|exists:fun_leagues,id',
        ]);

        $categoryId = $data['fun_category_id'] ?? null;
        $leagueId = $data['fun_league_id'] ?? null;

        if ($leagueId !== null) {
            $league = FunLeague::find($leagueId);
            if (! $categoryId || $league->fun_category_id !== (int) $categoryId) {
                abort(response()->json(['message' => 'Liga yang dipilih bukan bagian dari benua tersebut.'], 422));
            }
        }

        $funTeam->update([
            'fun_category_id' => $categoryId,
            'fun_league_id' => $categoryId ? $leagueId : null,
        ]);

        return response()->json($this->present($funTeam->load(['slots.player', 'category', 'league'])));
    }

    // ---------- SHARED ----------

    private function validated(Request $request): array
    {
        $formations = implode(',', array_keys(GameService::FORMATIONS));

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'short_name' => 'nullable|string|max:12',
            'fun_category_id' => 'required|integer|exists:fun_categories,id',
            'fun_league_id' => 'nullable|integer|exists:fun_leagues,id',
            'formation' => "required|in:{$formations}",
            'is_active' => 'sometimes|boolean',
            'starters' => 'required|array|size:11',
            'starters.*.slot_id' => 'required|string',
            'starters.*.player_id' => 'required|integer|exists:players,id',
        ]);

        if (! empty($data['fun_league_id'])) {
            $league = FunLeague::find($data['fun_league_id']);
            if (! $league || $league->fun_category_id !== (int) $data['fun_category_id']) {
                abort(response()->json(['message' => 'Liga yang dipilih bukan bagian dari benua tersebut.'], 422));
            }
        }

        // Slot harus pas 11 slot formasi (tanpa duplikat) & pemain tidak ganda.
        $slotIds = collect(GameService::FORMATIONS[$data['formation']])->pluck('id')->all();
        $givenSlots = collect($data['starters'])->pluck('slot_id')->all();
        $givenPlayers = collect($data['starters'])->pluck('player_id')->all();
        if (count($givenSlots) !== count(array_unique($givenSlots))
            || count(array_diff($givenSlots, $slotIds)) > 0
            || count($givenSlots) !== count($slotIds)) {
            abort(response()->json(['message' => 'Starters harus mengisi tepat 11 slot formasi (tanpa duplikat).'], 422));
        }
        if (count($givenPlayers) !== count(array_unique($givenPlayers))) {
            abort(response()->json(['message' => 'Pemain tidak boleh ganda dalam satu tim.'], 422));
        }

        return $data;
    }

    /** @return array{ovr:int,base:int,chemistry:array,filled:int,xi:array} */
    private function buildCpu(FunTeam $team): array
    {
        $adj = [];
        $xi = [];
        $players = [];
        foreach ($team->slots as $slot) {
            if (! $slot->player) {
                continue;
            }
            $a = GameService::adjustedOvr($slot->player, $slot->slot_position, $slot->slot_id);
            $adj[] = $a['ovr'];
            $xi[] = ['name' => $slot->player->name, 'pos' => $slot->slot_id, 'ovr' => $a['ovr']];
            $players[] = $slot->player;
        }
        $strength = GameService::teamStrength($adj, $players);

        return [
            'ovr' => $strength['ovr'], 'base' => $strength['base'],
            'chemistry' => $strength['chemistry'], 'filled' => count($xi), 'xi' => $xi,
        ];
    }

    private function present(FunTeam $team): array
    {
        $cpu = $this->buildCpu($team);
        $penaltyTotal = 0;
        $starters = [];
        $index = 0;
        foreach ($team->slots as $slot) {
            if (! $slot->player) {
                continue;
            }
            $adj = GameService::adjustedOvr($slot->player, $slot->slot_position, $slot->slot_id);
            $penaltyTotal += abs($adj['penalty']);
            $starters[] = [
                'slot_id' => $slot->slot_id, 'slot_position' => $slot->slot_position,
                'player' => $slot->player, 'adjusted_ovr' => $adj['ovr'],
                'penalty' => $adj['penalty'], 'compat' => $adj['compat'],
                'chemistry' => $cpu['chemistry']['per_player'][$index] ?? 0,
            ];
            $index++;
        }

        return [
            'id' => $team->id, 'name' => $team->name, 'short_name' => $team->short_name,
            'fun_category_id' => $team->fun_category_id,
            'fun_league_id' => $team->fun_league_id,
            'category' => $team->category?->only(['id', 'name']),
            'league' => $team->league?->only(['id', 'name']),
            'type' => $team->fun_league_id ? 'league' : 'national',
            'formation' => $team->formation, 'is_active' => (bool) $team->is_active,
            'team_ovr' => $cpu['ovr'], 'base_team_ovr' => $cpu['base'],
            'chemistry' => $cpu['chemistry']['points'],
            'chemistry_possible' => $cpu['chemistry']['possible'],
            'chemistry_bonus' => $cpu['chemistry']['bonus'],
            'chemistry_links' => [
                'club' => $cpu['chemistry']['club_links'],
                'nation' => $cpu['chemistry']['nation_links'],
            ],
            'filled' => $cpu['filled'],
            'penalty_total' => $penaltyTotal, 'starters' => $starters,
            'created_at' => $team->created_at, 'updated_at' => $team->updated_at,
        ];
    }
}
