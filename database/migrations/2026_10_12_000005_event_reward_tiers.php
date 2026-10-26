<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Hadiah bertingkat per event: kemenangan ke-N memberi hadiah tier-N
     * (koin/pemain/pack + boost kesulitan lawan). Admin yang menentukan.
     * Kolom tier di attempts mencatat kemenangan ke berapa tiap percobaan.
     * max_entries_per_user = batas masuk event per user (null = tanpa batas).
     */
    public function up(): void
    {
        Schema::create('event_reward_tiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('tier');
            $table->unsignedInteger('reward_coins')->default(0);
            $table->foreignId('reward_player_id')->nullable()->constrained('players')->nullOnDelete();
            $table->foreignId('reward_pack_id')->nullable()->constrained('gacha_packs')->nullOnDelete();
            $table->unsignedTinyInteger('reward_pack_draws')->default(0);
            $table->unsignedTinyInteger('ovr_boost')->default(0);
            $table->timestamps();
            $table->unique(['event_id', 'tier']);
        });

        Schema::table('events', function (Blueprint $table) {
            $table->unsignedTinyInteger('max_entries_per_user')->nullable()->after('reward_pack_draws');
        });

        Schema::table('event_attempts', function (Blueprint $table) {
            $table->unsignedTinyInteger('tier')->default(1)->after('result');
        });
    }

    public function down(): void
    {
        Schema::table('event_attempts', function (Blueprint $table) {
            $table->dropColumn('tier');
        });
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('max_entries_per_user');
        });
        Schema::dropIfExists('event_reward_tiers');
    }
};
