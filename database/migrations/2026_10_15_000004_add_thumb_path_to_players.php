<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Thumbnail wajah (persegi, fokus kepala/bahu) untuk lingkaran kecil
     * lineup/bench/picker. Foto full-body yang dikecilkan langsung membuat
     * wajah tak terbaca — thumb dipotong dari area atas lalu dikecilkan.
     */
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->string('thumb_path')->nullable()->after('image_path');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('thumb_path');
        });
    }
};
