<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Services\GameService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlayerAttributesTest extends TestCase
{
    use RefreshDatabase;

    public function test_outfield_detailed_attributes_are_derived_from_summary_stats(): void
    {
        $player = Player::create([
            'name' => 'Detail Tester',
            'club' => 'Test FC',
            'position' => 'ST',
            'pac' => 90,
            'sho' => 85,
            'pas' => 80,
            'dri' => 88,
            'def' => 40,
            'phy' => 75,
        ]);

        $this->assertSame(91, $player->acceleration);
        $this->assertSame(90, $player->sprint_speed);
        $this->assertSame(85, $player->finishing);
        $this->assertSame(81, $player->short_passing);
        $this->assertSame(89, $player->ball_control);
        $this->assertSame(41, $player->interceptions);
        $this->assertSame(76, $player->stamina);
        $this->assertSame(
            GameService::calculateOvr(['pac' => 90, 'sho' => 85, 'pas' => 80, 'dri' => 88, 'def' => 40, 'phy' => 75], 'ST'),
            $player->ovr
        );
    }

    public function test_explicit_detailed_attribute_is_not_overwritten(): void
    {
        $player = Player::create([
            'name' => 'Custom Detail',
            'club' => 'Test FC',
            'position' => 'CM',
            'pac' => 80,
            'sho' => 78,
            'pas' => 86,
            'dri' => 84,
            'def' => 70,
            'phy' => 76,
            'acceleration' => 99,
        ]);

        $this->assertSame(99, $player->acceleration);
        $this->assertSame(80, $player->sprint_speed);
        $this->assertSame(87, $player->vision);
    }

    public function test_goalkeeper_detailed_attributes_are_derived_from_gk_summary(): void
    {
        $player = Player::create([
            'name' => 'Keeper Tester',
            'club' => 'Test FC',
            'position' => 'GK',
            'pac' => 0,
            'sho' => 0,
            'pas' => 0,
            'dri' => 0,
            'def' => 0,
            'phy' => 0,
            'div' => 84,
            'han' => 82,
            'kic' => 74,
            'ref' => 88,
            'spd' => 55,
            'pos' => 81,
        ]);

        $this->assertSame(84, $player->gk_diving);
        $this->assertSame(82, $player->gk_handling);
        $this->assertSame(74, $player->gk_kicking);
        $this->assertSame(81, $player->gk_positioning);
        $this->assertSame(88, $player->gk_reflexes);
        $this->assertSame(30, $player->acceleration);
    }
}
