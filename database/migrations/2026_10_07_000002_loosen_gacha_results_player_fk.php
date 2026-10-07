<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gacha_results', function (Blueprint $table) {
            $table->string('player_name')->nullable()->after('player_id');
            $table->unsignedTinyInteger('ovr')->nullable()->after('player_name');
        });

        // Backfill nama + OVR dari pemain yang masih ada.
        DB::table('gacha_results')
            ->join('players', 'players.id', '=', 'gacha_results.player_id')
            ->update([
                'gacha_results.player_name' => DB::raw('players.name'),
                'gacha_results.ovr' => DB::raw('players.ovr'),
            ]);

        // Longgarkan FK: hapus pemain tidak lagi diblokir, history tetap utuh (nama tersnapshot).
        DB::statement('ALTER TABLE `gacha_results` DROP FOREIGN KEY `gacha_results_player_id_foreign`');
        DB::statement('ALTER TABLE `gacha_results` MODIFY `player_id` BIGINT UNSIGNED NULL');
        Schema::table('gacha_results', function (Blueprint $table) {
            $table->foreign('player_id')->references('id')->on('players')->nullOnDelete();
        });
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE `gacha_results` DROP FOREIGN KEY `gacha_results_player_id_foreign`');
        DB::statement('ALTER TABLE `gacha_results` MODIFY `player_id` BIGINT UNSIGNED NOT NULL');
        Schema::table('gacha_results', function (Blueprint $table) {
            $table->foreign('player_id')->references('id')->on('players')->restrictOnDelete();
            $table->dropColumn(['player_name', 'ovr']);
        });
    }
};
