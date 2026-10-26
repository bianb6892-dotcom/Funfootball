<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const COLUMNS = [
        'acceleration', 'sprint_speed',
        'positioning', 'finishing', 'shot_power', 'long_shots', 'volleys', 'penalties',
        'vision', 'crossing', 'free_kick_accuracy', 'short_passing', 'long_passing', 'curve',
        'agility', 'balance', 'reactions', 'ball_control', 'dribbling', 'composure',
        'interceptions', 'heading_accuracy', 'def_awareness', 'standing_tackle', 'sliding_tackle',
        'jumping', 'stamina', 'strength', 'aggression',
        'gk_diving', 'gk_handling', 'gk_kicking', 'gk_positioning', 'gk_reflexes',
    ];

    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            foreach (self::COLUMNS as $column) {
                $table->unsignedTinyInteger($column)->nullable();
            }
        });

        DB::table('players')
            ->select(['id', 'pac', 'sho', 'pas', 'dri', 'def', 'phy', 'div', 'han', 'kic', 'ref', 'spd', 'pos'])
            ->orderBy('id')
            ->chunkById(200, function ($players) {
                foreach ($players as $player) {
                    DB::table('players')
                        ->where('id', $player->id)
                        ->update($this->detailedStats($player));
                }
            });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn(self::COLUMNS);
        });
    }

    private function detailedStats(object $player): array
    {
        $pac = (int) $player->pac;
        $sho = (int) $player->sho;
        $pas = (int) $player->pas;
        $dri = (int) $player->dri;
        $def = (int) $player->def;
        $phy = (int) $player->phy;

        return [
            'acceleration' => $this->clamp($pac + 1),
            'sprint_speed' => $this->clamp($pac),
            'positioning' => $this->clamp($sho - 1),
            'finishing' => $this->clamp($sho),
            'shot_power' => $this->clamp($sho + 1),
            'long_shots' => $this->clamp($sho - 2),
            'volleys' => $this->clamp($sho - 3),
            'penalties' => $this->clamp($sho - 2),
            'vision' => $this->clamp($pas + 1),
            'crossing' => $this->clamp($pas - 1),
            'free_kick_accuracy' => $this->clamp($pas - 2),
            'short_passing' => $this->clamp($pas + 1),
            'long_passing' => $this->clamp($pas),
            'curve' => $this->clamp($pas - 1),
            'agility' => $this->clamp($dri + 1),
            'balance' => $this->clamp($dri),
            'reactions' => $this->clamp($dri),
            'ball_control' => $this->clamp($dri + 1),
            'dribbling' => $this->clamp($dri),
            'composure' => $this->clamp($dri),
            'interceptions' => $this->clamp($def + 1),
            'heading_accuracy' => $this->clamp($def - 2),
            'def_awareness' => $this->clamp($def + 1),
            'standing_tackle' => $this->clamp($def),
            'sliding_tackle' => $this->clamp($def - 1),
            'jumping' => $this->clamp($phy),
            'stamina' => $this->clamp($phy + 1),
            'strength' => $this->clamp($phy),
            'aggression' => $this->clamp($phy - 1),
            'gk_diving' => $this->clamp((int) $player->div),
            'gk_handling' => $this->clamp((int) $player->han),
            'gk_kicking' => $this->clamp((int) $player->kic),
            'gk_positioning' => $this->clamp((int) $player->pos),
            'gk_reflexes' => $this->clamp((int) $player->ref),
        ];
    }

    private function clamp(int $value): int
    {
        return max(30, min(99, $value));
    }
};
