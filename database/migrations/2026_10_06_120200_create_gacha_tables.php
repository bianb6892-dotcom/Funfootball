<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gacha_packs', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->unsignedInteger('price');
            $table->string('color')->nullable();
            $table->json('rates');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('gacha_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pack_id')->constrained('gacha_packs')->restrictOnDelete();
            $table->foreignId('player_id')->constrained('players')->restrictOnDelete();
            $table->string('rank_rolled', 10);
            $table->unsignedInteger('price_paid');
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('coin_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('type', ['gacha_spend', 'admin_adjust', 'register_bonus', 'match_reward']);
            $table->integer('amount');
            $table->unsignedInteger('balance_after');
            $table->string('description')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coin_transactions');
        Schema::dropIfExists('gacha_results');
        Schema::dropIfExists('gacha_packs');
    }
};
