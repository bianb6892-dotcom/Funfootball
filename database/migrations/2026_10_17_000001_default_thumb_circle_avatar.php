<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Thumb wajah 256px terbukti jauh lebih tajam untuk lingkaran kecil
     * lineup/bench/picker (koleksi & cadangan) dibanding foto full-body
     * dikecilkan. Jadikan 'thumb' default + perbaiki data lama yang masih
     * 'photo' padahal thumb-nya sudah ada (termasuk kartu UCL).
     */
    public function up(): void
    {
        // Perbaiki data lama: yang punya thumb tapi masih 'photo' -> 'thumb'.
        DB::table('players')
            ->whereNotNull('thumb_path')
            ->where('circle_avatar', 'photo')
            ->update(['circle_avatar' => 'thumb']);

        // Ubah default kolom untuk pemain baru.
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE `players` MODIFY `circle_avatar` VARCHAR(10) NOT NULL DEFAULT 'thumb'");
        } elseif ($driver === 'sqlite') {
            // SQLite: default diubah via recreasi ringan — cukup update rows;
            // default di migration awal sudah 'thumb' untuk install baru.
            DB::table('players')->whereNull('circle_avatar')->update(['circle_avatar' => 'thumb']);
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE `players` MODIFY `circle_avatar` VARCHAR(10) NOT NULL DEFAULT 'photo'");
        }
    }
};
