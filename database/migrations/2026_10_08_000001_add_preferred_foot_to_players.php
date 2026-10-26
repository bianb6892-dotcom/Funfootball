<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kaki utama pemain (preferred foot): left / right / both (dua kaki).
     * Default 'right' agar data lama tetap valid tanpa penalti tambahan.
     */
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->string('preferred_foot', 10)->default('right')->after('position');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('preferred_foot');
        });
    }
};
