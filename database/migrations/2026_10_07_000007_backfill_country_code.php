<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Isi country_code yang masih NULL/kosong dari nama negara,
     * agar semua bendera pemain memiliki gambar. Tidak mengubah
     * baris yang kodenya sudah terisi. Aman dijalankan ulang.
     */
    public function up(): void
    {
        $aliases = [
            'indonesia' => 'ID', 'france' => 'FR', 'francis' => 'FR',
            'hongaria' => 'HU', 'hungaria' => 'HU', 'hungary' => 'HU',
            'italy' => 'IT', 'italia' => 'IT', 'itali' => 'IT',
            'england' => 'GB-ENG', 'inggris' => 'GB-ENG',
            'spain' => 'ES', 'spanyol' => 'ES', 'germany' => 'DE', 'jerman' => 'DE',
            'portugal' => 'PT', 'brazil' => 'BR', 'brasil' => 'BR',
            'argentina' => 'AR', 'netherlands' => 'NL', 'belanda' => 'NL',
            'belgium' => 'BE', 'belgia' => 'BE', 'croatia' => 'HR', 'kroasia' => 'HR',
            'norway' => 'NO', 'norwegia' => 'NO', 'ukraine' => 'UA', 'ukraina' => 'UA',
            'cameroon' => 'CM', 'kamerun' => 'CM',
        ];

        foreach (DB::table('players')->where(fn ($q) => $q->whereNull('country_code')->orWhere('country_code', ''))->get(['id', 'nationality']) as $p) {
            $key = mb_strtolower(trim((string) $p->nationality));
            if (isset($aliases[$key])) {
                DB::table('players')->where('id', $p->id)->update(['country_code' => $aliases[$key]]);
            }
        }
    }

    public function down(): void
    {
        // Tidak ada rollback data (kode yang terisi dibiarkan apa adanya).
    }
};
