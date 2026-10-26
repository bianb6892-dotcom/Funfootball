<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Line-up per tier event: admin boleh mengganti XI tiap tier,
     * atau mencentang "gunakan line-up sebelumnya" (reuse).
     * Tier 1 selalu memakai XI utama event (event_slots).
     */
    public function up(): void
    {
        Schema::table('event_reward_tiers', function (Blueprint $table) {
            $table->string('formation', 10)->nullable()->after('ovr_boost');
            $table->boolean('use_previous_lineup')->default(true)->after('formation');
        });

        Schema::create('event_tier_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_reward_tier_id')->constrained('event_reward_tiers')->cascadeOnDelete();
            $table->string('slot_id', 10);
            $table->enum('slot_position', ['GK', 'DF', 'MF', 'FW']);
            $table->foreignId('player_id')->nullable()->constrained('players')->nullOnDelete();
            $table->timestamps();
            $table->unique(['event_reward_tier_id', 'slot_id'], 'tier_slot_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_tier_slots');
        Schema::table('event_reward_tiers', function (Blueprint $table) {
            $table->dropColumn(['formation', 'use_previous_lineup']);
        });
    }
};
