<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kartu spesial UCL (UEFA Champions League): flag seperti POTW/Flashback.
     * Prioritas kartu: FLASHBACK > UCL > POTW > rank. OVR dicap max 97.
     */
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->boolean('is_ucl')->default(false)->after('is_flashback');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('is_ucl');
        });
    }
};
