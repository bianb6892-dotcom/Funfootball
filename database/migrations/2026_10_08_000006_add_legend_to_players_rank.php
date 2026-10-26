<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Tambah rank 'legend' (kategori kartu khusus, diisi manual oleh admin). */
    public function up(): void
    {
        DB::statement("ALTER TABLE players MODIFY `rank` ENUM('bronze', 'silver', 'gold', 'diamond', 'legend')");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE players MODIFY `rank` ENUM('bronze', 'silver', 'gold', 'diamond')");
    }
};
