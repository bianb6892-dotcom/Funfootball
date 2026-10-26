<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Flag kartu Flashback (dipilih di form tambah/edit pemain, sejajar POTW/Legend). */
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->boolean('is_flashback')->default(false)->after('is_potw');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('is_flashback');
        });
    }
};
