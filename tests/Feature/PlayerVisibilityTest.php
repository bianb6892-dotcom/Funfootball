<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlayerVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_regular_users_cannot_view_hidden_player_detail(): void
    {
        $user = User::factory()->create(['role' => 'user'])->refresh();
        $visible = $this->createPlayer('Visible Player');
        $hidden = $this->createPlayer('Hidden Player', false);

        $this->actingAs($user, 'sanctum');

        $this->getJson("/api/players/{$visible->id}")->assertOk();
        $this->getJson("/api/players/{$hidden->id}")->assertNotFound();
    }

    public function test_admins_can_view_hidden_player_detail(): void
    {
        $admin = User::factory()->create(['role' => 'admin'])->refresh();
        $hidden = $this->createPlayer('Hidden Player', false);

        $this->actingAs($admin, 'sanctum');

        $this->getJson("/api/players/{$hidden->id}")
            ->assertOk()
            ->assertJsonPath('id', $hidden->id);
    }

    public function test_regular_users_cannot_compare_hidden_players(): void
    {
        $user = User::factory()->create(['role' => 'user'])->refresh();
        $visible = $this->createPlayer('Visible Player');
        $hidden = $this->createPlayer('Hidden Player', false);

        $this->actingAs($user, 'sanctum');

        $this->getJson("/api/players/compare?ids[]={$visible->id}&ids[]={$hidden->id}")
            ->assertNotFound();
    }

    public function test_admins_can_compare_hidden_players(): void
    {
        $admin = User::factory()->create(['role' => 'admin'])->refresh();
        $visible = $this->createPlayer('Visible Player');
        $hidden = $this->createPlayer('Hidden Player', false);

        $this->actingAs($admin, 'sanctum');

        $this->getJson("/api/players/compare?ids[]={$visible->id}&ids[]={$hidden->id}")
            ->assertOk()
            ->assertJsonCount(2, 'players');
    }

    private function createPlayer(string $name, bool $isVisible = true): Player
    {
        return Player::create([
            'name' => $name,
            'club' => 'Test FC',
            'nationality' => 'Indonesia',
            'country_code' => 'ID',
            'position' => 'CM',
            'pac' => 80,
            'sho' => 80,
            'pas' => 80,
            'dri' => 80,
            'def' => 80,
            'phy' => 80,
            'is_visible' => $isVisible,
        ]);
    }
}
