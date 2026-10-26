<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Perluas posisi pemain ke detail:
     * DF → LB, CB, RB | MF → LM, CM, CDM, CAM, RM | FW → LW, ST, SS, RW (+ GK)
     *
     * TANPA mengubah/menghapus data lama: kolom diubah dari ENUM(GK,DF,MF,FW)
     * menjadi VARCHAR(10) sehingga nilai lama (DF/MF/FW/GK) tetap tersimpan
     * apa adanya, dan nilai baru bisa masuk. Validasi daftar posisi
     * dilakukan di aplikasi (GameService::POSITIONS + PlayerController).
     */
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            // MODIFY preserves existing rows; VARCHAR allows old + new values.
            DB::statement('ALTER TABLE `players` MODIFY `position` VARCHAR(10) NOT NULL');
        } else {
            Schema::table('players', function (Blueprint $table) {
                $table->string('position', 10)->change();
            });
        }
    }

    public function down(): void
    {
        // Kembalikan ke ENUM lama HANYA bila tidak ada data posisi detail.
        // Jika masih ada data detail, down() dibatalkan agar tidak ada data terpotong.
        $detailExists = DB::table('players')
            ->whereNotIn('position', ['GK', 'DF', 'MF', 'FW'])
            ->exists();

        if ($detailExists) {
            throw new RuntimeException(
                'Rollback dibatalkan: masih ada pemain berposisi detail (LB/CB/RB/LM/CM/CDM/CAM/RM/LW/ST/SS/RW). '.
                'Ubah dulu ke DF/MF/FW/GK sebelum rollback.'
            );
        }

        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE `players` MODIFY `position` ENUM('GK','DF','MF','FW') NOT NULL");
        } else {
            Schema::table('players', function (Blueprint $table) {
                $table->string('position', 10)->change();
            });
        }
    }
};
