<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('player_id')->constrained()->cascadeOnDelete();
            $table->enum('acquired_via', ['gacha', 'admin_grant', 'starter'])->default('gacha');
            $table->timestamps();
            $table->unique(['user_id', 'player_id']);
            $table->index('user_id');
        });

        Schema::create('lineups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('formation', 10)->default('4-3-3');
            $table->timestamps();
        });

        Schema::create('lineup_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lineup_id')->constrained()->cascadeOnDelete();
            $table->string('slot_id', 10);
            $table->enum('slot_position', ['GK', 'DF', 'MF', 'FW']);
            $table->foreignId('player_id')->nullable()->constrained('players')->nullOnDelete();
            $table->boolean('is_bench')->default(false);
            $table->unsignedTinyInteger('bench_order')->nullable();
            $table->timestamps();
            $table->unique(['lineup_id', 'slot_id', 'is_bench']);
            $table->index(['lineup_id', 'is_bench']);
        });

        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('challenger_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('opponent_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('challenger_ovr');
            $table->unsignedTinyInteger('opponent_ovr');
            $table->unsignedTinyInteger('challenger_score');
            $table->unsignedTinyInteger('opponent_score');
            $table->enum('result', ['challenger_win', 'opponent_win', 'draw']);
            $table->json('snapshot');
            $table->timestamp('played_at')->useCurrent();
            $table->timestamps();
            $table->index(['challenger_id', 'played_at']);
            $table->index(['opponent_id', 'played_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matches');
        Schema::dropIfExists('lineup_slots');
        Schema::dropIfExists('lineups');
        Schema::dropIfExists('user_players');
    }
};
