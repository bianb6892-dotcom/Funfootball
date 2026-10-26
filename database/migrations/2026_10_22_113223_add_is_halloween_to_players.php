<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kartu Halloween: flag seperti POTW/Flashback/UEFA.
     * Hanya mengubah kulit visual kartu; data, komposisi, dan perilaku tetap sama.
     * Prioritas kartu: Flashback > Halloween > UCL > UEL > UECL > POTW > rank.
     */
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->boolean('is_halloween')->default(false)->after('is_flashback');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('is_halloween');
        });
    }
};
