<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Mail token + rentang waktu berlaku:
     * - token_amount: lampiran token event (selain koin/pemain)
     * - available_from: mail mulai berlaku (tenggat "dari"), null = langsung berlaku
     *   expires_at yang sudah ada menjadi tenggat "sampai".
     */
    public function up(): void
    {
        Schema::table('mails', function (Blueprint $table) {
            $table->unsignedInteger('token_amount')->default(0)->after('coin_amount');
            $table->timestamp('available_from')->nullable()->after('expires_at');
            $table->index(['user_id', 'available_from']);
        });
    }

    public function down(): void
    {
        Schema::table('mails', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'available_from']);
            $table->dropColumn(['token_amount', 'available_from']);
        });
    }
};
