// Daftar negara untuk bendera (kode flagcdn + nama tampilan). Diurut abjad.
export const COUNTRIES = [
    { code: 'AL', name: 'Albania' }, { code: 'DZ', name: 'Algeria' }, { code: 'AD', name: 'Andorra' },
    { code: 'AO', name: 'Angola' }, { code: 'US', name: 'America' }, { code: 'SA', name: 'Arab Saudi' },
    { code: 'AR', name: 'Argentina' }, { code: 'AM', name: 'Armenia' }, { code: 'AU', name: 'Australia' },
    { code: 'AT', name: 'Austria' }, { code: 'AZ', name: 'Azerbaijan' }, { code: 'BH', name: 'Bahrain' },
    { code: 'BD', name: 'Bangladesh' }, { code: 'BE', name: 'Belgium' }, { code: 'BJ', name: 'Benin' },
    { code: 'BO', name: 'Bolivia' }, { code: 'BA', name: 'Bosnia' }, { code: 'BW', name: 'Botswana' },
    { code: 'BR', name: 'Brazil' }, { code: 'BN', name: 'Brunei' }, { code: 'BG', name: 'Bulgaria' },
    { code: 'BF', name: 'Burkina Faso' }, { code: 'BI', name: 'Burundi' }, { code: 'KH', name: 'Cambodia' },
    { code: 'CM', name: 'Cameroon' }, { code: 'CA', name: 'Canada' }, { code: 'CV', name: 'Cape Verde' },
    { code: 'CF', name: 'Central African Republic' }, { code: 'TD', name: 'Chad' }, { code: 'CL', name: 'Chile' },
    { code: 'CN', name: 'China' }, { code: 'CO', name: 'Colombia' }, { code: 'KM', name: 'Comoros' },
    { code: 'CG', name: 'Congo' }, { code: 'CD', name: 'DR Congo' }, { code: 'CR', name: 'Costa Rica' },
    { code: 'HR', name: 'Croatia' }, { code: 'CU', name: 'Cuba' }, { code: 'CW', name: 'Curacao' },
    { code: 'CY', name: 'Cyprus' }, { code: 'CZ', name: 'Czech' }, { code: 'DK', name: 'Denmark' },
    { code: 'DJ', name: 'Djibouti' }, { code: 'DO', name: 'Dominican Republic' }, { code: 'EC', name: 'Ecuador' },
    { code: 'EG', name: 'Egypt' }, { code: 'SV', name: 'El Salvador' }, { code: 'GB-ENG', name: 'England' },
    { code: 'GQ', name: 'Equatorial Guinea' }, { code: 'ER', name: 'Eritrea' }, { code: 'EE', name: 'Estonia' },
    { code: 'SZ', name: 'Eswatini' }, { code: 'ET', name: 'Ethiopia' }, { code: 'FJ', name: 'Fiji' },
    { code: 'FI', name: 'Finland' }, { code: 'FR', name: 'France' }, { code: 'GA', name: 'Gabon' },
    { code: 'GM', name: 'Gambia' }, { code: 'GE', name: 'Georgia' }, { code: 'DE', name: 'Germany' },
    { code: 'GH', name: 'Ghana' }, { code: 'GR', name: 'Greece' }, { code: 'GT', name: 'Guatemala' },
    { code: 'GN', name: 'Guinea' }, { code: 'GW', name: 'Guinea-Bissau' }, { code: 'GY', name: 'Guyana' },
    { code: 'HT', name: 'Haiti' }, { code: 'HN', name: 'Honduras' }, { code: 'HK', name: 'Hong Kong' },
    { code: 'HU', name: 'Hungary' }, { code: 'IS', name: 'Iceland' }, { code: 'IN', name: 'India' },
    { code: 'ID', name: 'Indonesia' }, { code: 'IR', name: 'Iran' }, { code: 'IQ', name: 'Iraq' },
    { code: 'IE', name: 'Ireland' }, { code: 'IL', name: 'Israel' }, { code: 'IT', name: 'Italy' },
    { code: 'CI', name: 'Ivory Coast' }, { code: 'JM', name: 'Jamaica' }, { code: 'JP', name: 'Japan' },
    { code: 'JO', name: 'Jordan' }, { code: 'KZ', name: 'Kazakhstan' }, { code: 'KE', name: 'Kenya' },
    { code: 'KP', name: 'North Korea' }, { code: 'KR', name: 'South Korea' }, { code: 'XK', name: 'Kosovo' },
    { code: 'KW', name: 'Kuwait' }, { code: 'KG', name: 'Kyrgyzstan' }, { code: 'LA', name: 'Laos' },
    { code: 'LV', name: 'Latvia' }, { code: 'LB', name: 'Lebanon' }, { code: 'LS', name: 'Lesotho' },
    { code: 'LR', name: 'Liberia' }, { code: 'LY', name: 'Libya' }, { code: 'LT', name: 'Lithuania' },
    { code: 'LU', name: 'Luxembourg' }, { code: 'MG', name: 'Madagascar' }, { code: 'MW', name: 'Malawi' },
    { code: 'MY', name: 'Malaysia' }, { code: 'MV', name: 'Maldives' }, { code: 'ML', name: 'Mali' },
    { code: 'MT', name: 'Malta' }, { code: 'MR', name: 'Mauritania' }, { code: 'MU', name: 'Mauritius' },
    { code: 'MX', name: 'Mexico' }, { code: 'MD', name: 'Moldova' }, { code: 'MN', name: 'Mongolia' },
    { code: 'ME', name: 'Montenegro' }, { code: 'MA', name: 'Morocco' }, { code: 'MZ', name: 'Mozambique' },
    { code: 'MM', name: 'Myanmar' }, { code: 'NA', name: 'Namibia' }, { code: 'NP', name: 'Nepal' },
    { code: 'NL', name: 'Netherlands' }, { code: 'NZ', name: 'New Zealand' }, { code: 'NI', name: 'Nicaragua' },
    { code: 'NE', name: 'Niger' }, { code: 'NG', name: 'Nigeria' }, { code: 'MK', name: 'North Macedonia' },
    { code: 'NO', name: 'Norway' }, { code: 'OM', name: 'Oman' }, { code: 'PK', name: 'Pakistan' },
    { code: 'PS', name: 'Palestine' }, { code: 'PA', name: 'Panama' }, { code: 'PG', name: 'Papua New Guinea' },
    { code: 'PY', name: 'Paraguay' }, { code: 'PE', name: 'Peru' }, { code: 'PH', name: 'Philippines' },
    { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' }, { code: 'QA', name: 'Qatar' },
    { code: 'RO', name: 'Romania' }, { code: 'RU', name: 'Russia' }, { code: 'RW', name: 'Rwanda' },
    { code: 'SN', name: 'Senegal' }, { code: 'RS', name: 'Serbia' }, { code: 'SC', name: 'Seychelles' },
    { code: 'SG', name: 'Singapore' }, { code: 'SK', name: 'Slovakia' }, { code: 'SI', name: 'Slovenia' },
    { code: 'SO', name: 'Somalia' }, { code: 'ZA', name: 'South Africa' }, { code: 'SS', name: 'South Sudan' },
    { code: 'ES', name: 'Spain' }, { code: 'LK', name: 'Sri Lanka' }, { code: 'SD', name: 'Sudan' },
    { code: 'SR', name: 'Suriname' }, { code: 'SE', name: 'Sweden' }, { code: 'CH', name: 'Switzerland' },
    { code: 'SY', name: 'Syria' }, { code: 'TW', name: 'Taiwan' }, { code: 'TJ', name: 'Tajikistan' },
    { code: 'TZ', name: 'Tanzania' }, { code: 'TH', name: 'Thailand' }, { code: 'TL', name: 'Timor-Leste' },
    { code: 'TG', name: 'Togo' }, { code: 'TT', name: 'Trinidad and Tobago' }, { code: 'TN', name: 'Tunisia' },
    { code: 'TR', name: 'Turkey' }, { code: 'TM', name: 'Turkmenistan' }, { code: 'UG', name: 'Uganda' },
    { code: 'UA', name: 'Ukraine' }, { code: 'AE', name: 'UAE' }, { code: 'UY', name: 'Uruguay' },
    { code: 'UZ', name: 'Uzbekistan' }, { code: 'VE', name: 'Venezuela' }, { code: 'VN', name: 'Vietnam' },
    { code: 'GB-WLS', name: 'Wales' }, { code: 'GB-SCT', name: 'Scotland' }, { code: 'YE', name: 'Yemen' },
    { code: 'ZM', name: 'Zambia' }, { code: 'ZW', name: 'Zimbabwe' },
];

export const flagUrl = (code, width = 40) => {
    if (!code) return null;
    const c = String(code).trim().toLowerCase();
    if (!c) return null;
    // flagcdn hanya punya lebar tertentu — jepit ke yang valid agar tidak 404.
    const valid = [20, 40, 80, 160, 320];
    const w = valid.includes(Number(width)) ? Number(width) : 160;
    return `https://flagcdn.com/w${w}/${c}.png`;
};

// Urutan fallback bila CDN gagal / kode tak dikenal — selalu ada gambar.
export const flagFallbackUrls = (code) => {
    const c = String(code || '').trim().toLowerCase();
    if (!c) return [];
    // Coba resolusi besar dulu, turun ke kecil (lebih ringan & kecil kansi gagal).
    return [`https://flagcdn.com/w160/${c}.png`, `https://flagcdn.com/w80/${c}.png`, `https://flagcdn.com/w40/${c}.png`];
};

export const countryName = (code) => COUNTRIES.find((c) => c.code === code)?.name || '';

// Kode bendera untuk pemain: pakai country_code, fallback dari nama negara
// (data lama yang negaranya diketik manual) agar semua bendera bergambar.
// Tidak pernah mengembalikan null bila ada info negara — minimal tebakan aman.
const CODE_ALIASES = {
    ENG: 'GB-ENG', ENGLAND: 'GB-ENG', INGGRIS: 'GB-ENG',
    SCO: 'GB-SCT', SCOTLAND: 'GB-SCT', SKOTLANDIA: 'GB-SCT',
    WAL: 'GB-WLS', WALES: 'GB-WLS',
    USA: 'US', AMERICA: 'US', AMERIKA: 'US', 'AMERIKA SERIKAT': 'US',
    UK: 'GB-ENG', BRITAIN: 'GB-ENG',
    INDONESIA: 'ID', IDN: 'ID',
    'ARAB SAUDI': 'SA', 'SAUDI ARABIA': 'SA', KSA: 'SA',
    'KOREA SELATAN': 'KR', 'SOUTH KOREA': 'KR', KORSEL: 'KR',
    'PANTAI GADING': 'CI', 'IVORY COAST': 'CI',
    BELANDA: 'NL', NETHERLANDS: 'NL', HOLLAND: 'NL',
    JERMAN: 'DE', GERMANY: 'DE',
    PERANCIS: 'FR', FRANCE: 'FR',
    SPANYOL: 'ES', SPAIN: 'ES',
    ITALIA: 'IT', ITALY: 'IT',
    PORTUGIS: 'PT', PORTUGAL: 'PT',
    BRASIL: 'BR', BRAZIL: 'BR',
    ARGENTINA: 'AR',
    JEPANG: 'JP', JAPAN: 'JP',
    KAMERUN: 'CM', CAMEROON: 'CM',
    BELGIA: 'BE', BELGIUM: 'BE',
    KROASIA: 'HR', CROATIA: 'HR',
    NORWEGIA: 'NO', NORWAY: 'NO',
    'CAPE VERDE': 'CV', 'CABO VERDE': 'CV', 'TANJUNG VERDE': 'CV', CPV: 'CV',
    CONGO: 'CG', KONGO: 'CG', 'REPUBLIC OF THE CONGO': 'CG', 'REPUBLIK KONGO': 'CG',
    'CONGO BRAZZAVILLE': 'CG', 'KONGO BRAZZAVILLE': 'CG', RCG: 'CG',
    'DR CONGO': 'CD', 'DEMOCRATIC REPUBLIC OF THE CONGO': 'CD', 'DEMOCRATIC REPUBLIC OF CONGO': 'CD',
    'RD KONGO': 'CD', 'KONGO KINSHASA': 'CD', 'CONGO KINSHASA': 'CD', DRC: 'CD',
    // Nama Indonesia + kode FIFA 3-huruf yang umum diketik manual.
    EKUADOR: 'EC', ECU: 'EC', GEORGIA: 'GE', GEO: 'GE',
    GER: 'DE', FRA: 'FR', ESP: 'ES', POR: 'PT', NED: 'NL', ITA: 'IT',
    CRO: 'HR', SRB: 'RS', DEN: 'DK', SWE: 'SE', SUI: 'CH', AUT: 'AT',
    POL: 'PL', BEL: 'BE', TUR: 'TR', UKR: 'UA', ROU: 'RO', GRE: 'GR', CZE: 'CZ',
    COL: 'CO', URU: 'UY', PAR: 'PY', CHI: 'CL', PER: 'PE', VEN: 'VE', BOL: 'BO',
    MEX: 'MX', JPN: 'JP', JAP: 'JP', KOR: 'KR', KSA: 'SA', AUS: 'AU',
    EGY: 'EG', MAR: 'MA', NGA: 'NG', NIG: 'NG', GHA: 'GH', SEN: 'SN',
    CMR: 'CM', CIV: 'CI', RSA: 'ZA', ALG: 'DZ', TUN: 'TN',
};

// Normalisasi kode apa pun (ISO 2-huruf, GB-*, FIFA 3-huruf) ke kode flagcdn.
// Kode tak dikenal → null agar pemanggil bisa fallback ke nationality.
export const normalizeCode = (code) => {
    const raw = String(code || '').trim().toUpperCase();
    if (!raw) return null;
    if (CODE_ALIASES[raw]) return CODE_ALIASES[raw];
    if (/^GB-(ENG|SCT|WLS)$/.test(raw)) return raw;
    if (/^[A-Z]{2}$/.test(raw) && COUNTRIES.some((c) => c.code === raw)) return raw;
    return null;
};

export const codeFor = (player) => {
    // Kode valid (termasuk FIFA 3-huruf) langsung dipakai; kode tak dikenal
    // JANGAN dikembalikan mentah (bikin 404 + bendera hilang) — lanjut
    // resolve via nationality di bawah.
    const norm = normalizeCode(player?.country_code);
    if (norm) return norm;
    const nat = String(player?.nationality || '').trim().toUpperCase();
    if (!nat) return 'ID'; // default aman: jangan pernah kosong agar bendera selalu muncul
    if (CODE_ALIASES[nat]) return CODE_ALIASES[nat];
    const hit = COUNTRIES.find((c) => c.name.toUpperCase() === nat);
    if (hit) return hit.code;
    // Cocok sebagian (mis. "Korea" → KR) sebagai usaha terakhir.
    const partial = COUNTRIES.find((c) => nat.includes(c.name.toUpperCase()) || c.name.toUpperCase().includes(nat));
    return partial?.code || 'ID';
};
