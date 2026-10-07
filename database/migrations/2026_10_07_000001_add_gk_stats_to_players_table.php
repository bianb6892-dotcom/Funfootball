<?php

use App\Models\Player;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->unsignedTinyInteger('div')->default(0)->after('phy');
            $table->unsignedTinyInteger('han')->default(0)->after('div');
            $table->unsignedTinyInteger('kic')->default(0)->after('han');
            $table->unsignedTinyInteger('ref')->default(0)->after('kic');
            $table->unsignedTinyInteger('spd')->default(0)->after('ref');
            $table->unsignedTinyInteger('pos')->default(0)->after('spd');
        });

        // Re-rating kiper existing ke atribut GK (FIFA-style), stat umum di-nol-kan.
        $keepers = [
            // name => [div, han, kic, ref, spd, pos]
            'Thibaut Courtois' => [84, 89, 76, 90, 45, 88], // OVR 85
            'Andre Onana' => [80, 82, 85, 83, 50, 78],       // OVR 80
            'Dedi Kurniawan' => [62, 60, 58, 64, 55, 61],     // OVR 61
        ];
        foreach ($keepers as $name => [$div, $han, $kic, $ref, $spd, $pos]) {
            DB::table('players')->where('name', $name)->where('position', 'GK')->update([
                'pac' => 0, 'sho' => 0, 'pas' => 0, 'dri' => 0, 'def' => 0, 'phy' => 0,
                'div' => $div, 'han' => $han, 'kic' => $kic, 'ref' => $ref, 'spd' => $spd, 'pos' => $pos,
            ]);
        }

        // Hitung ulang OVR semua kiper via model (pemicu saving → GameService).
        foreach (Player::where('position', 'GK')->get() as $keeper) {
            $keeper->save();
        }
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn(['div', 'han', 'kic', 'ref', 'spd', 'pos']);
        });
    }
};
