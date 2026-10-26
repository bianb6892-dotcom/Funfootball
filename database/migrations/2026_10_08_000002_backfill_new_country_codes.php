<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Backfill country_code untuk Cape Verde, Congo, DR Congo,
     * dan negara lain yang baru ditambahkan ke daftar bendera.
     * Aman dijalankan ulang, tidak mengubah kode yang sudah terisi.
     */
    public function up(): void
    {
        $aliases = [
            // Fokus utama laporan user
            'cape verde' => 'CV', 'cabo verde' => 'CV', 'tanjung verde' => 'CV', 'cpv' => 'CV',
            'congo' => 'CG', 'kongo' => 'CG',
            'republic of the congo' => 'CG', 'republik kongo' => 'CG',
            'congo brazzaville' => 'CG', 'kongo brazzaville' => 'CG',
            'dr congo' => 'CD', 'd r congo' => 'CD',
            'democratic republic of the congo' => 'CD',
            'democratic republic of congo' => 'CD',
            'rd kongo' => 'CD', 'kongo kinshasa' => 'CD',
            'congo kinshasa' => 'CD', 'drc' => 'CD',
            // Negara lain yang baru masuk daftar (ejaan EN + ID umum)
            'albania' => 'AL', 'andorra' => 'AD', 'angola' => 'AO',
            'armenia' => 'AM', 'azerbaijan' => 'AZ', 'bahrain' => 'BH',
            'bangladesh' => 'BD', 'benin' => 'BJ', 'botswana' => 'BW',
            'brunei' => 'BN', 'burundi' => 'BI', 'cambodia' => 'KH', 'kamboja' => 'KH',
            'central african republic' => 'CF', 'republik afrika tengah' => 'CF',
            'chad' => 'TD', 'comoros' => 'KM', 'komoro' => 'KM',
            'curacao' => 'CW', 'djibouti' => 'DJ', 'jibuti' => 'DJ',
            'dominican republic' => 'DO', 'republik dominika' => 'DO',
            'el salvador' => 'SV', 'equatorial guinea' => 'GQ', 'guinea ekuatorial' => 'GQ',
            'eritrea' => 'ER', 'estonia' => 'EE', 'eswatini' => 'SZ',
            'ethiopia' => 'ET', 'ethiopia' => 'ET', 'fiji' => 'FJ',
            'gabon' => 'GA', 'gambia' => 'GM', 'guatemala' => 'GT',
            'guinea' => 'GN', 'guinea-bissau' => 'GW', 'guyana' => 'GY',
            'haiti' => 'HT', 'hong kong' => 'HK', 'hongkong' => 'HK',
            'israel' => 'IL', 'kazakhstan' => 'KZ', 'kenya' => 'KE',
            'north korea' => 'KP', 'korea utara' => 'KP',
            'kosovo' => 'XK', 'kuwait' => 'KW', 'kyrgyzstan' => 'KG', 'kirgistan' => 'KG',
            'laos' => 'LA', 'lebanon' => 'LB', 'lesotho' => 'LS',
            'liberia' => 'LR', 'libya' => 'LY', 'lithuania' => 'LT', 'lituania' => 'LT',
            'luxembourg' => 'LU', 'luksemburg' => 'LU',
            'madagascar' => 'MG', 'madagaskar' => 'MG', 'malawi' => 'MW',
            'maldives' => 'MV', 'maladewa' => 'MV', 'malta' => 'MT',
            'mauritania' => 'MR', 'mauritius' => 'MU',
            'moldova' => 'MD', 'mongolia' => 'MN', 'mozambique' => 'MZ', 'mozambik' => 'MZ',
            'myanmar' => 'MM', 'namibia' => 'NA', 'nepal' => 'NP',
            'nicaragua' => 'NI', 'niger' => 'NE', 'oman' => 'OM',
            'pakistan' => 'PK', 'palestine' => 'PS', 'palestina' => 'PS',
            'papua new guinea' => 'PG', 'russia' => 'RU', 'rusia' => 'RU',
            'rwanda' => 'RW', 'seychelles' => 'SC', 'somalia' => 'SO',
            'south sudan' => 'SS', 'sudan selatan' => 'SS',
            'sri lanka' => 'LK', 'sudan' => 'SD', 'suriname' => 'SR', 'surinam' => 'SR',
            'syria' => 'SY', 'suriah' => 'SY', 'taiwan' => 'TW',
            'tajikistan' => 'TJ', 'tanzania' => 'TZ', 'timor-leste' => 'TL', 'timor leste' => 'TL',
            'togo' => 'TG', 'trinidad and tobago' => 'TT',
            'turkmenistan' => 'TM', 'uganda' => 'UG',
            'yemen' => 'YE', 'yaman' => 'YE', 'zambia' => 'ZM', 'zimbabwe' => 'ZW',
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
