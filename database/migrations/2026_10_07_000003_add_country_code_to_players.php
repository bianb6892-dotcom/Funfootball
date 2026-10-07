<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public const NAME_TO_CODE = [
        'Argentina' => 'AR', 'Portugal' => 'PT', 'Norway' => 'NO', 'France' => 'FR',
        'Belgium' => 'BE', 'Netherlands' => 'NL', 'Croatia' => 'HR', 'Brazil' => 'BR',
        'England' => 'GB-ENG', 'Cameroon' => 'CM', 'Indonesia' => 'ID',
        'Spain' => 'ES', 'Scotland' => 'GB-SCT', 'Ukraine' => 'UA',
        'Inggris' => 'GB-ENG', 'Belgia' => 'BE', 'Spanyol' => 'ES', 'Jerman' => 'DE',
        'Italia' => 'IT', 'Prancis' => 'FR', 'Belanda' => 'NL', 'Brasil' => 'BR', 'Kroasia' => 'HR',
    ];

    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->string('country_code', 8)->nullable()->after('nationality');
        });

        foreach (self::NAME_TO_CODE as $name => $code) {
            DB::table('players')->where('nationality', $name)->whereNull('country_code')->update([
                'country_code' => $code,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('country_code');
        });
    }
};
