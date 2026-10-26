<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CollectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_collection_honors_per_page_so_the_full_lineup_pool_is_available(): void
    {
        $user = User::factory()->create(['role' => 'user', 'team_name' => 'Test FC'])->refresh();

        for ($i = 1; $i <= 30; $i++) {
            $player = Player::create([
                'name' => 'Player '.$i,
                'club' => 'Club',
                'nationality' => 'Indonesia',
                'country_code' => 'ID',
                'position' => 'CM',
                'pac' => 80,
                'sho' => 80,
                'pas' => 80,
                'dri' => 80,
                'def' => 80,
                'phy' => 80,
            ]);

            $user->userPlayers()->create([
                'player_id' => $player->id,
                'acquired_via' => 'gacha',
            ]);
        }

        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/collection')
            ->assertOk()
            ->assertJsonPath('per_page', 24)
            ->assertJsonCount(24, 'data');

        $this->getJson('/api/collection?per_page=500')
            ->assertOk()
            ->assertJsonPath('total', 30)
            ->assertJsonPath('per_page', 500)
            ->assertJsonCount(30, 'data');
    }
}
