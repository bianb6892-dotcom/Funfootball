<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fun Match: tim CPU yang diupload admin (mis. Manchester United) lengkap
     * dengan lineup XI-nya. User memilih tim + level kesulitan lalu bertanding.
     * Hasil laga fun ikut tersimpan di tabel matches (opponent_id NULL +
     * fun_team_id & difficulty terisi).
     */
    public function up(): void
    {
        Schema::create('fun_teams', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('short_name', 12)->nullable();
            $table->string('formation', 10)->default('4-3-3');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index('is_active');
        });

        Schema::create('fun_team_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fun_team_id')->constrained()->cascadeOnDelete();
            $table->string('slot_id', 10);
            $table->enum('slot_position', ['GK', 'DF', 'MF', 'FW']);
            $table->foreignId('player_id')->nullable()->constrained('players')->nullOnDelete();
            $table->timestamps();
            $table->unique(['fun_team_id', 'slot_id']);
        });

        Schema::table('matches', function (Blueprint $table) {
            $table->foreignId('fun_team_id')->nullable()->after('opponent_id')->constrained()->nullOnDelete();
            $table->string('difficulty', 10)->nullable()->after('fun_team_id');
        });

        if (DB::getDriverName() === 'mysql') {
            Schema::table('matches', function (Blueprint $table) {
                $table->dropForeign(['opponent_id']);
            });
            DB::statement('ALTER TABLE `matches` MODIFY `opponent_id` BIGINT UNSIGNED NULL');
            Schema::table('matches', function (Blueprint $table) {
                $table->foreign('opponent_id')->references('id')->on('users')->cascadeOnDelete();
            });
        } else {
            // SQLite (tests): tanpa doctrine/dbal, bangun ulang tabel agar
            // opponent_id nullable dengan data tetap dipertahankan.
            Schema::create('matches_new', function (Blueprint $table) {
                $table->id();
                $table->foreignId('challenger_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('opponent_id')->nullable()->constrained('users')->cascadeOnDelete();
                $table->foreignId('fun_team_id')->nullable()->constrained()->nullOnDelete();
                $table->string('difficulty', 10)->nullable();
                $table->unsignedTinyInteger('challenger_ovr');
                $table->unsignedTinyInteger('opponent_ovr');
                $table->unsignedTinyInteger('challenger_score');
                $table->unsignedTinyInteger('opponent_score');
                $table->enum('result', ['challenger_win', 'opponent_win', 'draw']);
                $table->json('snapshot');
                $table->timestamp('played_at')->useCurrent();
                $table->timestamps();
                $table->index(['challenger_id', 'played_at']);
                $table->index(['opponent_id', 'played_at']);
            });
            DB::statement('INSERT INTO matches_new (id, challenger_id, opponent_id, challenger_ovr, opponent_ovr, challenger_score, opponent_score, result, snapshot, played_at, created_at, updated_at) SELECT id, challenger_id, opponent_id, challenger_ovr, opponent_ovr, challenger_score, opponent_score, result, snapshot, played_at, created_at, updated_at FROM matches');
            Schema::drop('matches');
            Schema::rename('matches_new', 'matches');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('fun_team_slots');
        Schema::dropIfExists('fun_teams');

        // Kolom tambahan di matches dihapus; opponent_id dikembalikan NOT NULL
        // hanya bila tidak ada laga fun (opponent NULL) tersisa.
        if (DB::table('matches')->whereNull('opponent_id')->exists()) {
            throw new RuntimeException(
                'Rollback dibatalkan: masih ada laga fun match (opponent NULL). Hapus dulu riwayatnya.'
            );
        }

        Schema::table('matches', function (Blueprint $table) {
            $table->dropConstrainedForeignId('fun_team_id');
            $table->dropColumn('difficulty');
        });

        if (DB::getDriverName() === 'mysql') {
            Schema::table('matches', function (Blueprint $table) {
                $table->dropForeign(['opponent_id']);
            });
            DB::statement('ALTER TABLE `matches` MODIFY `opponent_id` BIGINT UNSIGNED NOT NULL');
            Schema::table('matches', function (Blueprint $table) {
                $table->foreign('opponent_id')->references('id')->on('users')->cascadeOnDelete();
            });
        }
    }
};
