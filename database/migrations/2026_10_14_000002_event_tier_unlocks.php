<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Unlock node per tier: bayar token sekali untuk buka node,
     * retry berikutnya gratis sampai menang (dibatasi max_entries).
     */
    public function up(): void
    {
        Schema::create('event_tier_unlocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('tier')->default(1);
            $table->unsignedTinyInteger('tokens_spent')->default(0);
            $table->timestamps();

            $table->unique(['event_id', 'user_id', 'tier']);
            $table->index(['user_id', 'event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_tier_unlocks');
    }
};
