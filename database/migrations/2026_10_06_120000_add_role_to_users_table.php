<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 10)->default('user')->after('password');
            $table->string('team_name')->nullable()->after('role');
            $table->unsignedInteger('coins')->default(1000)->after('team_name');
            $table->boolean('is_active')->default(true)->after('coins');
            $table->index('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
            $table->dropColumn(['role', 'team_name', 'coins', 'is_active']);
        });
    }
};
