<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Token event + mini-game latihan per tier + klaim harian.
     * - users.event_tokens: saldo token untuk masuk challenge event.
     * - token_transactions: ledger token (klaim harian, hadiah, spend, adjust admin).
     * - daily_token_claims: 1 baris per user (tanggal klaim terakhir + streak).
     * - tiers: reward_tokens, token_cost (per attempt), challenge_type
     *   (match | free_kick | penalty | dribble).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('event_tokens')->default(0)->after('coins');
        });

        Schema::create('token_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            // daily_claim | event_reward | event_spend | admin_adjust | register_bonus
            $table->string('type', 30);
            $table->integer('amount');
            $table->unsignedInteger('balance_after');
            $table->string('description')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('daily_token_claims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->date('last_claimed_date')->nullable();
            $table->unsignedSmallInteger('streak')->default(0);
            $table->timestamps();
        });

        Schema::table('events', function (Blueprint $table) {
            $table->unsignedInteger('reward_tokens')->default(0)->after('reward_pack_draws');
            $table->unsignedTinyInteger('token_cost')->default(1)->after('reward_tokens');
        });

        Schema::table('event_reward_tiers', function (Blueprint $table) {
            $table->unsignedInteger('reward_tokens')->default(0)->after('reward_pack_draws');
            $table->unsignedTinyInteger('token_cost')->default(1)->after('reward_tokens');
            $table->string('challenge_type', 20)->default('match')->after('token_cost');
        });

        Schema::table('event_attempts', function (Blueprint $table) {
            $table->unsignedTinyInteger('tokens_spent')->default(0)->after('reward_player_id');
            $table->unsignedInteger('tokens_granted')->default(0)->after('tokens_spent');
            $table->string('challenge_type', 20)->default('match')->after('tokens_granted');
        });
    }

    public function down(): void
    {
        Schema::table('event_attempts', function (Blueprint $table) {
            $table->dropColumn(['tokens_spent', 'tokens_granted', 'challenge_type']);
        });
        Schema::table('event_reward_tiers', function (Blueprint $table) {
            $table->dropColumn(['reward_tokens', 'token_cost', 'challenge_type']);
        });
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn(['reward_tokens', 'token_cost']);
        });
        Schema::dropIfExists('daily_token_claims');
        Schema::dropIfExists('token_transactions');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('event_tokens');
        });
    }
};
