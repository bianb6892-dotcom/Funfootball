<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CoinTransaction;
use App\Models\Event;
use App\Models\EventAttempt;
use App\Models\EventRewardTier;
use App\Models\EventTierUnlock;
use App\Models\GachaPack;
use App\Models\Lineup;
use App\Models\Player;
use App\Models\UserPlayer;
use App\Services\GameService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EventController extends Controller
{
    // ================= USER =================

    /** Daftar event untuk user (live + upcoming + ended, terbaru dulu). */
    public function index(Request $request)
    {
        $now = now();
        $events = Event::with(['rewardPlayer:id,name,position,ovr,rank', 'rewardPack:id,name,slug', 'rules'])
            // Event yang dinonaktifkan admin disembunyikan dari daftar user.
            ->where('is_active', true)
            ->withCount(['slots', 'attempts', 'rewardTiers as tiers_count'])
            ->withMax('rewardTiers as max_tier', 'tier')
            ->orderByDesc('starts_at')
            ->paginate($request->get('per_page', 12));

        $events->getCollection()->transform(fn ($e) => $this->presentList($e, $request->user()->id, $now));

        return response()->json($events);
    }

    /** Detail satu event: XI admin, rules, hadiah, status + riwayat percobaanku. */
    public function show(Request $request, Event $event)
    {
        $event->load(['slots.player', 'rules', 'rewardPlayer', 'rewardPack:id,name,slug', 'rewardTiers.rewardPlayer:id,name,position,ovr', 'rewardTiers.rewardPack:id,name,slug', 'rewardTiers.tierSlots.player']);
        $now = now();
        $uid = $request->user()->id;

        $mine = EventAttempt::where('event_id', $event->id)
            ->where('user_id', $uid)
            ->latest('played_at')->limit(10)->get();
        $myWins = EventAttempt::where('event_id', $event->id)
            ->where('user_id', $uid)->where('result', 'user_win')->count();
        $myEntries = EventAttempt::where('event_id', $event->id)->where('user_id', $uid)->count();
        $claimedTiers = EventAttempt::where('event_id', $event->id)
            ->where('user_id', $uid)->where('reward_granted', true)->pluck('tier')->unique()->values();
        $rewardClaimed = $claimedTiers->isNotEmpty();
        $unlockedTiers = EventTierUnlock::where('event_id', $event->id)
            ->where('user_id', $uid)->pluck('tier')->unique()->values();
        $maxTier = $this->maxTierFor($event);
        $isCompleted = $myWins >= $maxTier;
        $currentTier = $isCompleted ? $maxTier : $myWins + 1;

        // Cek rules terhadap XI user saat ini (preview, agar user tahu sebelum challenge).
        $preview = $this->checkRulesAgainstUserLineup($event, $uid);

        $detail = $this->presentDetail($event, $now);
        // Tandai tiap tier untuk UI path ala Ballon d'Or: claimed / current / unlocked / locked.
        $detail['reward_tiers'] = collect($detail['reward_tiers'] ?? [])->map(function ($t) use ($claimedTiers, $unlockedTiers, $currentTier) {
            $t['is_claimed'] = $claimedTiers->contains($t['tier']);
            $t['is_current'] = (int) $t['tier'] === (int) $currentTier;
            $t['is_unlocked'] = $unlockedTiers->contains($t['tier']) || $t['is_claimed'];
            $t['node_state'] = $t['is_claimed'] ? 'claimed' : ($t['is_current'] ? ($t['is_unlocked'] ? 'current_free' : 'current_locked') : ((int) $t['tier'] < (int) $currentTier ? 'claimed' : 'locked'));

            return $t;
        })->values()->all();

        return response()->json(array_merge(
            $detail,
            [
                'my_attempts' => $mine,
                'my_attempts_count' => $myEntries,
                'my_entries' => $myEntries,
                'max_entries_per_user' => $event->max_entries_per_user,
                'entries_left' => $event->max_entries_per_user ? max(0, (int) $event->max_entries_per_user - $myEntries) : null,
                'my_wins' => $myWins,
                'current_tier' => $currentTier,
                'max_tier' => $maxTier,
                'is_completed' => $isCompleted,
                'claimed_tiers' => $claimedTiers,
                'unlocked_tiers' => $unlockedTiers,
                'current_unlocked' => $unlockedTiers->contains($currentTier),
                'reward_claimed' => $rewardClaimed,
                'rules_preview' => $preview,
                'tokens' => (int) $request->user()->event_tokens,
                'daily' => TokenController::dailyStatusFor($request->user()),
            ]
        ));
    }

    /**
     * Lawan XI event dengan XI user yang tersimpan.
     * Rules divalidasi server — gagal = 422, tidak bisa melanjutkan.
     * Batas masuk: max_entries_per_user (null = tanpa batas).
     * Hadiah bertingkat: kemenangan ke-N memperebutkan hadiah tier-N
     * (sekali klaim per tier); tiap tier bisa menaikkan OVR lawan (ovr_boost).
     * Tanpa tier terdefinisi → hadiah tunggal lama (kompatibilitas).
     */
    public function challenge(Request $request, Event $event)
    {
        $event->load(['slots.player', 'rules', 'rewardPlayer', 'rewardPack:id,name,slug', 'rewardTiers.rewardPlayer:id,name,position,ovr', 'rewardTiers.rewardPack:id,name,slug', 'rewardTiers.tierSlots.player']);
        $now = now();

        if (! $event->is_active) {
            return response()->json(['message' => 'Event ini sedang nonaktif.'], 422);
        }
        if ($now->lt($event->starts_at) || $now->gt($event->ends_at)) {
            return response()->json(['message' => 'Event sedang tidak berlangsung (di luar tanggal).'], 422);
        }

        // Tier saat ini = jumlah kemenangan + 1.
        $myWins = EventAttempt::where('event_id', $event->id)
            ->where('user_id', $request->user()->id)->where('result', 'user_win')->count();
        $tierNum = $myWins + 1;
        $maxTier = $this->maxTierFor($event);

        // Event selesai di tier terakhir yang didefinisikan (atau tier 1 untuk
        // event tanpa tier). Main di luar itu tidak memberi hadiah apa pun,
        // jadi ditolak sebelum lineup dicek & sebelum token dipotong.
        if ($tierNum > $maxTier) {
            return response()->json([
                'message' => 'Event sudah selesai — semua tier sudah dimainkan.',
                'event_finished' => true,
                'is_completed' => true,
            ], 422);
        }

        // Batas masuk event per user.
        $myEntries = EventAttempt::where('event_id', $event->id)->where('user_id', $request->user()->id)->count();
        if ($event->max_entries_per_user && $myEntries >= (int) $event->max_entries_per_user) {
            return response()->json(['message' => "Kesempatan masuk event ini habis ({$myEntries}/{$event->max_entries_per_user})."], 422);
        }

        $tierRow = $event->rewardTiers->firstWhere('tier', $tierNum);
        // Fallback hadiah tunggal lama bila admin belum menyusun tier.
        $legacy = ! $tierRow && $myWins === 0 ? [
            'reward_coins' => (int) $event->reward_coins,
            'reward_player_id' => $event->reward_player_id,
            'reward_pack_id' => $event->reward_pack_id,
            'reward_pack_draws' => (int) ($event->reward_pack_draws ?? 0),
            'reward_tokens' => (int) ($event->reward_tokens ?? 0),
            'ovr_boost' => 0,
        ] : null;
        $boost = (int) ($tierRow?->ovr_boost ?? 0);

        // Jenis tantangan tier ini: match (11v11) atau mini-game latihan.
        $challengeType = $tierRow?->challenge_type ?? 'match';
        if (! in_array($challengeType, EventRewardTier::CHALLENGE_TYPES, true)) {
            $challengeType = 'match';
        }
        // Biaya token = biaya unlock node (bayar sekali, retry gratis).
        $tokenCost = (int) ($tierRow?->token_cost ?? $event->token_cost ?? 1);
        $isUnlocked = EventTierUnlock::where('event_id', $event->id)
            ->where('user_id', $request->user()->id)
            ->where('tier', $tierNum)->exists();
        $myTokens = (int) $request->user()->event_tokens;
        if (! $isUnlocked && $tokenCost > 0 && $myTokens < $tokenCost) {
            return response()->json([
                'message' => "Buka Node Tier {$tierNum} butuh {$tokenCost} token (punyamu {$myTokens}). Klaim harian dulu ya!",
                'need_tokens' => true,
                'needs_unlock' => true,
                'tokens' => $myTokens,
                'token_cost' => $tokenCost,
                'challenge_type' => $challengeType,
                'tier' => $tierNum,
            ], 422);
        }

        $lineup = Lineup::with('slots.player')->where('user_id', $request->user()->id)->first();
        $filled = $lineup ? $lineup->slots->where('is_bench', false)->filter(fn ($s) => $s->player)->values() : collect();
        if ($filled->count() < 11) {
            return response()->json(['message' => 'Starting XI-mu belum lengkap (butuh 11 pemain tersimpan di Line-Up).'], 422);
        }

        // XI user: adjusted OVR per slot (server = source of truth).
        $userAdj = [];
        $userXi = [];
        $userPlayers = [];
        foreach ($filled as $slot) {
            $a = GameService::adjustedOvr($slot->player, $slot->slot_position, $slot->slot_id);
            $userAdj[] = $a['ovr'];
            $userXi[] = ['name' => $slot->player->name, 'pos' => $slot->slot_id, 'ovr' => $a['ovr']];
            $userPlayers[] = $slot->player;
        }
        $userStrength = GameService::teamStrength($userAdj, $userPlayers);
        $userOvr = $userStrength['ovr'];

        // Validasi rules.
        $check = $this->evaluateRules($event, $userPlayers);
        if (! $check['passed']) {
            return response()->json([
                'message' => 'Susunan XI-mu melanggar rules event.',
                'failures' => $check['failures'],
                'checks' => $check['checks'],
            ], 422);
        }

        // XI event: pakai line-up efektif tier ini (bisa custom per tier,
        // atau reuse XI tier sebelumnya / XI utama bila use_previous_lineup).
        $tierLineup = $this->effectiveTierLineup($event, $tierNum);
        $tierFormation = $tierLineup['formation'];
        $eventSlots = $tierLineup['slots'];
        if ($eventSlots->count() < 11) {
            return response()->json(['message' => 'Susunan event belum lengkap (admin belum menyusun 11 pemain).'], 422);
        }
        $eventAdj = [];
        $eventXi = [];
        $eventPlayers = [];
        foreach ($eventSlots as $slot) {
            $a = GameService::adjustedOvr($slot->player, $slot->slot_position, $slot->slot_id);
            $eventAdj[] = $a['ovr'];
            $eventXi[] = ['name' => $slot->player->name, 'pos' => $slot->slot_id, 'ovr' => $a['ovr']];
            $eventPlayers[] = $slot->player;
        }
        $eventStrength = GameService::teamStrength($eventAdj, $eventPlayers);
        $eventOvr = $eventStrength['ovr'];
        // Kesulitan bertambah per tier: OVR lawan naik sesuai ovr_boost tier ini.
        $eventOvrEff = min(99, $eventOvr + $boost);

        // Selesaikan tantangan: match 11v11 atau set mini-game latihan (5x, butuh >=3 gol).
        $mini = null;
        if ($challengeType === 'match') {
            $sim = GameService::simulateMatchDetail($userOvr, $eventOvrEff, $userXi, $eventXi);
            $result = $sim['winner'] === 'A' ? 'user_win' : ($sim['winner'] === 'B' ? 'event_win' : 'draw');
            $finalUserScore = $sim['a'];
            $finalEventScore = $sim['b'];
        } else {
            $mini = GameService::simulateMinigame($challengeType, $userPlayers, $eventOvrEff);
            $result = $mini['success'] ? 'user_win' : 'event_win';
            $sim = null;
            $finalUserScore = $mini['goals'];
            $finalEventScore = $mini['misses'];
        }

        $attempt = DB::transaction(function () use ($request, $event, $userOvr, $userStrength, $eventOvr, $eventStrength, $eventOvrEff, $boost, $tierNum, $tierRow, $legacy, $sim, $mini, $result, $finalUserScore, $finalEventScore, $userXi, $eventXi, $check, $tierFormation, $tierLineup, $challengeType, $tokenCost) {
            // Hadiah tier ini sudah diklaim? (sekali klaim per tier)
            $alreadyClaimed = EventAttempt::where('event_id', $event->id)
                ->where('user_id', $request->user()->id)
                ->where('tier', $tierNum)
                ->where('reward_granted', true)->exists();

            $src = $tierRow ? [
                'reward_coins' => (int) $tierRow->reward_coins,
                'reward_player_id' => $tierRow->reward_player_id,
                'reward_pack_id' => $tierRow->reward_pack_id,
                'reward_pack_draws' => (int) $tierRow->reward_pack_draws,
                'reward_tokens' => (int) ($tierRow->reward_tokens ?? 0),
            ] : ($legacy ?? ['reward_coins' => 0, 'reward_player_id' => null, 'reward_pack_id' => null, 'reward_pack_draws' => 0, 'reward_tokens' => 0]);

            // Unlock node: bayar token sekali per tier, retry berikutnya gratis.
            $user = $request->user()->lockForUpdate()->find($request->user()->id);
            $existingUnlock = EventTierUnlock::where('event_id', $event->id)
                ->where('user_id', $user->id)
                ->where('tier', $tierNum)
                ->lockForUpdate()->first();
            $isNewUnlock = $existingUnlock === null;
            $tokensSpentNow = 0;
            if ($isNewUnlock) {
                if ($tokenCost > 0 && (int) $user->event_tokens < $tokenCost) {
                    abort(response()->json([
                        'message' => "Buka Node Tier {$tierNum} butuh {$tokenCost} token. Klaim harian dulu ya!",
                        'need_tokens' => true,
                        'needs_unlock' => true,
                        'tokens' => (int) $user->event_tokens,
                        'token_cost' => $tokenCost,
                    ], 422));
                }
                if ($tokenCost > 0) {
                    TokenController::spend($user, $tokenCost, 'event_spend', "Unlock node: {$event->name} (Tier {$tierNum})");
                    $user->refresh();
                    $tokensSpentNow = $tokenCost;
                }
                EventTierUnlock::create([
                    'event_id' => $event->id, 'user_id' => $user->id,
                    'tier' => $tierNum, 'tokens_spent' => $tokensSpentNow,
                ]);
            }

            $rewardCoins = 0;
            $rewardPlayerId = null;
            $rewardPackId = null;
            $rewardTokens = 0;
            $rewardGranted = false;
            $playerDuplicate = false;
            $packDraws = [];
            $packError = null;

            if ($result === 'user_win' && ! $alreadyClaimed && ($tierRow || $legacy)) {
                $rewardGranted = true;
                $rewardCoins = $src['reward_coins'];
                $rewardPlayerId = $src['reward_player_id'];
                $rewardPackId = $src['reward_pack_id'];
                $rewardTokens = (int) ($src['reward_tokens'] ?? 0);

                if ($rewardTokens > 0) {
                    TokenController::grant($user, $rewardTokens, 'event_reward', "Hadiah event: {$event->name} (Tier {$tierNum})", $event->created_by);
                    $user->refresh();
                }
                if ($rewardCoins > 0) {
                    $user->increment('coins', $rewardCoins);
                    $user->refresh();
                    CoinTransaction::create([
                        'user_id' => $user->id, 'admin_id' => $event->created_by,
                        'type' => 'event_reward', 'amount' => $rewardCoins,
                        'balance_after' => $user->coins,
                        'description' => "Hadiah event: {$event->name} (Tier {$tierNum})",
                    ]);
                }
                if ($rewardPlayerId) {
                    $playerDuplicate = UserPlayer::where('user_id', $user->id)
                        ->where('player_id', $rewardPlayerId)->exists();
                    UserPlayer::firstOrCreate(
                        ['user_id' => $user->id, 'player_id' => $rewardPlayerId],
                        ['acquired_via' => 'event']
                    );
                }
                // Hadiah pack: draw gratis otomatis (masuk koleksi + riwayat gacha).
                // Pack nonaktif/dihapus/kosong → draw gagal; alasannya dikembalikan
                // agar frontend bisa menjelaskannya (tidak diam-diam hilang).
                $drawCount = (int) ($src['reward_pack_draws'] ?? 0);
                if ($rewardPackId && $drawCount > 0) {
                    $pack = GachaPack::find($rewardPackId);
                    if (! $pack) {
                        $packError = 'Pack hadiah sudah tidak tersedia.';
                    } elseif (! $pack->is_active) {
                        $packError = "Pack {$pack->name} sedang nonaktif.";
                    } else {
                        try {
                            $packDraws = GachaController::performDraws($user, $pack, min(5, $drawCount), 0);
                        } catch (\RuntimeException $e) {
                            report($e);
                            $packDraws = [];
                            $packError = $e->getMessage();
                        }
                    }
                } elseif ($rewardPackId) {
                    $packError = 'Jumlah draw pack hadiah 0.';
                }
            }

            $attempt = EventAttempt::create([
                'event_id' => $event->id, 'user_id' => $request->user()->id,
                'user_ovr' => $userOvr, 'event_ovr' => $eventOvrEff,
                'user_score' => $finalUserScore, 'event_score' => $finalEventScore,
                'result' => $result, 'tier' => $tierNum,
                'reward_granted' => $rewardGranted,
                'reward_coins' => $rewardGranted ? $rewardCoins : 0,
                'reward_player_id' => $rewardGranted ? $rewardPlayerId : null,
                'tokens_spent' => $tokensSpentNow,
                'tokens_granted' => $rewardGranted ? $rewardTokens : 0,
                'challenge_type' => $challengeType,
                'snapshot' => [
                    'user' => [
                        'ovr' => $userOvr, 'base_ovr' => $userStrength['base'],
                        'chemistry' => $userStrength['chemistry']['points'],
                        'chemistry_bonus' => $userStrength['bonus'],
                        'xi' => $userXi, 'formation' => $request->user()->lineup?->formation,
                    ],
                    'event' => [
                        'ovr' => $eventOvrEff, 'base_ovr' => $eventOvr,
                        'chemistry' => $eventStrength['chemistry']['points'],
                        'chemistry_bonus' => $eventStrength['bonus'],
                        'ovr_boost' => $boost, 'xi' => $eventXi, 'formation' => $tierFormation,
                        'lineup_source' => $tierLineup['source'], 'is_custom_lineup' => $tierLineup['is_custom'],
                    ],
                    'rules' => $check['checks'],
                    'tier' => $tierNum,
                    'challenge_type' => $challengeType,
                    'challenge_label' => GameService::minigameLabel($challengeType),
                    'token_cost' => $tokenCost,
                    'is_new_unlock' => $isNewUnlock,
                    'is_free_retry' => ! $isNewUnlock,
                    'details' => $sim ? [
                        'events' => $sim['events'], 'stats' => $sim['stats'],
                        'ratings' => $sim['ratings'], 'motm' => $sim['motm'],
                    ] : null,
                    'minigame' => $mini ? array_merge($mini, [
                        'type' => $challengeType,
                        'label' => GameService::minigameLabel($challengeType),
                    ]) : null,
                    'pack_draws' => array_map(fn ($d) => [
                        'player_id' => $d['player']->id, 'player_name' => $d['player']->name,
                        'ovr' => $d['player']->ovr, 'rank_rolled' => $d['rank_rolled'],
                    ], $packDraws),
                ],
            ]);
            $attempt->load('rewardPlayer');

            return [
                'attempt' => $attempt,
                'reward' => [
                    'granted' => $rewardGranted,
                    'tier' => $tierNum,
                    'ovr_boost' => $boost,
                    'coins' => $rewardGranted ? $rewardCoins : 0,
                    'tokens_granted' => $rewardGranted ? $rewardTokens : 0,
                    'tokens_spent' => $tokensSpentNow,
                    'token_cost' => $tokenCost,
                    'is_new_unlock' => $isNewUnlock,
                    'is_free_retry' => ! $isNewUnlock,
                    'challenge_type' => $challengeType,
                    'player' => $rewardGranted && $rewardPlayerId ? Player::find($rewardPlayerId) : null,
                    'player_duplicate' => $playerDuplicate,
                    'pack' => $rewardGranted && $rewardPackId ? GachaPack::select(['id', 'name', 'slug'])->find($rewardPackId) : null,
                    'pack_draws' => array_map(fn ($d) => array_merge($d['player']->toArray(), [
                        'rank_rolled' => $d['rank_rolled'], 'result_id' => $d['result_id'],
                    ]), $packDraws),
                    'pack_error' => $packError,
                    'already_claimed_before' => $alreadyClaimed,
                    'no_reward_defined' => ! ($tierRow || $legacy),
                ],
                // Saldo terkini agar header koin & token terupdate tanpa refresh halaman.
                'coins' => (int) $request->user()->fresh()->coins,
                'tokens' => (int) $request->user()->fresh()->event_tokens,
            ];
        });

        return response()->json($attempt, 201);
    }

    /** Riwayat percobaan event milikku (semua event). */
    public function myAttempts(Request $request)
    {
        return response()->json(
            EventAttempt::with(['event:id,name', 'rewardPlayer:id,name,position,ovr'])
                ->where('user_id', $request->user()->id)
                ->latest('played_at')->paginate(15)
        );
    }

    // ================= ADMIN =================

    public function adminIndex()
    {
        return response()->json(
            Event::with(['rewardPlayer:id,name,position,ovr', 'rewardPack:id,name,slug', 'rules'])
                ->withCount(['slots', 'attempts', 'rewardTiers as tiers_count'])
                ->orderByDesc('starts_at')->paginate(15)
        );
    }

    public function adminShow(Event $event)
    {
        $event->load(['slots.player', 'rules', 'rewardPlayer', 'rewardPack:id,name,slug', 'rewardTiers.rewardPlayer:id,name,position,ovr', 'rewardTiers.rewardPack:id,name,slug', 'rewardTiers.tierSlots.player']);

        return response()->json(array_merge(
            $this->presentDetail($event, now()),
            ['stats' => [
                'attempts' => $event->attempts()->count(),
                'user_wins' => $event->attempts()->where('result', 'user_win')->count(),
                'rewards_granted' => $event->attempts()->where('reward_granted', true)->count(),
            ]]
        ));
    }

    public function store(Request $request)
    {
        $data = $this->validateEvent($request);

        $event = DB::transaction(function () use ($request, $data) {
            $event = Event::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'starts_at' => $data['starts_at'],
                'ends_at' => $data['ends_at'],
                'formation' => $data['formation'],
                'reward_coins' => (int) ($data['reward_coins'] ?? 0),
                'reward_player_id' => $data['reward_player_id'] ?? null,
                'reward_pack_id' => $data['reward_pack_id'] ?? null,
                'reward_pack_draws' => ! empty($data['reward_pack_id']) ? (int) ($data['reward_pack_draws'] ?? 1) : 0,
                'reward_tokens' => (int) ($data['reward_tokens'] ?? 0),
                'token_cost' => (int) ($data['token_cost'] ?? 1),
                'max_entries_per_user' => $data['max_entries_per_user'] ?? null,
                'is_active' => (bool) ($data['is_active'] ?? true),
                'created_by' => $request->user()->id,
            ]);
            $this->syncSlots($event, $data['formation'], $data['starters']);
            $this->syncRules($event, $data['rules'] ?? []);
            $this->syncTiers($event, $data['tiers'] ?? []);

            return $event->load(['slots.player', 'rules', 'rewardPlayer', 'rewardPack:id,name,slug', 'rewardTiers.rewardPlayer:id,name,position,ovr', 'rewardTiers.rewardPack:id,name,slug', 'rewardTiers.tierSlots.player']);
        });

        return response()->json($event, 201);
    }

    public function update(Request $request, Event $event)
    {
        $data = $this->validateEvent($request);

        $event = DB::transaction(function () use ($event, $data) {
            $event->update([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'starts_at' => $data['starts_at'],
                'ends_at' => $data['ends_at'],
                'formation' => $data['formation'],
                'reward_coins' => (int) ($data['reward_coins'] ?? 0),
                'reward_player_id' => $data['reward_player_id'] ?? null,
                'reward_pack_id' => $data['reward_pack_id'] ?? null,
                'reward_pack_draws' => ! empty($data['reward_pack_id']) ? (int) ($data['reward_pack_draws'] ?? 1) : 0,
                'reward_tokens' => (int) ($data['reward_tokens'] ?? 0),
                'token_cost' => (int) ($data['token_cost'] ?? 1),
                'max_entries_per_user' => $data['max_entries_per_user'] ?? null,
                'is_active' => (bool) ($data['is_active'] ?? true),
            ]);
            $this->syncSlots($event, $data['formation'], $data['starters']);
            $this->syncRules($event, $data['rules'] ?? []);
            $this->syncTiers($event, $data['tiers'] ?? []);

            return $event->load(['slots.player', 'rules', 'rewardPlayer', 'rewardPack:id,name,slug', 'rewardTiers.rewardPlayer:id,name,position,ovr', 'rewardTiers.rewardPack:id,name,slug', 'rewardTiers.tierSlots.player']);
        });

        return response()->json($event);
    }

    public function destroy(Event $event)
    {
        $event->delete();

        return response()->json(['message' => "Event {$event->name} dihapus."]);
    }

    // ================= HELPERS =================

    private function validateEvent(Request $request): array
    {
        $formations = implode(',', array_keys(GameService::FORMATIONS));

        return $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string|max:2000',
            'starts_at' => 'required|date',
            'ends_at' => 'required|date|after:starts_at',
            'formation' => "required|in:{$formations}",
            'starters' => 'required|array|size:11',
            'starters.*.slot_id' => 'required|string',
            'starters.*.player_id' => 'required|integer|exists:players,id',
            'rules' => 'sometimes|array|max:20',
            'rules.*.kind' => 'required|in:country,rank',
            'rules.*.code' => 'required|string|max:20',
            'rules.*.operator' => 'required|in:eq,lte,gte',
            'rules.*.count' => 'required|integer|min:0|max:11',
            'reward_coins' => 'nullable|integer|min:0|max:1000000',
            'reward_player_id' => 'nullable|integer|exists:players,id',
            'reward_pack_id' => 'nullable|integer|exists:gacha_packs,id',
            'reward_pack_draws' => 'nullable|integer|min:1|max:5',
            'reward_tokens' => 'nullable|integer|min:0|max:100000',
            'token_cost' => 'nullable|integer|min:0|max:20',
            'max_entries_per_user' => 'nullable|integer|min:1|max:100',
            'tiers' => 'sometimes|array|max:10',
            'tiers.*.tier' => 'required|integer|min:1|max:10',
            'tiers.*.reward_coins' => 'nullable|integer|min:0|max:1000000',
            'tiers.*.reward_player_id' => 'nullable|integer|exists:players,id',
            'tiers.*.reward_pack_id' => 'nullable|integer|exists:gacha_packs,id',
            'tiers.*.reward_pack_draws' => 'nullable|integer|min:0|max:5',
            'tiers.*.reward_tokens' => 'nullable|integer|min:0|max:100000',
            'tiers.*.token_cost' => 'nullable|integer|min:0|max:20',
            'tiers.*.challenge_type' => 'nullable|in:match,free_kick,penalty,dribble',
            'tiers.*.ovr_boost' => 'nullable|integer|min:0|max:30',
            'tiers.*.formation' => 'nullable|string',
            'tiers.*.use_previous_lineup' => 'nullable|boolean',
            'tiers.*.starters' => 'nullable|array|size:11',
            'tiers.*.starters.*.slot_id' => 'required_with:tiers.*.starters|string',
            'tiers.*.starters.*.player_id' => 'required_with:tiers.*.starters|integer|exists:players,id',
            'is_active' => 'sometimes|boolean',
        ]);
    }

    private function syncSlots(Event $event, string $formation, array $starters): void
    {
        $slots = GameService::FORMATIONS[$formation] ?? null;
        if (! $slots) {
            abort(response()->json(['message' => 'Formasi tidak valid.'], 422));
        }
        $map = collect($slots)->keyBy('id');

        $seenSlots = [];
        $seenPlayers = [];
        foreach ($starters as $s) {
            if (! isset($map[$s['slot_id']])) {
                abort(response()->json(['message' => "Slot {$s['slot_id']} tidak ada di formasi {$formation}."], 422));
            }
            if (isset($seenSlots[$s['slot_id']])) {
                abort(response()->json(['message' => "Slot {$s['slot_id']} duplikat."], 422));
            }
            if (isset($seenPlayers[$s['player_id']])) {
                abort(response()->json(['message' => 'Pemain event tidak boleh duplikat.'], 422));
            }
            $seenSlots[$s['slot_id']] = true;
            $seenPlayers[$s['player_id']] = true;
        }

        $event->slots()->delete();
        foreach ($starters as $s) {
            $slot = $map[$s['slot_id']];
            $event->slots()->create([
                'slot_id' => $s['slot_id'],
                'slot_position' => $slot['pos'],
                'player_id' => $s['player_id'],
            ]);
        }
    }

    private function syncRules(Event $event, array $rules): void
    {
        foreach ($rules as $r) {
            $code = strtoupper(trim((string) $r['code']));
            if ($r['kind'] === 'rank') {
                $valid = array_merge(GameService::RANKS, ['potw', 'flashback']);
                if (! in_array(strtolower($code), $valid, true)) {
                    abort(response()->json(['message' => "Rank {$r['code']} tidak valid."], 422));
                }
                $code = strtolower($code);
            } elseif ($code === '') {
                abort(response()->json(['message' => 'Kode negara tidak boleh kosong.'], 422));
            }
        }
        $event->rules()->delete();
        foreach ($rules as $r) {
            $code = $r['kind'] === 'rank' ? strtolower(trim((string) $r['code'])) : strtoupper(trim((string) $r['code']));
            $event->rules()->create([
                'kind' => $r['kind'], 'code' => $code,
                'operator' => $r['operator'], 'count' => (int) $r['count'],
            ]);
        }
    }

    /**
     * Sinkron tier hadiah. Nomor tier wajib unik 1..N (tanpa lompat).
     * Tier 1 dicerminkan ke kolom legacy agar klien lama tetap jalan.
     * Tier > 1 boleh membawa line-up sendiri (formation + 11 starters)
     * atau mencentang use_previous_lineup untuk memakai XI tier sebelumnya.
     */
    private function syncTiers(Event $event, array $tiers): void
    {
        $nums = [];
        foreach ($tiers as $t) {
            $n = (int) ($t['tier'] ?? 0);
            if ($n < 1 || isset($nums[$n])) {
                abort(response()->json(['message' => 'Nomor tier harus unik mulai dari 1 tanpa lompat.'], 422));
            }
            $nums[$n] = true;
        }
        if (count($nums) > 0) {
            for ($i = 1; $i <= count($nums); $i++) {
                if (! isset($nums[$i])) {
                    abort(response()->json(['message' => 'Nomor tier harus berurutan mulai dari 1 tanpa lompat.'], 422));
                }
            }
        }
        // Validasi line-up per tier sebelum menghapus data lama.
        $formations = array_keys(GameService::FORMATIONS);
        foreach ($tiers as $t) {
            $n = (int) $t['tier'];
            if ($n <= 1) {
                continue; // Tier 1 selalu memakai XI utama event.
            }
            $usePrev = array_key_exists('use_previous_lineup', $t)
                ? (bool) $t['use_previous_lineup']
                : empty($t['starters']);
            if ($usePrev) {
                continue;
            }
            $formation = $t['formation'] ?? $event->formation;
            if (! in_array($formation, $formations, true)) {
                abort(response()->json(['message' => "Formasi tier {$n} tidak valid."], 422));
            }
            $starters = $t['starters'] ?? null;
            if (! is_array($starters) || count($starters) !== 11) {
                abort(response()->json(['message' => "Line-up tier {$n} belum lengkap (butuh 11 pemain) atau centang \"gunakan line-up sebelumnya\"."], 422));
            }
            $this->assertTierStarters($formation, $starters, $n);
        }
        $event->rewardTiers()->delete();
        foreach ($tiers as $t) {
            $n = (int) $t['tier'];
            $usePrev = $n <= 1 ? true : (array_key_exists('use_previous_lineup', $t)
                ? (bool) $t['use_previous_lineup']
                : empty($t['starters']));
            $ctype = $t['challenge_type'] ?? 'match';
            if (! in_array($ctype, EventRewardTier::CHALLENGE_TYPES, true)) {
                $ctype = 'match';
            }
            $row = $event->rewardTiers()->create([
                'tier' => $n,
                'reward_coins' => (int) ($t['reward_coins'] ?? 0),
                'reward_player_id' => $t['reward_player_id'] ?? null,
                'reward_pack_id' => $t['reward_pack_id'] ?? null,
                'reward_pack_draws' => ! empty($t['reward_pack_id']) ? max(1, (int) ($t['reward_pack_draws'] ?? 1)) : 0,
                'reward_tokens' => (int) ($t['reward_tokens'] ?? 0),
                'token_cost' => isset($t['token_cost']) ? (int) $t['token_cost'] : (int) ($event->token_cost ?? 1),
                'challenge_type' => $ctype,
                'ovr_boost' => (int) ($t['ovr_boost'] ?? 0),
                'formation' => $n <= 1 || $usePrev ? null : ($t['formation'] ?? $event->formation),
                'use_previous_lineup' => $usePrev,
            ]);
            if ($n > 1 && ! $usePrev && ! empty($t['starters'])) {
                $map = collect(GameService::FORMATIONS[$row->formation])->keyBy('id');
                foreach ($t['starters'] as $s) {
                    $slot = $map[$s['slot_id']];
                    $row->tierSlots()->create([
                        'slot_id' => $s['slot_id'],
                        'slot_position' => $slot['pos'],
                        'player_id' => $s['player_id'],
                    ]);
                }
            }
        }
        // Cerminkan tier 1 ke kolom legacy.
        $one = $event->rewardTiers()->where('tier', 1)->first();
        if ($one) {
            $event->update([
                'reward_coins' => $one->reward_coins,
                'reward_player_id' => $one->reward_player_id,
                'reward_pack_id' => $one->reward_pack_id,
                'reward_pack_draws' => $one->reward_pack_draws,
                'reward_tokens' => $one->reward_tokens,
            ]);
        }
    }

    private function assertTierStarters(string $formation, array $starters, int $tierNum): void
    {
        $slots = GameService::FORMATIONS[$formation] ?? null;
        if (! $slots) {
            abort(response()->json(['message' => "Formasi tier {$tierNum} tidak valid."], 422));
        }
        $map = collect($slots)->keyBy('id');
        $seenSlots = [];
        $seenPlayers = [];
        foreach ($starters as $s) {
            if (! isset($map[$s['slot_id']])) {
                abort(response()->json(['message' => "Slot {$s['slot_id']} tidak ada di formasi {$formation} (tier {$tierNum})."], 422));
            }
            if (isset($seenSlots[$s['slot_id']])) {
                abort(response()->json(['message' => "Slot {$s['slot_id']} duplikat (tier {$tierNum})."], 422));
            }
            if (isset($seenPlayers[$s['player_id']])) {
                abort(response()->json(['message' => "Pemain tier {$tierNum} tidak boleh duplikat."], 422));
            }
            $seenSlots[$s['slot_id']] = true;
            $seenPlayers[$s['player_id']] = true;
        }
    }

    /**
     * Line-up efektif untuk suatu tier: telusuri ke belakang sampai ketemu
     * tier yang punya XI sendiri, mentok di XI utama event.
     *
     * @return array{formation:string, slots:Collection, is_custom:bool, source:string}
     */
    private function effectiveTierLineup(Event $event, int $tierNum): array
    {
        $baseFormation = $event->formation;
        $baseSlots = $event->slots->filter(fn ($s) => $s->player)->values();

        if ($tierNum <= 1) {
            return ['formation' => $baseFormation, 'slots' => $baseSlots, 'is_custom' => false, 'source' => 'base'];
        }

        $tiersByNum = $event->rewardTiers->keyBy('tier');
        $formation = $baseFormation;
        $slots = $baseSlots;
        $isCustom = false;
        $source = 'base';

        for ($t = 2; $t <= $tierNum; $t++) {
            $row = $tiersByNum->get($t);
            if (! $row) {
                continue;
            }
            if (($row->use_previous_lineup ?? true)) {
                continue;
            }
            $custom = $row->relationLoaded('tierSlots')
                ? $row->tierSlots->filter(fn ($s) => $s->player)->values()
                : $row->tierSlots()->with('player')->get()->filter(fn ($s) => $s->player)->values();
            if ($custom->count() >= 11) {
                $formation = $row->formation ?: $formation;
                $slots = $custom;
                $isCustom = true;
                $source = "tier-{$t}";
            }
        }

        return ['formation' => $formation, 'slots' => $slots, 'is_custom' => $isCustom, 'source' => $source];
    }

    /** @param Player[] $userPlayers */
    private function evaluateRules(Event $event, array $userPlayers): array
    {
        $checks = [];
        $failures = [];
        foreach ($event->rules as $rule) {
            $actual = 0;
            foreach ($userPlayers as $p) {
                if ($rule->kind === 'country' && self::matchCountry($p, $rule->code)) {
                    $actual++;
                } elseif ($rule->kind === 'rank' && self::matchRank($p, $rule->code)) {
                    $actual++;
                }
            }
            $pass = match ($rule->operator) {
                'lte' => $actual <= $rule->count,
                'gte' => $actual >= $rule->count,
                default => $actual === (int) $rule->count,
            };
            $expect = match ($rule->operator) {
                'lte' => "maksimal {$rule->count}",
                'gte' => "minimal {$rule->count}",
                default => "tepat {$rule->count}",
            };
            $what = $rule->kind === 'rank' ? 'pemain rank '.ucfirst($rule->code) : 'pemain '.strtoupper($rule->code);
            $row = [
                'rule_id' => $rule->id,
                'kind' => $rule->kind, 'code' => $rule->code,
                'operator' => $rule->operator, 'expected' => (int) $rule->count,
                'actual' => $actual, 'passed' => $pass,
                'message' => "Syarat: {$expect} {$what} — XI-mu saat ini: {$actual}.",
            ];
            $checks[] = $row;
            if (! $pass) {
                $failures[] = $row;
            }
        }

        return ['passed' => count($failures) === 0, 'checks' => $checks, 'failures' => $failures];
    }

    private function checkRulesAgainstUserLineup(Event $event, int $userId): array
    {
        $lineup = Lineup::with('slots.player')->where('user_id', $userId)->first();
        $filled = $lineup ? $lineup->slots->where('is_bench', false)->filter(fn ($s) => $s->player)->values() : collect();
        if ($filled->count() < 11) {
            return ['complete' => false, 'passed' => false, 'checks' => [], 'failures' => [],
                'message' => 'XI belum lengkap (butuh 11).'];
        }
        $players = $filled->map(fn ($s) => $s->player)->all();
        $res = $this->evaluateRules($event, $players);

        return array_merge(['complete' => true], $res);
    }

    private static function matchCountry(Player $player, string $code): bool
    {
        $code = strtoupper(trim($code));
        $cc = strtoupper(trim((string) ($player->country_code ?? '')));
        if ($cc !== '' && $cc === $code) {
            return true;
        }
        $nat = strtoupper(trim((string) ($player->nationality ?? '')));
        if ($nat === $code) {
            return true;
        }
        $aliases = self::countryAliases($code);
        if (in_array($nat, $aliases, true)) {
            return true;
        }

        return false;
    }

    private static function matchRank(Player $player, string $code): bool
    {
        $code = strtolower(trim($code));
        if ($code === 'flashback') {
            return (bool) $player->is_flashback;
        }
        if ($code === 'ucl') {
            return (bool) $player->is_ucl;
        }
        if ($code === 'uel') {
            return (bool) $player->is_uel;
        }
        if ($code === 'uecl') {
            return (bool) $player->is_uecl;
        }
        if ($code === 'uefa') {
            return (bool) ($player->is_ucl || $player->is_uel || $player->is_uecl);
        }
        if ($code === 'potw') {
            return (bool) $player->is_potw;
        }

        return GameService::rankFor($player) === $code;
    }

    /** Nama-nama nasionalitas yang dianggap setara dengan kode negara (ID + EN). */
    private static function countryAliases(string $code): array
    {
        return match (strtoupper($code)) {
            'FR' => ['FRANCE', 'PERANCIS', 'FR'],
            'DE' => ['GERMANY', 'JERMAN', 'DE'],
            'ES' => ['SPAIN', 'SPANYOL', 'ES'],
            'IT' => ['ITALY', 'ITALIA', 'IT'],
            'PT' => ['PORTUGAL', 'PORTUGIS', 'PT'],
            'NL' => ['NETHERLANDS', 'BELANDA', 'HOLLAND', 'NL'],
            'BE' => ['BELGIUM', 'BELGIA', 'BE'],
            'GB-ENG' => ['ENGLAND', 'INGGRIS', 'ENG', 'GB-ENG'],
            'BR' => ['BRAZIL', 'BRASIL', 'BR'],
            'AR' => ['ARGENTINA', 'AR'],
            'JP' => ['JAPAN', 'JEPANG', 'JP'],
            'KR' => ['SOUTH KOREA', 'KOREA SELATAN', 'KORSEL', 'KR'],
            'ID' => ['INDONESIA', 'IDN', 'ID'],
            'HR' => ['CROATIA', 'KROASIA', 'HR'],
            'CM' => ['CAMEROON', 'KAMERUN', 'CM'],
            'NO' => ['NORWAY', 'NORWEGIA', 'NO'],
            'US' => ['AMERICA', 'AMERIKA', 'AMERIKA SERIKAT', 'USA', 'US'],
            default => [strtoupper($code)],
        };
    }

    private function presentList(Event $event, int $userId, $now): array
    {
        $status = $this->statusOf($event, $now);
        $myWins = EventAttempt::where('event_id', $event->id)->where('user_id', $userId)->where('result', 'user_win')->count();
        $myEntries = EventAttempt::where('event_id', $event->id)->where('user_id', $userId)->count();
        $maxTier = max(1, (int) ($event->max_tier ?? 0));
        $isCompleted = $myWins >= $maxTier;

        return [
            'id' => $event->id, 'name' => $event->name,
            'starts_at' => $event->starts_at, 'ends_at' => $event->ends_at,
            'formation' => $event->formation, 'is_active' => $event->is_active,
            'status' => $status,
            'slots_count' => $event->slots_count ?? $event->slots()->count(),
            'attempts_count' => $event->attempts_count ?? 0,
            'rules' => $event->rules->map(fn ($r) => [
                'id' => $r->id, 'kind' => $r->kind, 'code' => $r->code,
                'operator' => $r->operator, 'count' => $r->count, 'text' => $r->describe(),
            ])->values(),
            'reward_coins' => (int) $event->reward_coins,
            'reward_player' => $event->rewardPlayer,
            'reward_pack' => $event->rewardPack,
            'reward_pack_draws' => (int) ($event->reward_pack_draws ?? 0),
            'reward_tokens' => (int) ($event->reward_tokens ?? 0),
            'token_cost' => (int) ($event->token_cost ?? 1),
            'tiers_count' => (int) ($event->tiers_count ?? 0),
            'current_tier' => $isCompleted ? $maxTier : $myWins + 1,
            'max_tier' => $maxTier,
            'is_completed' => $isCompleted,
            'max_entries_per_user' => $event->max_entries_per_user,
            'my_attempts' => $myEntries,
            'my_wins' => $myWins,
            'reward_claimed' => EventAttempt::where('event_id', $event->id)->where('user_id', $userId)->where('reward_granted', true)->exists(),
        ];
    }

    private function presentDetail(Event $event, $now): array
    {
        $formation = GameService::FORMATIONS[$event->formation] ?? [];
        $bySlot = [];
        $players = [];
        foreach ($event->slots as $s) {
            $adj = $s->player ? GameService::adjustedOvr($s->player, $s->slot_position, $s->slot_id) : null;
            if ($s->player) {
                $players[] = $s->player;
            }
            $bySlot[] = [
                'slot_id' => $s->slot_id, 'slot_position' => $s->slot_position,
                'player' => $s->player, 'adjusted_ovr' => $adj['ovr'] ?? null,
            ];
        }
        $ovrs = array_filter(array_column($bySlot, 'adjusted_ovr'), fn ($v) => $v !== null);
        $strength = GameService::teamStrength(array_values($ovrs), $players);

        return [
            'id' => $event->id, 'name' => $event->name,
            'description' => $event->description,
            'starts_at' => $event->starts_at, 'ends_at' => $event->ends_at,
            'formation' => $event->formation, 'formations' => GameService::FORMATIONS,
            'formation_slots' => $formation,
            'is_active' => $event->is_active,
            'status' => $this->statusOf($event, $now),
            'slots' => $bySlot,
            'filled' => count(array_filter($bySlot, fn ($s) => $s['player'] !== null)),
            'team_ovr' => $strength['ovr'],
            'base_team_ovr' => $strength['base'],
            'chemistry' => $strength['chemistry']['points'],
            'chemistry_bonus' => $strength['bonus'],
            'rules' => $event->rules->map(fn ($r) => [
                'id' => $r->id, 'kind' => $r->kind, 'code' => $r->code,
                'operator' => $r->operator, 'count' => $r->count, 'text' => $r->describe(),
            ])->values(),
            'reward_coins' => (int) $event->reward_coins,
            'reward_player' => $event->rewardPlayer,
            'reward_pack' => $event->rewardPack,
            'reward_pack_draws' => (int) ($event->reward_pack_draws ?? 0),
            'reward_tokens' => (int) ($event->reward_tokens ?? 0),
            'token_cost' => (int) ($event->token_cost ?? 1),
            'max_entries_per_user' => $event->max_entries_per_user,
            'reward_tiers' => ($event->relationLoaded('rewardTiers') ? $event->rewardTiers : $event->rewardTiers()->with(['rewardPlayer:id,name,position,ovr', 'rewardPack:id,name,slug', 'tierSlots.player'])->get())
                ->map(fn ($t) => $this->presentTier($event, $t))->values(),
        ];
    }

    private function presentTier(Event $event, $t): array
    {
        $usePrev = (bool) ($t->use_previous_lineup ?? true);
        $customSlots = $usePrev ? collect()
            : collect($t->relationLoaded('tierSlots') ? $t->tierSlots : $t->tierSlots()->with('player')->get());
        $custom = [];
        $customOvrs = [];
        $customPlayers = [];
        foreach ($customSlots as $s) {
            $adj = $s->player ? GameService::adjustedOvr($s->player, $s->slot_position, $s->slot_id) : null;
            if ($adj) {
                $customOvrs[] = $adj['ovr'];
                $customPlayers[] = $s->player;
            }
            $custom[] = [
                'slot_id' => $s->slot_id, 'slot_position' => $s->slot_position,
                'player' => $s->player, 'adjusted_ovr' => $adj['ovr'] ?? null,
            ];
        }
        $customStrength = GameService::teamStrength($customOvrs, $customPlayers);
        // Line-up efektif (hasil resolve "gunakan sebelumnya") untuk preview user/admin.
        $eff = $this->effectiveTierLineup($event, (int) $t->tier);
        $effSlots = [];
        $effOvrs = [];
        $effPlayers = [];
        foreach ($eff['slots'] as $s) {
            $adj = $s->player ? GameService::adjustedOvr($s->player, $s->slot_position, $s->slot_id) : null;
            if ($adj) {
                $effOvrs[] = $adj['ovr'];
                $effPlayers[] = $s->player;
            }
            $effSlots[] = [
                'slot_id' => $s->slot_id, 'slot_position' => $s->slot_position,
                'player' => $s->player, 'adjusted_ovr' => $adj['ovr'] ?? null,
            ];
        }
        $effStrength = GameService::teamStrength($effOvrs, $effPlayers);

        $ctype = in_array($t->challenge_type ?? 'match', EventRewardTier::CHALLENGE_TYPES, true)
            ? $t->challenge_type : 'match';

        return [
            'tier' => $t->tier, 'reward_coins' => (int) $t->reward_coins,
            'reward_player' => $t->rewardPlayer, 'reward_pack' => $t->rewardPack,
            'reward_pack_draws' => (int) $t->reward_pack_draws, 'ovr_boost' => (int) $t->ovr_boost,
            'reward_tokens' => (int) ($t->reward_tokens ?? 0),
            'token_cost' => (int) ($t->token_cost ?? 1),
            'challenge_type' => $ctype,
            'challenge_label' => GameService::minigameLabel($ctype),
            'challenge_icon' => GameService::MINIGAME_TYPES[$ctype]['icon'] ?? 'fa-trophy',
            'formation' => $t->formation, 'use_previous_lineup' => $usePrev,
            'is_custom_lineup' => ! $usePrev && count($custom) >= 11,
            'lineup' => $custom,
            'lineup_chemistry' => $customStrength['chemistry']['points'],
            'lineup_chemistry_bonus' => $customStrength['bonus'],
            'effective_formation' => $eff['formation'],
            'effective_lineup' => $effSlots,
            'effective_source' => $eff['source'],
            'effective_chemistry' => $effStrength['chemistry']['points'],
            'effective_chemistry_bonus' => $effStrength['bonus'],
            'effective_team_ovr' => $effStrength['ovr'] + (int) $t->ovr_boost,
        ];
    }

    private function maxTierFor(Event $event): int
    {
        $maxTier = (int) ($event->rewardTiers->max('tier') ?? 0);

        return $maxTier > 0 ? $maxTier : 1;
    }

    private function statusOf(Event $event, $now): string
    {
        if (! $event->is_active) {
            return 'inactive';
        }
        if ($now->lt($event->starts_at)) {
            return 'upcoming';
        }
        if ($now->gt($event->ends_at)) {
            return 'ended';
        }

        return 'live';
    }
}
