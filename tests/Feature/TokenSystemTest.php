<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Lineup;
use App\Models\Player;
use App\Models\User;
use App\Services\GameService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TokenSystemTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(array $over = []): User
    {
        $user = User::create(array_merge([
            'name' => 'Tester',
            'email' => 'tester'.uniqid().'@test.com',
            'password' => 'password123',
            'role' => 'user',
            'team_name' => 'Test FC',
            'coins' => 1000,
            'event_tokens' => 0,
        ], $over));

        // Muat default DB (is_active) agar middleware role tidak menolak model in-memory.
        return $user->refresh();
    }

    private function makePlayer(string $position, int $stat = 80, bool $gk = false): Player
    {
        $data = [
            'name' => 'P '.uniqid(),
            'club' => 'Club',
            'nationality' => 'Indonesia',
            'country_code' => 'ID',
            'position' => $position,
            'pac' => $stat, 'sho' => $stat, 'pas' => $stat,
            'dri' => $stat, 'def' => $stat, 'phy' => $stat,
        ];
        if ($gk) {
            $data = array_merge($data, [
                'div' => $stat, 'han' => $stat, 'kic' => $stat,
                'ref' => $stat, 'spd' => $stat, 'pos' => $stat,
            ]);
        }

        return Player::create($data);
    }

    /** XI user lengkap (11 slot formasi 4-3-3) + XI event dari pemain yang sama. */
    private function makeEventWithLineup(User $user, array $tierOver = [], int $userStat = 80, int $eventStat = 70): Event
    {
        $formation = '4-3-3';
        $defs = GameService::FORMATIONS[$formation];

        // Pemain user: GK + 10 outfield.
        $players = [];
        $players[] = $this->makePlayer('GK', $userStat, true);
        foreach (array_slice($defs, 1) as $i => $slot) {
            $players[] = $this->makePlayer($slot['pos'] === 'DF' ? 'CB' : ($slot['pos'] === 'MF' ? 'CM' : 'ST'), $userStat);
        }

        $lineup = Lineup::create(['user_id' => $user->id, 'formation' => $formation]);
        foreach ($defs as $i => $slot) {
            $lineup->slots()->create([
                'slot_id' => $slot['id'], 'slot_position' => $slot['pos'],
                'player_id' => $players[$i]->id, 'is_bench' => false,
            ]);
        }

        $eventPlayers = [];
        $eventPlayers[] = $this->makePlayer('GK', $eventStat, true);
        for ($i = 1; $i < 11; $i++) {
            $eventPlayers[] = $this->makePlayer('CM', $eventStat);
        }

        $admin = User::create([
            'name' => 'Admin', 'email' => 'admin'.uniqid().'@test.com',
            'password' => 'password123', 'role' => 'admin',
            'team_name' => 'Admin FC', 'coins' => 0, 'event_tokens' => 0,
        ])->refresh();

        $event = Event::create([
            'name' => 'Event Token',
            'starts_at' => now()->subDay(), 'ends_at' => now()->addDay(),
            'formation' => $formation,
            'reward_coins' => 100,
            'token_cost' => 1,
            'is_active' => true,
            'created_by' => $admin->id,
        ]);
        foreach ($defs as $i => $slot) {
            $event->slots()->create([
                'slot_id' => $slot['id'], 'slot_position' => $slot['pos'],
                'player_id' => $eventPlayers[$i]->id,
            ]);
        }
        $event->rewardTiers()->create(array_merge([
            'tier' => 1,
            'reward_coins' => 100,
            'reward_tokens' => 5,
            'token_cost' => 2,
            'challenge_type' => 'match',
            'ovr_boost' => 0,
            'use_previous_lineup' => true,
        ], $tierOver));

        return $event;
    }

    public function test_register_grants_starter_tokens(): void
    {
        $res = $this->postJson('/api/register', [
            'name' => 'Baru', 'email' => 'baru@test.com',
            'password' => 'password123', 'password_confirmation' => 'password123',
            'team_name' => 'Baru FC',
        ])->assertCreated();

        $this->assertEquals(3, $res->json('user.event_tokens'));
        $this->assertDatabaseHas('token_transactions', [
            'user_id' => $res->json('user.id'), 'type' => 'register_bonus', 'amount' => 3,
        ]);
    }

    public function test_daily_claim_once_per_day_with_streak(): void
    {
        $user = $this->makeUser();
        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/daily/status')->assertOk()
            ->assertJson(['can_claim' => true, 'claim_amount' => 3, 'streak' => 0]);

        $claim = $this->postJson('/api/daily/claim')->assertCreated();
        $claim->assertJson(['tokens_granted' => 3, 'streak' => 1, 'tokens' => 3]);

        // Klaim kedua di hari yang sama ditolak.
        $this->postJson('/api/daily/claim')->assertStatus(422);
        $this->assertEquals(3, $user->fresh()->event_tokens);

        // Besok: streak 2, masih 3 token.
        Carbon::setTestNow(now()->addDay());
        $this->postJson('/api/daily/claim')->assertCreated()
            ->assertJson(['streak' => 2, 'tokens_granted' => 3]);
        $this->assertEquals(6, $user->fresh()->event_tokens);

        // Streak 3 → bonus jadi 4 token.
        Carbon::setTestNow(now()->addDay());
        $this->postJson('/api/daily/claim')->assertCreated()
            ->assertJson(['streak' => 3, 'tokens_granted' => 4]);

        // Bolos 2 hari → streak reset ke 1.
        Carbon::setTestNow(now()->addDays(3));
        $this->postJson('/api/daily/claim')->assertCreated()
            ->assertJson(['streak' => 1, 'tokens_granted' => 3]);

        Carbon::setTestNow();
    }

    public function test_event_challenge_requires_and_spends_tokens(): void
    {
        $user = $this->makeUser(['event_tokens' => 0]);
        $event = $this->makeEventWithLineup($user);
        $this->actingAs($user, 'sanctum');

        // Token 0 → ditolak dengan flag need_tokens.
        $denied = $this->postJson("/api/events/{$event->id}/challenge")->assertStatus(422);
        $denied->assertJson(['need_tokens' => true, 'token_cost' => 2, 'tokens' => 0]);

        // Isi token → bisa main, 2 token hangus per attempt.
        $user->update(['event_tokens' => 5]);
        $res = $this->postJson("/api/events/{$event->id}/challenge")->assertCreated();
        $this->assertEquals(2, $res->json('attempt.tokens_spent'));
        $this->assertEquals(2, $res->json('reward.tokens_spent'));
        $expected = 5 - 2 + (int) $res->json('reward.tokens_granted');
        $this->assertEquals($expected, $res->json('tokens'));
        $this->assertEquals($expected, $user->fresh()->event_tokens);
        $this->assertDatabaseHas('token_transactions', [
            'user_id' => $user->id, 'type' => 'event_spend', 'amount' => -2,
        ]);
    }

    public function test_minigame_tier_returns_minigame_snapshot(): void
    {
        $user = $this->makeUser(['event_tokens' => 10]);
        $event = $this->makeEventWithLineup($user, [
            'challenge_type' => 'free_kick', 'token_cost' => 1, 'reward_tokens' => 4,
        ]);
        $this->actingAs($user, 'sanctum');

        $res = $this->postJson("/api/events/{$event->id}/challenge")->assertCreated();
        $this->assertEquals('free_kick', $res->json('attempt.challenge_type'));
        $this->assertEquals('free_kick', $res->json('reward.challenge_type'));
        $mini = $res->json('attempt.snapshot.minigame');
        $this->assertNotNull($mini);
        $this->assertCount(5, $mini['rounds']);
        $this->assertEquals(1, $res->json('attempt.tokens_spent'));
        $this->assertEquals(9 + (int) $res->json('reward.tokens_granted'), $res->json('tokens'));
    }

    public function test_token_reward_granted_on_decisive_win(): void
    {
        // XI super (99) vs lawan lemah (30) → menang deterministik.
        $user = $this->makeUser(['event_tokens' => 10]);
        $event = $this->makeEventWithLineup($user, [
            'challenge_type' => 'match', 'token_cost' => 2, 'reward_tokens' => 7,
            'reward_coins' => 50,
        ], 99, 30);
        $this->actingAs($user, 'sanctum');

        $res = $this->postJson("/api/events/{$event->id}/challenge")->assertCreated();
        $this->assertEquals('user_win', $res->json('attempt.result'));
        $this->assertTrue((bool) $res->json('reward.granted'));
        $this->assertEquals(7, $res->json('reward.tokens_granted'));
        $this->assertEquals(10 - 2 + 7, $res->json('tokens'));
        $this->assertDatabaseHas('token_transactions', [
            'user_id' => $user->id, 'type' => 'event_reward', 'amount' => 7,
        ]);

        // Tier terakhir sudah selesai → attempt berikutnya ditolak tanpa potong token.
        $tokensAfterWin = $user->fresh()->event_tokens;
        $this->postJson("/api/events/{$event->id}/challenge")
            ->assertStatus(422)
            ->assertJson(['event_finished' => true, 'is_completed' => true]);
        $this->assertEquals($tokensAfterWin, $user->fresh()->event_tokens);
        $this->assertDatabaseCount('event_attempts', 1);
    }

    public function test_event_show_and_list_mark_completed_after_final_tier(): void
    {
        $user = $this->makeUser(['event_tokens' => 20]);
        $event = $this->makeEventWithLineup($user, [
            'token_cost' => 2, 'reward_tokens' => 5,
        ], 99, 30);
        $event->rewardTiers()->create([
            'tier' => 2,
            'reward_coins' => 0,
            'reward_tokens' => 3,
            'token_cost' => 1,
            'challenge_type' => 'match',
            'ovr_boost' => 0,
            'use_previous_lineup' => true,
        ]);
        $this->actingAs($user, 'sanctum');

        $this->getJson("/api/events/{$event->id}")->assertOk()->assertJson([
            'current_tier' => 1,
            'max_tier' => 2,
            'is_completed' => false,
        ]);

        $this->postJson("/api/events/{$event->id}/challenge")->assertCreated();
        $this->getJson("/api/events/{$event->id}")->assertOk()->assertJson([
            'current_tier' => 2,
            'max_tier' => 2,
            'is_completed' => false,
        ]);

        $this->postJson("/api/events/{$event->id}/challenge")->assertCreated();
        $this->getJson("/api/events/{$event->id}")->assertOk()->assertJson([
            'current_tier' => 2,
            'max_tier' => 2,
            'is_completed' => true,
        ]);

        $this->getJson('/api/events')->assertOk()->assertJsonFragment([
            'id' => $event->id,
            'max_tier' => 2,
            'is_completed' => true,
        ]);

        $this->postJson("/api/events/{$event->id}/challenge")
            ->assertStatus(422)
            ->assertJson(['event_finished' => true, 'is_completed' => true]);
    }
}
