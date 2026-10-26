<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Visibilitas kartu di daftar pemain: bila false, disembunyikan dari user (admin tetap melihat). */
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->boolean('is_visible')->default(true)->after('is_active_in_gacha');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('is_visible');
        });
    }
};
