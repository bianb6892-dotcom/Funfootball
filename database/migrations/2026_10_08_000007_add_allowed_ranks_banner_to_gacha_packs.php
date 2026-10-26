<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pack gacha fleksibel: admin menentukan kartu isi pack (allowed_ranks,
     * 'potw' = pemain berstatus POTW) + banner gambar pack.
     */
    public function up(): void
    {
        Schema::table('gacha_packs', function (Blueprint $table) {
            $table->json('allowed_ranks')->nullable()->after('rates');
            $table->string('banner_path')->nullable()->after('allowed_ranks');
        });

        // Backfill agar pack lama berperilaku sama seperti sebelumnya.
        foreach (DB::table('gacha_packs')->get(['id', 'slug']) as $pack) {
            DB::table('gacha_packs')->where('id', $pack->id)->update([
                'allowed_ranks' => json_encode(
                    $pack->slug === 'potw' ? ['potw'] : ['bronze', 'silver', 'gold', 'diamond']
                ),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('gacha_packs', function (Blueprint $table) {
            $table->dropColumn(['allowed_ranks', 'banner_path']);
        });
    }
};
