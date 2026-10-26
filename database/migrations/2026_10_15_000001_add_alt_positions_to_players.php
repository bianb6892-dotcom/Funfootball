<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Posisi alternatif (secondary positions): mis. Mbappe posisi utama ST,
     * posisi alternatif LW — dipasang di LW tidak kena penalti (OVR utuh).
     * Disimpan sebagai JSON array kode posisi detail, mis. ["LW","RW"].
     */
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->json('alt_positions')->nullable()->after('position');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('alt_positions');
        });
    }
};
