<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Hadiah pack gacha pada event: pack pilihan + jumlah draw gratis saat menang pertama. */
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->foreignId('reward_pack_id')->nullable()->after('reward_player_id')->constrained('gacha_packs')->nullOnDelete();
            $table->unsignedTinyInteger('reward_pack_draws')->default(0)->after('reward_pack_id');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reward_pack_id');
            $table->dropColumn('reward_pack_draws');
        });
    }
};
