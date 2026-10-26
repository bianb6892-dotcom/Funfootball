<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ikon globe benua Font Awesome untuk kategori Fun Match.
     */
    public function up(): void
    {
        Schema::table('fun_categories', function (Blueprint $table) {
            $table->string('icon', 50)->default('fa-earth-asia')->after('name');
        });

        $icons = [
            'eropa' => 'fa-earth-europe',
            'europe' => 'fa-earth-europe',
            'asia' => 'fa-earth-asia',
            'afrika' => 'fa-earth-africa',
            'africa' => 'fa-earth-africa',
            'amerika' => 'fa-earth-americas',
            'americas' => 'fa-earth-americas',
            'oseania' => 'fa-earth-oceania',
            'oceania' => 'fa-earth-oceania',
            'australia' => 'fa-earth-oceania',
        ];

        foreach (DB::table('fun_categories')->get() as $category) {
            $name = strtolower(trim((string) $category->name));
            $icon = 'fa-globe';

            foreach ($icons as $needle => $candidate) {
                if (str_contains($name, $needle)) {
                    $icon = $candidate;
                    break;
                }
            }

            DB::table('fun_categories')->where('id', $category->id)->update(['icon' => $icon]);
        }
    }

    public function down(): void
    {
        Schema::table('fun_categories', function (Blueprint $table) {
            $table->dropColumn('icon');
        });
    }
};
