<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Tambah tipe transaksi 'mail_claim' untuk pencatatan klaim hadiah mail. */
    public function up(): void
    {
        DB::statement("ALTER TABLE coin_transactions MODIFY type ENUM('gacha_spend', 'admin_adjust', 'register_bonus', 'match_reward', 'mail_claim')");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE coin_transactions MODIFY type ENUM('gacha_spend', 'admin_adjust', 'register_bonus', 'match_reward')");
    }
};
