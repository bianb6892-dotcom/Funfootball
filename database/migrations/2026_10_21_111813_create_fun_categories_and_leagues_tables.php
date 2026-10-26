<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kategori Fun Match: benua -> liga -> tim.
     * Tim tanpa liga dianggap tim nasional (national) di bawah benua.
     */
    public function up(): void
    {
        Schema::create('fun_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60)->unique();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index('is_active');
        });

        Schema::create('fun_leagues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fun_category_id')->constrained()->cascadeOnDelete();
            $table->string('name', 80);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['fun_category_id', 'name']);
            $table->index('is_active');
        });

        Schema::table('fun_teams', function (Blueprint $table) {
            $table->foreignId('fun_category_id')->nullable()->after('short_name')->constrained()->nullOnDelete();
            $table->foreignId('fun_league_id')->nullable()->after('fun_category_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('fun_teams', function (Blueprint $table) {
            $table->dropForeign(['fun_category_id']);
            $table->dropForeign(['fun_league_id']);
            $table->dropColumn(['fun_category_id', 'fun_league_id']);
        });

        Schema::dropIfExists('fun_leagues');
        Schema::dropIfExists('fun_categories');
    }
};
