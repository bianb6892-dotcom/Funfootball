<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Tambah asal perolehan 'mail' untuk pemain yang didapat dari klaim kotak surat. */
    public function up(): void
    {
        DB::statement("ALTER TABLE user_players MODIFY acquired_via ENUM('gacha', 'admin_grant', 'starter', 'mail') DEFAULT 'gacha'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE user_players MODIFY acquired_via ENUM('gacha', 'admin_grant', 'starter') DEFAULT 'gacha'");
    }
};
