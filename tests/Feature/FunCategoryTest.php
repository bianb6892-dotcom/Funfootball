<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\User;
use App\Services\GameService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FunCategoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_group_fun_teams_by_continent_and_league(): void
    {
        $admin = User::factory()->create(['role' => 'admin'])->fresh();
        $this->actingAs($admin, 'sanctum');

        $category = $this->postJson('/api/admin/fun-categories', ['name' => 'Eropa'])
            ->assertCreated()
            ->assertJsonPath('icon', 'fa-earth-europe')
            ->json();

        $this->putJson("/api/admin/fun-categories/{$category['id']}", [
            'name' => 'Eropa',
            'icon' => 'fa-globe',
        ])->assertOk()->assertJsonPath('icon', 'fa-globe');

        $this->putJson("/api/admin/fun-categories/{$category['id']}", [
            'name' => 'Eropa',
            'icon' => null,
        ])->assertOk()->assertJsonPath('icon', 'fa-earth-europe');

        $league = $this->postJson('/api/admin/fun-leagues', [
            'fun_category_id' => $category['id'],
            'name' => 'Premier League',
        ])->assertCreated()->json();

        $team = $this->postJson('/api/admin/fun-teams', [
            'name' => 'Manchester United',
            'short_name' => 'MUN',
            'fun_category_id' => $category['id'],
            'fun_league_id' => $league['id'],
            'formation' => '4-3-3',
            'starters' => $this->starters(),
        ])->assertCreated();

        $this->assertSame('league', $team->json('type'));

        $user = User::factory()->create(['role' => 'user'])->fresh();
        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/fun-teams')
            ->assertOk()
            ->assertJsonPath('categories.0.name', 'Eropa')
            ->assertJsonPath('categories.0.icon', 'fa-earth-europe')
            ->assertJsonPath('categories.0.leagues.0.name', 'Premier League')
            ->assertJsonPath('categories.0.leagues.0.teams.0.name', 'Manchester United')
            ->assertJsonPath('categories.0.national_teams', []);
    }

    public function test_team_without_league_is_listed_as_national(): void
    {
        $admin = User::factory()->create(['role' => 'admin'])->fresh();
        $this->actingAs($admin, 'sanctum');

        $category = $this->postJson('/api/admin/fun-categories', ['name' => 'Asia'])
            ->assertCreated()
            ->assertJsonPath('icon', 'fa-earth-asia')
            ->json();

        $this->postJson('/api/admin/fun-teams', [
            'name' => 'Japan',
            'short_name' => 'JPN',
            'fun_category_id' => $category['id'],
            'fun_league_id' => null,
            'formation' => '4-3-3',
            'starters' => $this->starters(),
        ])->assertCreated()->assertJsonPath('type', 'national');

        $this->getJson('/api/fun-teams')
            ->assertOk()
            ->assertJsonPath('categories.0.name', 'Asia')
            ->assertJsonPath('categories.0.national_teams.0.name', 'Japan');
    }

    public function test_league_from_another_continent_is_rejected(): void
    {
        $admin = User::factory()->create(['role' => 'admin'])->fresh();
        $this->actingAs($admin, 'sanctum');

        $europe = $this->postJson('/api/admin/fun-categories', ['name' => 'Eropa'])->assertCreated()->json();
        $asia = $this->postJson('/api/admin/fun-categories', ['name' => 'Asia'])->assertCreated()->json();
        $league = $this->postJson('/api/admin/fun-leagues', [
            'fun_category_id' => $europe['id'],
            'name' => 'La Liga',
        ])->assertCreated()->json();

        $this->postJson('/api/admin/fun-teams', [
            'name' => 'Tim Salah Liga',
            'fun_category_id' => $asia['id'],
            'fun_league_id' => $league['id'],
            'formation' => '4-3-3',
            'starters' => $this->starters(),
        ])->assertStatus(422);
    }

    public function test_admin_can_move_team_into_category_and_league(): void
    {
        $admin = User::factory()->create(['role' => 'admin'])->fresh();
        $this->actingAs($admin, 'sanctum');

        $europe = $this->postJson('/api/admin/fun-categories', ['name' => 'Eropa'])->assertCreated()->json();
        $asia = $this->postJson('/api/admin/fun-categories', ['name' => 'Asia'])->assertCreated()->json();
        $jLeague = $this->postJson('/api/admin/fun-leagues', [
            'fun_category_id' => $asia['id'],
            'name' => 'J1 League',
        ])->assertCreated()->json();

        $team = $this->postJson('/api/admin/fun-teams', [
            'name' => 'Tim Pindah',
            'fun_category_id' => $europe['id'],
            'fun_league_id' => null,
            'formation' => '4-3-3',
            'starters' => $this->starters(),
        ])->assertCreated()->json();

        $this->postJson("/api/admin/fun-teams/{$team['id']}/assign-category", [
            'fun_category_id' => $asia['id'],
            'fun_league_id' => $jLeague['id'],
        ])
            ->assertOk()
            ->assertJsonPath('fun_category_id', $asia['id'])
            ->assertJsonPath('fun_league_id', $jLeague['id'])
            ->assertJsonPath('category.name', 'Asia')
            ->assertJsonPath('league.name', 'J1 League');

        $this->postJson("/api/admin/fun-teams/{$team['id']}/assign-category", [
            'fun_category_id' => null,
            'fun_league_id' => null,
        ])
            ->assertOk()
            ->assertJsonPath('fun_category_id', null)
            ->assertJsonPath('fun_league_id', null);
    }

    /** @return array<int, array{slot_id:string, player_id:int}> */
    private function starters(): array
    {
        $players = [];
        foreach (range(1, 11) as $i) {
            $players[] = Player::create([
                'name' => "Player {$i}",
                'club' => 'Test Club',
                'position' => 'MF',
                'pac' => 70, 'sho' => 70, 'pas' => 70,
                'dri' => 70, 'def' => 70, 'phy' => 70,
                'ovr' => 70, 'rank' => 'silver',
            ]);
        }

        return collect(GameService::FORMATIONS['4-3-3'])
            ->values()
            ->map(fn ($slot, $index) => [
                'slot_id' => $slot['id'],
                'player_id' => $players[$index]->id,
            ])
            ->all();
    }
}
