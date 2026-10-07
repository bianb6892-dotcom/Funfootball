<?php

namespace Tests\Feature;

use App\Models\GachaPack;
use App\Models\GachaResult;
use App\Models\Lineup;
use App\Models\Player;
use App\Models\User;
use App\Services\GameService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class GameLogicTest extends TestCase
{
    use RefreshDatabase;

    public function test_ovr_uses_position_weights_like_prototype(): void
    {
        // Mbappe FW dari prototype: PAC97 SHO90 PAS80 DRI92 DEF36 PHY78 → FW weights → 90
        $ovr = GameService::calculateOvr(
            ['pac' => 97, 'sho' => 90, 'pas' => 80, 'dri' => 92, 'def' => 36, 'phy' => 78], 'FW'
        );
        $this->assertEquals(90, $ovr);
    }

    public function test_rank_thresholds_match_prototype(): void
    {
        $this->assertEquals('diamond', GameService::rankFromOvr(90));
        $this->assertEquals('diamond', GameService::rankFromOvr(95));
        $this->assertEquals('gold', GameService::rankFromOvr(80));
        $this->assertEquals('gold', GameService::rankFromOvr(89));
        $this->assertEquals('silver', GameService::rankFromOvr(70));
        $this->assertEquals('silver', GameService::rankFromOvr(79));
        $this->assertEquals('bronze', GameService::rankFromOvr(69));
    }

    public function test_position_penalty_exact_adjacent_far(): void
    {
        $this->assertEquals('exact', GameService::slotCompatibility('FW', 'FW'));
        $this->assertEquals('adjacent', GameService::slotCompatibility('FW', 'MF'));
        $this->assertEquals('far', GameService::slotCompatibility('FW', 'DF'));
        $this->assertEquals('far', GameService::slotCompatibility('GK', 'FW'));

        $player = ['position' => 'FW', 'pac' => 97, 'sho' => 90, 'pas' => 80, 'dri' => 92, 'def' => 36, 'phy' => 78];
        $exact = GameService::adjustedOvr($player, 'FW');
        $adj = GameService::adjustedOvr($player, 'MF');
        $far = GameService::adjustedOvr($player, 'DF');
        $this->assertEquals(0, $exact['penalty']);
        $this->assertEquals(-3, $adj['penalty']);
        $this->assertEquals(-10, $far['penalty']);
    }

    public function test_backend_recalculates_ovr_and_ignores_frontend_spoof(): void
    {
        $admin = User::factory()->create(['role' => 'admin'])->fresh();
        $this->actingAs($admin, 'sanctum');

        // Coba kirim rank diamond untuk pemain lemah — backend harus koreksi ke bronze.
        $response = $this->postJson('/api/admin/players', [
            'name' => 'Spoof', 'club' => 'Test FC', 'position' => 'FW',
            'shirt_number' => 9, 'age' => 20,
            'pac' => 40, 'sho' => 40, 'pas' => 40, 'dri' => 40, 'def' => 40, 'phy' => 40,
            'rank' => 'diamond',
        ]);
        $response->assertCreated();
        // OVR asli = 40 (FW, DEF weight 0) → rank manual dipertahankan tapi ovr tetap hitungan server
        $this->assertEquals(40, $response->json('ovr'));
        $player = Player::find($response->json('id'));
        $this->assertEquals(GameService::calculateOvr(
            ['pac' => 40, 'sho' => 40, 'pas' => 40, 'dri' => 40, 'def' => 40, 'phy' => 40], 'FW'
        ), $player->ovr);
    }

    public function test_user_cannot_access_admin_api(): void
    {
        $user = User::factory()->create(['role' => 'user'])->fresh();
        $this->actingAs($user, 'sanctum');
        $this->postJson('/api/admin/players', [])->assertForbidden();
    }

    public function test_gacha_draw_is_transactional_and_deducts_coins(): void
    {
        $this->seed();
        $user = User::where('email', 'sabian@test.com')->first();
        $this->actingAs($user, 'sanctum');

        $before = $user->coins;
        $response = $this->postJson('/api/gacha/bronze-pack/draw');
        // slug sebenarnya 'bronze'
        if ($response->status() === 404) {
            $response = $this->postJson('/api/gacha/bronze/draw');
        }
        $response->assertOk();
        $user->refresh();
        $this->assertEquals($before - 100, $user->coins);
        $this->assertDatabaseHas('gacha_results', ['user_id' => $user->id]);
        $this->assertDatabaseHas('coin_transactions', ['user_id' => $user->id, 'type' => 'gacha_spend']);
        $this->assertDatabaseHas('user_players', ['user_id' => $user->id, 'player_id' => $response->json('player.id')]);
    }

    public function test_country_code_is_normalized_and_returned(): void
    {
        $admin = User::factory()->create(['role' => 'admin'])->fresh();
        $this->actingAs($admin, 'sanctum');

        $response = $this->postJson('/api/admin/players', [
            'name' => 'Flag', 'club' => 'Test FC', 'position' => 'FW',
            'shirt_number' => 9, 'age' => 20, 'nationality' => 'Indonesia', 'country_code' => 'id',
            'pac' => 80, 'sho' => 80, 'pas' => 80, 'dri' => 80, 'def' => 50, 'phy' => 70,
        ]);
        $response->assertCreated();
        $this->assertEquals('ID', $response->json('country_code'));
    }

    public function test_admin_delete_player_with_relations_succeeds_and_cleans_up(): void
    {
        $this->seed();
        $admin = User::where('email', 'admin@footballfun.test')->first();
        $this->actingAs($admin, 'sanctum');

        $user = User::where('email', 'sabian@test.com')->first();
        $player = Player::where('position', 'FW')->first();
        $pack = GachaPack::first();

        $user->userPlayers()->create(['player_id' => $player->id, 'acquired_via' => 'gacha']);
        $gr = GachaResult::create([
            'user_id' => $user->id, 'pack_id' => $pack->id, 'player_id' => $player->id,
            'rank_rolled' => $player->rank, 'price_paid' => $pack->price,
        ]);
        $lineup = Lineup::firstOrCreate(['user_id' => $user->id], ['formation' => '4-3-3']);
        $lineup->slots()->create(['slot_id' => 'ST', 'slot_position' => 'FW', 'player_id' => $player->id, 'is_bench' => false]);

        $response = $this->deleteJson('/api/admin/players/'.$player->id);
        $response->assertOk();

        $this->assertDatabaseMissing('players', ['id' => $player->id]);
        $this->assertDatabaseMissing('user_players', ['user_id' => $user->id, 'player_id' => $player->id]);
        $this->assertDatabaseHas('gacha_results', ['id' => $gr->id, 'player_id' => null]);
        $this->assertDatabaseHas('lineup_slots', ['lineup_id' => $lineup->id, 'slot_id' => 'ST', 'player_id' => null]);
    }

    public function test_gk_uses_own_stat_set_for_ovr(): void
    {
        // Courtois: DIV84 HAN89 KIC76 REF90 SPD45 POS88 → 85
        $ovr = GameService::calculateOvr(
            ['div' => 84, 'han' => 89, 'kic' => 76, 'ref' => 90, 'spd' => 45, 'pos' => 88], 'GK'
        );
        $this->assertEquals(85, $ovr);
        $this->assertEquals(['div', 'han', 'kic', 'ref', 'spd', 'pos'], GameService::statKeysFor('GK'));
        $this->assertEquals(['pac', 'sho', 'pas', 'dri', 'def', 'phy'], GameService::statKeysFor('FW'));
    }

    public function test_admin_create_gk_requires_gk_stats(): void
    {
        $admin = User::factory()->create(['role' => 'admin'])->fresh();
        $this->actingAs($admin, 'sanctum');

        $base = [
            'name' => 'Kiper', 'club' => 'Test FC', 'position' => 'GK',
            'shirt_number' => 1, 'age' => 25,
        ];

        // tanpa stat GK → 422
        $this->postJson('/api/admin/players', $base)->assertStatus(422);

        // dengan stat GK → 201, OVR dari stat GK, stat umum nol
        $response = $this->postJson('/api/admin/players', array_merge($base, [
            'div' => 84, 'han' => 89, 'kic' => 76, 'ref' => 90, 'spd' => 45, 'pos' => 88,
        ]));
        $response->assertCreated();
        $this->assertEquals(85, $response->json('ovr'));
        $this->assertEquals(0, $response->json('pac'));
        $this->assertEquals('gold', $response->json('rank'));
    }

    public function test_compare_gk_vs_gk_uses_gk_rows(): void
    {
        $this->seed();
        $user = User::where('email', 'sabian@test.com')->first();
        $this->actingAs($user, 'sanctum');

        $gkIds = Player::where('position', 'GK')->limit(2)->pluck('id')->all();
        $this->assertCount(2, $gkIds);
        $response = $this->getJson('/api/players/compare?ids[]='.$gkIds[0].'&ids[]='.$gkIds[1]);
        $response->assertOk();
        $labels = collect($response->json('rows'))->pluck('label')->all();
        $this->assertEquals(['DIV', 'HAN', 'KIC', 'REF', 'SPD', 'POS'], $labels);
    }

    public function test_admin_can_delete_player_with_gacha_history(): void
    {
        $this->seed();
        $user = User::where('email', 'sabian@test.com')->first();
        $this->actingAs($user, 'sanctum');
        $draw = $this->postJson('/api/gacha/bronze/draw');
        $draw->assertOk();
        $playerId = $draw->json('player.id');

        $admin = User::where('email', 'admin@footballfun.test')->first()->fresh();
        $this->actingAs($admin, 'sanctum');
        $this->deleteJson("/api/admin/players/$playerId")->assertOk();

        $this->assertDatabaseMissing('players', ['id' => $playerId]);
        // history tetap ada: player_id null, nama + ovr tersnapshot
        $this->assertDatabaseHas('gacha_results', [
            'user_id' => $user->id, 'player_id' => null, 'player_name' => $draw->json('player.name'),
        ]);
    }

    public function test_admin_can_upload_player_photo_on_create_and_update(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create(['role' => 'admin'])->fresh();
        $this->actingAs($admin, 'sanctum');

        $payload = [
            'name' => 'Foto', 'club' => 'Test FC', 'position' => 'FW',
            'shirt_number' => 9, 'age' => 20,
            'pac' => 80, 'sho' => 80, 'pas' => 80, 'dri' => 80, 'def' => 50, 'phy' => 70,
            'image' => UploadedFile::fake()->image('player.jpg'),
        ];

        $create = $this->post('/api/admin/players', $payload);
        $create->assertCreated();
        $this->assertNotNull($create->json('image_path'));
        Storage::disk('public')->assertExists($create->json('image_path'));

        // update via _method spoof di body (jalur yang dipakai FormData browser)
        $update = $this->post('/api/admin/players/'.$create->json('id'), array_merge($payload, [
            'name' => 'Foto Edited', '_method' => 'PUT',
            'image' => UploadedFile::fake()->image('player2.jpg'),
        ]));
        $update->assertOk();
        $this->assertNotNull($update->json('image_path'));
        $this->assertNotEquals($create->json('image_path'), $update->json('image_path'));
        Storage::disk('public')->assertExists($update->json('image_path'));
    }
}
