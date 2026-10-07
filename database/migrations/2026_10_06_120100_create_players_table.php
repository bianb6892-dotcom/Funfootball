<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('club');
            $table->string('nationality')->nullable();
            $table->enum('position', ['GK', 'DF', 'MF', 'FW']);
            $table->unsignedTinyInteger('shirt_number')->default(10);
            $table->unsignedTinyInteger('age')->default(25);
            $table->string('image_path')->nullable();
            $table->unsignedTinyInteger('pac');
            $table->unsignedTinyInteger('sho');
            $table->unsignedTinyInteger('pas');
            $table->unsignedTinyInteger('dri');
            $table->unsignedTinyInteger('def');
            $table->unsignedTinyInteger('phy');
            $table->unsignedTinyInteger('ovr');
            $table->enum('rank', ['bronze', 'silver', 'gold', 'diamond']);
            $table->boolean('manual_rank')->default(false);
            $table->boolean('is_active_in_gacha')->default(true);
            $table->timestamps();
            $table->index(['position', 'rank']);
            $table->index('ovr');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('players');
    }
};
