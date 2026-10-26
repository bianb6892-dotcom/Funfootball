<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Thumb wajah dan pilihan avatar lingkaran sudah dihapus: semua tampilan
     * lineup/bench/picker memakai foto penuh (image_path).
     */
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn(['circle_avatar', 'thumb_path']);
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->string('thumb_path')->nullable()->after('image_path');
            $table->string('circle_avatar', 10)->default('photo')->after('thumb_path');
        });
    }
};
