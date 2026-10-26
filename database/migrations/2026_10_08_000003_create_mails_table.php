<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kotak surat hadiah: admin mengirim koin dan/atau pemain ke user,
     * user mengklaimnya lewat halaman Mail. Satu baris = satu penerima.
     */
    public function up(): void
    {
        Schema::create('mails', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('subject', 150);
            $table->text('body')->nullable();
            $table->unsignedInteger('coin_amount')->default(0);
            $table->foreignId('player_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('is_read')->default(false);
            $table->timestamp('claimed_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_read']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mails');
    }
};
