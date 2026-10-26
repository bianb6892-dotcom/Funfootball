<?php

namespace Tests\Feature;

use App\Models\GachaPack;
use App\Models\GachaResult;
use App\Models\Lineup;
use App\Models\LineupSlot;
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

    public function test_new_formations_have_eleven_valid_unique_slots(): void
    {
        $newFormations = ['3-4-1-2', '4-2-1-3', '3-4-2-1-SS', '3-2-4-1'];

        foreach ($newFormations as $formation) {
            $this->assertArrayHasKey($formation, GameService::FORMATIONS);
            $slots = GameService::FORMATIONS[$formation];
            $this->assertCount(11, $slots);

            $ids = array_column($slots, 'id');
            $this->assertCount(11, array_unique($ids));

            foreach ($slots as $slot) {
                $this->assertContains($slot['pos'], ['GK', 'DF', 'MF', 'FW']);
            }
        }

        $cdm = collect(GameService::FORMATIONS['4-2-1-3'])->where('label', 'CDM')->count();
        $cam = collect(GameService::FORMATIONS['4-2-1-3'])->where('label', 'CAM')->count();
        $this->assertEquals(2, $cdm);
        $this->assertEquals(1, $cam);

        $ss = collect(GameService::FORMATIONS['3-4-2-1-SS'])->where('label', 'SS')->count();
        $this->assertEquals(2, $ss);

        $cm = collect(GameService::FORMATIONS['3-5-2'])->where('label', 'CM')->count();
        $lm = collect(GameService::FORMATIONS['3-5-2'])->where('label', 'LM')->count();
        $rm = collect(GameService::FORMATIONS['3-5-2'])->where('label', 'RM')->count();
        $this->assertEquals(3, $cm);
        $this->assertEquals(1, $lm);
        $this->assertEquals(1, $rm);

        $cdm3241 = collect(GameService::FORMATIONS['3-2-4-1'])->where('label', 'CDM')->count();
        $cam3241 = collect(GameService::FORMATIONS['3-2-4-1'])->where('label', 'CAM')->count();
        $this->assertEquals(2, $cdm3241);
        $this->assertEquals(2, $cam3241);
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

    public function test_foot_mismatch_ignored_when_detail_matches(): void
    {
        $stats = ['pac' => 80, 'sho' => 70, 'pas' => 75, 'dri' => 78, 'def' => 82, 'phy' => 80];

        // RB berkaki kiri di slot RB: detail sama persis → tanpa penalti apa pun.
        $rbLeft = array_merge($stats, ['position' => 'RB', 'preferred_foot' => 'left']);
        $atRb = GameService::adjustedOvr($rbLeft, 'DF', 'RB');
        $this->assertEquals('exact', $atRb['compat']);
        $this->assertEquals(0, $atRb['foot_penalty']);
        $this->assertEquals(0, $atRb['penalty']);
        $this->assertEquals($atRb['base'], $atRb['ovr']);
    }

    public function test_same_line_shift_is_minus_two_when_foot_fits_minus_three_otherwise(): void
    {
        $stats = ['pac' => 80, 'sho' => 70, 'pas' => 75, 'dri' => 78, 'def' => 82, 'phy' => 80];

        $this->assertEquals('shift', GameService::slotCompatibility('LM', 'CM'));
        $this->assertEquals('shift', GameService::slotCompatibility('ST', 'LW'));

        // LM→CM: slot netral tanpa preferensi kaki = -3.
        $lm = array_merge($stats, ['position' => 'LM', 'preferred_foot' => 'right']);
        $atCm = GameService::adjustedOvr($lm, 'MF', 'CM1');
        $this->assertEquals('shift', $atCm['compat']);
        $this->assertEquals(-3, $atCm['pos_penalty']);
        $this->assertEquals(0, $atCm['foot_penalty']);
        $this->assertEquals(-3, $atCm['penalty']);

        // ST berkaki kanan → LW (maunya kanan): kaki sesuai = -2.
        $stRight = array_merge($stats, ['position' => 'ST', 'preferred_foot' => 'right']);
        $atLw = GameService::adjustedOvr($stRight, 'FW', 'LW');
        $this->assertEquals('shift', $atLw['compat']);
        $this->assertEquals(-2, $atLw['penalty']);

        // ST berkaki kiri → LW: kaki tidak sesuai = -3.
        $stLeft = array_merge($stats, ['position' => 'ST', 'preferred_foot' => 'left']);
        $this->assertEquals(-3, GameService::adjustedOvr($stLeft, 'FW', 'LW')['penalty']);

        // RB berkaki kiri → LB (maunya kiri): kaki sesuai = -2.
        $rbLeft = array_merge($stats, ['position' => 'RB', 'preferred_foot' => 'left']);
        $this->assertEquals(-2, GameService::adjustedOvr($rbLeft, 'DF', 'LB')['penalty']);

        // RB berkaki kanan → LB: kaki tidak sesuai = -3.
        $rbRight = array_merge($stats, ['position' => 'RB', 'preferred_foot' => 'right']);
        $this->assertEquals(-3, GameService::adjustedOvr($rbRight, 'DF', 'LB')['penalty']);

        // Beda lini tetap seperti dulu: CM kaki kanan di RW = adjacent -3 + kaki -2.
        $cmRight = array_merge($stats, ['position' => 'CM', 'preferred_foot' => 'right']);
        $atRw = GameService::adjustedOvr($cmRight, 'FW', 'RW');
        $this->assertEquals('adjacent', $atRw['compat']);
        $this->assertEquals(-2, $atRw['foot_penalty']);
        $this->assertEquals(-5, $atRw['penalty']);
    }

    public function test_chemistry_counts_club_and_nation_links_and_boosts_team_ovr(): void
    {
        // Satu klub = +1, satu negara = +2 (bisa keduanya dalam satu pasangan).
        $players = [
            ['club' => 'Alpha', 'nationality' => 'Indonesia', 'country_code' => 'ID'],
            ['club' => 'Alpha', 'nationality' => 'Indonesia', 'country_code' => 'ID'],
            ['club' => 'Beta', 'nationality' => 'Indonesia', 'country_code' => 'ID'],
        ];
        $chem = GameService::chemistry($players);
        $this->assertEquals(1, $chem['club_links']);
        $this->assertEquals(3, $chem['nation_links']);
        $this->assertEquals(7, $chem['points']);
        $this->assertEquals([5, 5, 4], $chem['per_player']);

        // 11 pemain satu negara (klub beda) = 55 pasangan x 2 = 110 poin → bonus maks +5.
        $sameNation = [];
        for ($i = 0; $i < 11; $i++) {
            $sameNation[] = [
                'club' => "Club {$i}", 'nationality' => 'Indonesia', 'country_code' => 'ID',
            ];
        }
        $strength = GameService::teamStrength(array_fill(0, 11, 70), $sameNation);
        $this->assertEquals(110, $strength['chemistry']['points']);

        // Divisor 10 → 110/10 = 11, tapi bonus dibatasi maksimal +5.
        $this->assertEquals(GameService::CHEMISTRY_MAX_BONUS, $strength['bonus']);
        $this->assertEquals(70, $strength['base']);
        $this->assertEquals(75, $strength['ovr']);
    }

    public function test_match_statistics_are_consistent_with_score(): void
    {
        $xi = [];
        foreach (['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'LW', 'ST', 'RW'] as $pos) {
            $xi[] = ['name' => "P {$pos}", 'pos' => $pos];
        }

        for ($i = 0; $i < 20; $i++) {
            $sim = GameService::simulateMatchDetail(78, 74, $xi, $xi);
            $a = $sim['stats']['a'];
            $b = $sim['stats']['b'];

            $this->assertEquals(100, $a['possession'] + $b['possession']);
            $this->assertGreaterThanOrEqual($sim['a'], $a['shots_on_target']);
            $this->assertGreaterThanOrEqual($a['shots_on_target'], $a['shots']);
            $this->assertGreaterThanOrEqual($sim['a'], $a['big_chances']);
            $this->assertLessThanOrEqual($a['shots'], $a['big_chances']);
            $this->assertLessThanOrEqual($a['passes_attempted'], $a['accurate_passes']);
            $this->assertGreaterThanOrEqual(0, $a['fouls']);
            $this->assertGreaterThanOrEqual(0, $a['corners']);
            $this->assertGreaterThanOrEqual(0, $a['offsides']);

            $this->assertGreaterThanOrEqual($sim['b'], $b['shots_on_target']);
            $this->assertGreaterThanOrEqual($b['shots_on_target'], $b['shots']);
            $this->assertGreaterThanOrEqual($sim['b'], $b['big_chances']);
            $this->assertLessThanOrEqual($b['passes_attempted'], $b['accurate_passes']);
        }
    }

    public function test_mail_send_claim_flow(): void
    {
        $this->seed();
        $admin = User::where('email', 'admin@footballfun.test')->first();
        $user = User::where('email', 'sabian@test.com')->first();
        $player = Player::first();
        $this->assertNotNull($player);

        // Admin kirim mail berisi koin + pemain ke satu user.
        $this->actingAs($admin, 'sanctum');
        $send = $this->postJson('/api/admin/mails', [
            'send_to' => 'user', 'user_id' => $user->id,
            'subject' => 'Bonus event', 'body' => 'Terima kasih!',
            'coin_amount' => 500, 'player_id' => $player->id,
        ]);
        $send->assertCreated();
        $this->assertEquals(1, $send->json('sent'));

        // User lihat inbox lalu klaim.
        $this->actingAs($user, 'sanctum');
        $inbox = $this->getJson('/api/mails')->assertOk();
        $mailId = $inbox->json('data')[0]['id'];
        $unread = $this->getJson('/api/mails/unread-count')->assertOk();
        $this->assertEquals(1, $unread->json('unread'));
        $this->assertEquals(1, $unread->json('claimable'));

        $before = $user->fresh()->coins;
        $claim = $this->postJson("/api/mails/{$mailId}/claim")->assertOk();
        $this->assertEquals(500, $claim->json('coins_claimed'));
        $this->assertEquals($before + 500, $claim->json('coins'));
        $this->assertEquals($player->id, $claim->json('player.id'));
        $this->assertDatabaseHas('user_players', [
            'user_id' => $user->id, 'player_id' => $player->id, 'acquired_via' => 'mail',
        ]);
        $this->assertDatabaseHas('coin_transactions', [
            'user_id' => $user->id, 'type' => 'mail_claim', 'amount' => 500,
        ]);

        // Klaim kedua ditolak.
        $this->postJson("/api/mails/{$mailId}/claim")->assertStatus(422);
    }

    public function test_mail_broadcast_and_ownership(): void
    {
        $this->seed();
        $admin = User::where('email', 'admin@footballfun.test')->first();
        $user = User::where('email', 'sabian@test.com')->first();
        $other = User::factory()->create(['role' => 'user', 'is_active' => true]);

        // Broadcast ke semua user.
        $this->actingAs($admin, 'sanctum');
        $this->postJson('/api/admin/mails', [
            'send_to' => 'all', 'subject' => 'Kompensasi', 'coin_amount' => 100,
        ])->assertCreated();

        $this->actingAs($user, 'sanctum');
        $mailId = $this->getJson('/api/mails')->json('data')[0]['id'];

        // User lain tidak bisa mengklaim mail milik orang lain.
        $this->actingAs($other, 'sanctum');
        $this->postJson("/api/mails/{$mailId}/claim")->assertForbidden();

        // Tapi user lain punya mail broadcast-nya sendiri dan bisa klaim semua.
        $before = $other->fresh()->coins;
        $all = $this->postJson('/api/mails/claim-all')->assertOk();
        $this->assertEquals(100, $all->json('coins_claimed'));
        $this->assertEquals($before + 100, $all->json('coins'));

        // User biasa tidak bisa mengirim mail.
        $this->postJson('/api/admin/mails', ['send_to' => 'all', 'subject' => 'x'])->assertForbidden();
    }

    public function test_admin_can_assign_legend_rank_manually(): void
    {
        $admin = User::factory()->create(['role' => 'admin'])->fresh();
        $this->actingAs($admin, 'sanctum');

        // Legend hanya via manual — OVR tinggi sekalipun tidak auto-legend.
        $response = $this->postJson('/api/admin/players', [
            'name' => 'Legenda', 'club' => 'Test FC', 'position' => 'FW',
            'shirt_number' => 10, 'age' => 30,
            'pac' => 97, 'sho' => 90, 'pas' => 80, 'dri' => 92, 'def' => 36, 'phy' => 78,
            'rank' => 'legend',
        ]);
        $response->assertCreated();
        $this->assertEquals('legend', $response->json('rank'));
        $this->assertEquals('legend', $response->json('card'));
        $this->assertEquals(90, $response->json('ovr'));

        // Rank auto tidak pernah menghasilkan legend (90+ = diamond).
        $this->assertEquals('diamond', GameService::rankFromOvr(99));

        // Rank asal ditolak validasi.
        $this->postJson('/api/admin/players', [
            'name' => 'Abal', 'club' => 'Test FC', 'position' => 'FW',
            'shirt_number' => 11, 'age' => 20,
            'pac' => 80, 'sho' => 80, 'pas' => 80, 'dri' => 80, 'def' => 50, 'phy' => 70,
            'rank' => 'mythic',
        ])->assertStatus(422);
    }

    public function test_legend_has_own_category_outside_basic(): void
    {
        $admin = User::factory()->create(['role' => 'admin'])->fresh();
        $this->actingAs($admin, 'sanctum');

        $stats = ['club' => 'Test FC', 'position' => 'FW', 'shirt_number' => 9, 'age' => 25,
            'pac' => 80, 'sho' => 80, 'pas' => 80, 'dri' => 80, 'def' => 50, 'phy' => 70];
        $legend = $this->postJson('/api/admin/players', array_merge($stats, ['name' => 'Legenda', 'rank' => 'legend']))->assertCreated();
        $biasa = $this->postJson('/api/admin/players', array_merge($stats, ['name' => 'Pemain Biasa']))->assertCreated();

        // Kategori legend hanya berisi legend.
        $leg = $this->getJson('/api/players?category=legend&per_page=100')->assertOk();
        $this->assertContains($legend->json('id'), collect($leg->json('data'))->pluck('id')->all());
        $this->assertNotContains($biasa->json('id'), collect($leg->json('data'))->pluck('id')->all());

        // Kategori basic tidak lagi berisi legend.
        $basic = $this->getJson('/api/players?category=basic&per_page=100')->assertOk();
        $basicIds = collect($basic->json('data'))->pluck('id')->all();
        $this->assertContains($biasa->json('id'), $basicIds);
        $this->assertNotContains($legend->json('id'), $basicIds);

        // Tanpa kategori tetap semua.
        $all = $this->getJson('/api/players?per_page=100')->assertOk();
        $allIds = collect($all->json('data'))->pluck('id')->all();
        $this->assertContains($legend->json('id'), $allIds);
        $this->assertContains($biasa->json('id'), $allIds);
    }

    public function test_admin_pack_crud_and_custom_draw(): void
    {
        $this->seed();
        $admin = User::where('email', 'admin@footballfun.test')->first();
        $user = User::where('email', 'sabian@test.com')->first();
        $this->actingAs($admin, 'sanctum');

        // Pemain legend masuk pool gacha.
        $stats = ['club' => 'Test FC', 'position' => 'FW', 'shirt_number' => 9, 'age' => 25,
            'pac' => 90, 'sho' => 90, 'pas' => 85, 'dri' => 88, 'def' => 40, 'phy' => 75];
        $lp = $this->postJson('/api/admin/players', array_merge($stats, ['name' => 'Legenda Pool', 'rank' => 'legend']))->assertCreated();

        // Admin buat pack khusus legend + banner.
        Storage::fake('public');
        $pack = $this->post('/api/admin/gacha/packs', [
            'name' => 'Legend Pack', 'price' => 500,
            'rates' => ['legend' => 100], 'allowed_ranks' => ['legend'],
            'banner' => UploadedFile::fake()->image('banner.jpg', 1200, 600),
        ])->assertCreated();
        $this->assertEquals('legend-pack', $pack->json('slug'));
        $this->assertNotNull($pack->json('banner_path'));
        Storage::disk('public')->assertExists($pack->json('banner_path'));

        // Rates berbobot di luar isi pack ditolak.
        $this->postJson('/api/admin/gacha/packs', [
            'name' => 'Bad Pack', 'price' => 100,
            'rates' => ['gold' => 100], 'allowed_ranks' => ['bronze'],
        ])->assertStatus(422);

        // User draw → pasti pemain legend tersebut.
        $this->actingAs($user, 'sanctum');
        $user->update(['coins' => 99999]);
        $draw = $this->postJson('/api/gacha/legend-pack/draw')->assertOk();
        $this->assertEquals($lp->json('id'), $draw->json('player.id'));
        $this->assertEquals('legend', $draw->json('rank_rolled'));

        // Hide pack → hilang dari daftar & tidak bisa di-draw.
        $this->actingAs($admin, 'sanctum');
        $this->postJson("/api/admin/gacha/packs/{$pack->json('id')}", ['is_active' => false])->assertOk();
        $this->actingAs($user, 'sanctum');
        $slugs = collect($this->getJson('/api/gacha/packs')->json())->pluck('slug')->all();
        $this->assertNotContains('legend-pack', $slugs);
        $this->postJson('/api/gacha/legend-pack/draw')->assertStatus(422);

        // Pack ber-riwayat tidak bisa dihapus; pack segar bisa (+ banner ikut terhapus).
        $this->actingAs($admin, 'sanctum');
        $this->deleteJson("/api/admin/gacha/packs/{$pack->json('id')}")->assertStatus(422);
        $fresh = $this->postJson('/api/admin/gacha/packs', [
            'name' => 'Hapus Saya', 'price' => 10,
            'rates' => ['bronze' => 100], 'allowed_ranks' => ['bronze'],
        ])->assertCreated();
        $this->deleteJson("/api/admin/gacha/packs/{$fresh->json('id')}")->assertOk();
        $this->assertDatabaseMissing('gacha_packs', ['id' => $fresh->json('id')]);
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

    public function test_category_filter_basic_potw_all(): void
    {
        $this->seed();
        $admin = User::where('email', 'admin@footballfun.test')->first();
        $this->actingAs($admin, 'sanctum');

        $total = Player::count();
        $this->assertGreaterThan(0, $total);

        // Tandai satu pemain sebagai POTW — data lain tidak berubah.
        $potw = Player::first();
        $potw->update(['is_potw' => true]);
        $this->assertEquals('potw', $potw->fresh()->card);
        $this->assertEquals($potw->rank, Player::find($potw->id)->rank);

        $user = User::where('email', 'sabian@test.com')->first();
        $this->actingAs($user, 'sanctum');

        // ALL = semua termasuk POTW.
        $all = $this->getJson('/api/players?per_page=100')->json();
        $this->assertEquals($total, $all['total']);
        $this->assertContains('potw', collect($all['data'])->pluck('card')->all());

        // BASIC = hanya kartu reguler, POTW dikecualikan.
        $basic = $this->getJson('/api/players?per_page=100&category=basic')->json();
        $this->assertEquals($total - 1, $basic['total']);
        $this->assertNotContains('potw', collect($basic['data'])->pluck('card')->all());

        // POTW = hanya pemain POTW.
        $only = $this->getJson('/api/players?per_page=100&category=potw')->json();
        $this->assertEquals(1, $only['total']);
        $this->assertEquals('potw', $only['data'][0]['card']);

        // Kategori bekerja bersamaan dengan posisi + search.
        $combo = $this->getJson('/api/players?per_page=100&category=basic&position='.$potw->position.'&search='.urlencode(substr($potw->name, 0, 4)))->json();
        $this->assertNotContains('potw', collect($combo['data'])->pluck('card')->all());
    }

    public function test_potw_pack_and_five_draws(): void
    {
        $this->seed();
        $user = User::where('email', 'sabian@test.com')->first();
        $user->update(['coins' => 999999]);
        $this->actingAs($user, 'sanctum');

        // Tandai 2 pemain sebagai POTW.
        $potws = Player::limit(2)->get();
        foreach ($potws as $p) {
            $p->update(['is_potw' => true]);
        }

        // Pack POTW 1x → pasti pemain POTW.
        $draw = $this->postJson('/api/gacha/potw/draw', ['count' => 1]);
        $draw->assertOk();
        $this->assertTrue((bool) Player::find($draw->json('player.id'))->is_potw);
        $this->assertEquals('potw', $draw->json('rank_rolled'));

        // Pack reguler 5x → 5 pemain, harga 5x, TIDAK ada POTW.
        $before = $user->fresh()->coins;
        $five = $this->postJson('/api/gacha/bronze/draw', ['count' => 5]);
        $five->assertOk();
        $this->assertCount(5, $five->json('players'));
        $this->assertEquals(500, $five->json('total_paid'));
        $this->assertEquals($before - 500, $five->json('coins'));
        $this->assertEquals($before - 500, $user->fresh()->coins);
        foreach ($five->json('players') as $pl) {
            $this->assertFalse((bool) Player::find($pl['id'])->is_potw);
        }

        // Jika SEMUA pemain aktif adalah POTW → pack reguler menolak (pool kosong).
        Player::query()->update(['is_potw' => true]);
        $this->postJson('/api/gacha/bronze/draw', ['count' => 1])->assertStatus(422);
        // Pack POTW tetap bisa (isi pool = semua pemain).
        $this->postJson('/api/gacha/potw/draw', ['count' => 5])->assertOk();
    }

    public function test_uploaded_photo_is_compressed_to_webp(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create(['role' => 'admin'])->fresh();
        $this->actingAs($admin, 'sanctum');

        $create = $this->post('/api/admin/players', [
            'name' => 'Kompres', 'club' => 'Test FC', 'position' => 'FW',
            'shirt_number' => 9, 'age' => 20,
            'pac' => 80, 'sho' => 80, 'pas' => 80, 'dri' => 80, 'def' => 50, 'phy' => 70,
            'image' => UploadedFile::fake()->image('player.jpg', 1600, 1200),
        ]);
        $create->assertCreated();
        $path = $create->json('image_path');
        // Otomatis jadi .webp (bukan .jpg asli) dan tersimpan di disk.
        $this->assertStringEndsWith('.webp', $path);
        Storage::disk('public')->assertExists($path);
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

    public function test_pvp_win_grants_free_pack_and_live_events(): void
    {
        $this->seed();
        $challenger = User::where('email', 'sabian@test.com')->first();
        $opponent = User::factory()->create(['role' => 'user']);
        $this->actingAs($challenger, 'sanctum');

        // Penantang diisi 11 OVR teratas, lawan 11 OVR terbawah.
        $strong = Player::orderByDesc('ovr')->limit(11)->get();
        $weak = Player::orderBy('ovr')->limit(11)->get();
        $this->assertCount(11, $strong);
        $this->assertCount(11, $weak);

        $slots = [
            ['GK', 'GK'], ['LB', 'DF'], ['CB1', 'DF'], ['CB2', 'DF'], ['RB', 'DF'],
            ['LM', 'MF'], ['CM1', 'MF'], ['CM2', 'MF'], ['RM', 'MF'],
            ['ST1', 'FW'], ['ST2', 'FW'],
        ];
        $fillXi = function (User $user, $players) use ($slots) {
            $lineup = Lineup::create(['user_id' => $user->id, 'formation' => '4-4-2']);
            foreach ($players->values() as $i => $p) {
                LineupSlot::create([
                    'lineup_id' => $lineup->id,
                    'slot_id' => $slots[$i][0], 'slot_position' => $slots[$i][1],
                    'player_id' => $p->id, 'is_bench' => false,
                ]);
            }
        };
        $fillXi($challenger, $strong);
        $fillXi($opponent, $weak);

        $won = false;
        for ($t = 0; $t < 6 && ! $won; $t++) {
            $res = $this->postJson('/api/matches/challenge', ['opponent_id' => $opponent->id]);
            $res->assertCreated();
            $json = $res->json();
            // Kontrak untuk live score di frontend.
            $this->assertArrayHasKey('reward_pack', $json);
            $this->assertArrayHasKey('reward_draws', $json);
            $this->assertNotEmpty($json['snapshot']['details']['events']);

            if ($json['result'] === 'challenger_win') {
                $won = true;
                $this->assertNotNull($json['reward_pack']);
                $this->assertNotEmpty($json['reward_draws']);
                $draw = $json['reward_draws'][0];
                $this->assertArrayHasKey('rank_rolled', $draw);
                $this->assertArrayHasKey('name', $draw);
                // Hadiah gratis: masuk koleksi + riwayat gacha tanpa bayar.
                $this->assertDatabaseHas('user_players', ['user_id' => $challenger->id, 'player_id' => $draw['id']]);
                $this->assertDatabaseHas('gacha_results', ['user_id' => $challenger->id, 'player_id' => $draw['id'], 'price_paid' => 0]);
                $challenger->refresh();
            }
        }
        $this->assertTrue($won, 'Penantang OVR jauh di atas seharusnya menang dalam 6x coba.');
    }

    public function test_ucl_card_priority_cap_and_category(): void
    {
        $base = [
            'name' => 'UCL Tester', 'club' => 'Test FC', 'position' => 'CAM',
            'pac' => 99, 'sho' => 99, 'pas' => 99, 'dri' => 99, 'def' => 99, 'phy' => 99,
        ];
        $ucl = Player::create(array_merge($base, ['is_ucl' => true]));

        // Prioritas kartu: UCL di atas POTW/rank, di bawah Flashback. OVR dicap 97.
        $this->assertEquals('ucl', $ucl->card);
        $this->assertEquals(97, $ucl->ovr);
        $this->assertEquals(97, GameService::ovrFor(array_merge($base, ['is_ucl' => true])));
        $flash = Player::create(array_merge($base, ['name' => 'Flash', 'is_ucl' => true, 'is_flashback' => true]));
        $this->assertEquals('flashback', $flash->card);

        // Filter kategori ucl hanya mengembalikan pemain UCL.
        $admin = User::create(['name' => 'A', 'email' => 'a'.uniqid().'@t.co', 'password' => 'password123', 'role' => 'admin']);
        $res = $this->actingAs($admin)->getJson('/api/players?category=ucl&per_page=50');
        $res->assertOk();
        $ids = collect($res->json('data'))->pluck('id')->all();
        $this->assertContains($ucl->id, $ids);
        foreach ($res->json('data') as $row) {
            $this->assertTrue((bool) ($row['is_ucl'] ?? false));
        }
    }

    public function test_halloween_card_priority_cap_and_category(): void
    {
        $base = [
            'name' => 'Halloween Tester', 'club' => 'Test FC', 'position' => 'CAM',
            'pac' => 99, 'sho' => 99, 'pas' => 99, 'dri' => 99, 'def' => 99, 'phy' => 99,
        ];
        $halloween = Player::create(array_merge($base, ['is_halloween' => true]));

        // Prioritas: Halloween di atas UEFA/POTW/rank, di bawah Flashback.
        // OVR Halloween dikunci pada rentang 78-98, sedangkan Flashback tetap max 97.
        $this->assertEquals('halloween', $halloween->card);
        $this->assertEquals(98, $halloween->ovr);
        $this->assertEquals(98, GameService::ovrFor(array_merge($base, ['is_halloween' => true])));
        $lowStats = array_merge($base, [
            'pac' => 55, 'sho' => 55, 'pas' => 55, 'dri' => 55, 'def' => 55, 'phy' => 55,
            'is_halloween' => true,
        ]);
        $this->assertEquals(78, GameService::ovrFor($lowStats));
        $flash = Player::create(array_merge($base, ['name' => 'Flash HW', 'is_halloween' => true, 'is_flashback' => true]));
        $this->assertEquals('flashback', $flash->card);
        $this->assertEquals(97, GameService::ovrFor(array_merge($base, ['is_halloween' => true, 'is_flashback' => true])));

        // Filter kategori halloween hanya mengembalikan pemain Halloween.
        $admin = User::create(['name' => 'A', 'email' => 'hw'.uniqid().'@t.co', 'password' => 'password123', 'role' => 'admin']);
        $res = $this->actingAs($admin)->getJson('/api/players?category=halloween&per_page=50');
        $res->assertOk();
        $ids = collect($res->json('data'))->pluck('id')->all();
        $this->assertContains($halloween->id, $ids);
        foreach ($res->json('data') as $row) {
            $this->assertTrue((bool) ($row['is_halloween'] ?? false));
        }

        // Kartu reguler (BASIC) tidak ikut terpengaruh.
        $basic = $this->actingAs($admin)->getJson('/api/players?category=basic&per_page=50');
        $basic->assertOk();
        $this->assertNotContains($halloween->id, collect($basic->json('data'))->pluck('id')->all());
    }

    public function test_fun_match_full_flow(): void
    {
        $this->seed();
        $admin = User::where('email', 'admin@footballfun.test')->first();
        $user = User::where('email', 'sabian@test.com')->first();

        $makeSquad = function (string $prefix) {
            $positions = ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'LW', 'ST', 'RW'];
            $out = [];
            foreach ($positions as $i => $pos) {
                // Semua 12 kolom stat wajib diisi (kolom DB tanpa default).
                $data = [
                    'name' => "{$prefix} {$pos} {$i}", 'club' => 'Test FC', 'position' => $pos,
                    'pac' => 80, 'sho' => 78, 'pas' => 80, 'dri' => 80, 'def' => 70, 'phy' => 78,
                    'div' => 80, 'han' => 80, 'kic' => 70, 'ref' => 82, 'spd' => 60, 'pos' => 78,
                ];
                $out[] = Player::create($data);
            }

            return $out;
        };

        // XI user lengkap (4-3-3).
        $mine = $makeSquad('Mine');
        $slotIds = ['GK', 'LB', 'CB1', 'CB2', 'RB', 'CM1', 'CM2', 'CM3', 'LW', 'ST', 'RW'];
        $lineup = Lineup::create(['user_id' => $user->id, 'formation' => '4-3-3']);
        foreach ($mine as $i => $p) {
            $lineup->slots()->create([
                'slot_id' => $slotIds[$i],
                'slot_position' => GameService::baseGroup($p->position),
                'player_id' => $p->id, 'is_bench' => false,
            ]);
        }

        // Admin upload tim fun Manchester United + XI-nya.
        $cpu = $makeSquad('United');
        $this->actingAs($admin, 'sanctum');
        $starters = [];
        foreach ($cpu as $i => $p) {
            $starters[] = ['slot_id' => $slotIds[$i], 'player_id' => $p->id];
        }
        $categoryId = $this->postJson('/api/admin/fun-categories', ['name' => 'Eropa'])
            ->assertCreated()->json('id');
        $created = $this->postJson('/api/admin/fun-teams', [
            'name' => 'Manchester United', 'short_name' => 'MUN',
            'fun_category_id' => $categoryId,
            'formation' => '4-3-3', 'starters' => $starters,
        ])->assertCreated();
        $teamId = $created->json('id');
        $this->assertEquals(11, $created->json('filled'));

        // User melihat daftar tim + kesulitan, lalu main level mudah.
        $this->actingAs($user, 'sanctum');
        $list = $this->getJson('/api/fun-teams')->assertOk();
        $this->assertNotEmpty($list->json('difficulties'));
        $this->assertEquals(-8, $list->json('difficulties.mudah.modifier'));

        $played = $this->postJson("/api/fun-teams/{$teamId}/play", ['difficulty' => 'mudah'])->assertCreated();
        $this->assertNull($played->json('opponent_id'));
        $this->assertEquals($teamId, $played->json('fun_team_id'));
        $this->assertEquals('mudah', $played->json('difficulty'));
        $snap = $played->json('snapshot');
        $this->assertEquals('Manchester United', $snap['fun_team']['name']);
        $this->assertEquals(-8, $snap['modifier']);
        $this->assertEquals(max(40, min(99, $snap['opponent']['base_ovr'] - 8)), $played->json('opponent_ovr'));
        $this->assertNotEmpty($snap['details']['events']);

        // Riwayat user memuat laga fun tersebut.
        $this->assertDatabaseHas('matches', ['challenger_id' => $user->id, 'fun_team_id' => $teamId]);

        // Validasi: difficulty asal ditolak, tim nonaktif ditolak.
        $this->postJson("/api/fun-teams/{$teamId}/play", ['difficulty' => 'ultra'])->assertStatus(422);
        $this->actingAs($admin, 'sanctum');
        $this->postJson("/api/admin/fun-teams/{$teamId}/toggle-active")->assertOk();
        $this->actingAs($user, 'sanctum');
        $this->postJson("/api/fun-teams/{$teamId}/play", ['difficulty' => 'mudah'])->assertStatus(422);
    }
}
