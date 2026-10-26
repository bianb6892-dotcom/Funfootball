<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Status Player of the Week (POTW).
     * Additive column — data pemain lama tidak diubah (default false = kartu reguler).
     * Kartu efektif: is_potw ? 'potw' : rank (lihat Player::card).
     * BASIC = semua kartu reguler (diamond/gold/silver/bronze, is_potw=false).
     */
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->boolean('is_potw')->default(false)->after('manual_rank');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('is_potw');
        });
    }
};
