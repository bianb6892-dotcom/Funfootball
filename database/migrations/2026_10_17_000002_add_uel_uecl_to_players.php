<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kartu UEFA: UEL (Europa League, oranye-hitam) dan
     * UECL (Conference League, hijau neon-gelap).
     * Melengkapi UCL yang sudah ada; ketiganya tergabung
     * dalam kategori grup "UEFA League".
     */
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->boolean('is_uel')->default(false)->after('is_ucl');
            $table->boolean('is_uecl')->default(false)->after('is_uel');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn(['is_uel', 'is_uecl']);
        });
    }
};
