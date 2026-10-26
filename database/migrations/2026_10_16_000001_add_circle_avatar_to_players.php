<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Saklar avatar lingkaran per pemain: 'thumb' (thumb wajah 256px, tajam di
     * lingkaran kecil) atau 'photo' (foto penuh, opt-out eksplisit admin).
     * Default 'thumb' agar koleksi/cadangan/lineup langsung tajam.
     */
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->string('circle_avatar', 10)->default('thumb')->after('thumb_path');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('circle_avatar');
        });
    }
};
