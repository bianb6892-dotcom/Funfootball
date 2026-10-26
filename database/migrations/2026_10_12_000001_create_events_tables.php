<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->string('formation', 10)->default('4-3-3');
            $table->unsignedInteger('reward_coins')->default(0);
            $table->foreignId('reward_player_id')->nullable()->constrained('players')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['is_active', 'starts_at', 'ends_at']);
        });

        Schema::create('event_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('slot_id', 10);
            $table->enum('slot_position', ['GK', 'DF', 'MF', 'FW']);
            $table->foreignId('player_id')->nullable()->constrained('players')->nullOnDelete();
            $table->timestamps();
            $table->unique(['event_id', 'slot_id']);
        });

        // Aturan XI user: kind = country|rank, code = FR / gold / ...,
        // operator = eq (tepat N) | lte (maks N) | gte (min N), count = N.
        Schema::create('event_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 20); // country | rank
            $table->string('code', 20); // FR / gold / ...
            $table->string('operator', 5)->default('eq'); // eq | lte | gte
            $table->unsignedTinyInteger('count')->default(0);
            $table->timestamps();
            $table->index('event_id');
        });

        Schema::create('event_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('user_ovr');
            $table->unsignedTinyInteger('event_ovr');
            $table->unsignedTinyInteger('user_score');
            $table->unsignedTinyInteger('event_score');
            $table->enum('result', ['user_win', 'event_win', 'draw']);
            $table->boolean('reward_granted')->default(false);
            $table->unsignedInteger('reward_coins')->default(0);
            $table->foreignId('reward_player_id')->nullable()->constrained('players')->nullOnDelete();
            $table->json('snapshot')->nullable();
            $table->timestamp('played_at')->useCurrent();
            $table->timestamps();
            $table->index(['event_id', 'user_id']);
            $table->index(['user_id', 'played_at']);
        });

        DB::statement("ALTER TABLE user_players MODIFY acquired_via ENUM('gacha', 'admin_grant', 'starter', 'mail', 'event') DEFAULT 'gacha'");
        DB::statement("ALTER TABLE coin_transactions MODIFY type ENUM('gacha_spend', 'admin_adjust', 'register_bonus', 'match_reward', 'mail_claim', 'event_reward')");
    }

    public function down(): void
    {
        Schema::dropIfExists('event_attempts');
        Schema::dropIfExists('event_rules');
        Schema::dropIfExists('event_slots');
        Schema::dropIfExists('events');
    }
};
