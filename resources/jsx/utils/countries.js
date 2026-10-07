// Daftar negara untuk bendera (kode flagcdn + nama tampilan). Diurut abjad.
export const COUNTRIES = [
    { code: 'DZ', name: 'Algeria' }, { code: 'US', name: 'America' }, { code: 'SA', name: 'Arab Saudi' },
    { code: 'AR', name: 'Argentina' }, { code: 'AU', name: 'Australia' }, { code: 'AT', name: 'Austria' },
    { code: 'BE', name: 'Belgium' }, { code: 'BO', name: 'Bolivia' }, { code: 'BA', name: 'Bosnia' },
    { code: 'BR', name: 'Brazil' }, { code: 'BG', name: 'Bulgaria' }, { code: 'BF', name: 'Burkina Faso' },
    { code: 'CA', name: 'Canada' }, { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' },
    { code: 'CO', name: 'Colombia' }, { code: 'CR', name: 'Costa Rica' }, { code: 'HR', name: 'Croatia' },
    { code: 'CU', name: 'Cuba' }, { code: 'CY', name: 'Cyprus' }, { code: 'CZ', name: 'Czech' },
    { code: 'DK', name: 'Denmark' }, { code: 'EC', name: 'Ecuador' }, { code: 'EG', name: 'Egypt' },
    { code: 'GB-ENG', name: 'England' }, { code: 'FI', name: 'Finland' }, { code: 'FR', name: 'France' },
    { code: 'GE', name: 'Georgia' }, { code: 'DE', name: 'Germany' }, { code: 'GH', name: 'Ghana' },
    { code: 'GR', name: 'Greece' }, { code: 'HN', name: 'Honduras' }, { code: 'HU', name: 'Hungary' },
    { code: 'IS', name: 'Iceland' }, { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' },
    { code: 'IR', name: 'Iran' }, { code: 'IQ', name: 'Iraq' }, { code: 'IE', name: 'Ireland' },
    { code: 'IT', name: 'Italy' }, { code: 'CI', name: 'Ivory Coast' }, { code: 'JM', name: 'Jamaica' },
    { code: 'JP', name: 'Japan' }, { code: 'JO', name: 'Jordan' }, { code: 'CM', name: 'Cameroon' },
    { code: 'LV', name: 'Latvia' }, { code: 'MY', name: 'Malaysia' }, { code: 'ML', name: 'Mali' },
    { code: 'MX', name: 'Mexico' }, { code: 'ME', name: 'Montenegro' }, { code: 'MA', name: 'Morocco' },
    { code: 'NL', name: 'Netherlands' }, { code: 'NZ', name: 'New Zealand' }, { code: 'NG', name: 'Nigeria' },
    { code: 'MK', name: 'North Macedonia' }, { code: 'NO', name: 'Norway' }, { code: 'PA', name: 'Panama' },
    { code: 'PY', name: 'Paraguay' }, { code: 'PE', name: 'Peru' }, { code: 'PH', name: 'Philippines' },
    { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' }, { code: 'QA', name: 'Qatar' },
    { code: 'RO', name: 'Romania' }, { code: 'SN', name: 'Senegal' }, { code: 'RS', name: 'Serbia' },
    { code: 'SG', name: 'Singapore' }, { code: 'SK', name: 'Slovakia' }, { code: 'SI', name: 'Slovenia' },
    { code: 'ZA', name: 'South Africa' }, { code: 'KR', name: 'South Korea' }, { code: 'ES', name: 'Spain' },
    { code: 'SE', name: 'Sweden' }, { code: 'CH', name: 'Switzerland' }, { code: 'TH', name: 'Thailand' },
    { code: 'TN', name: 'Tunisia' }, { code: 'TR', name: 'Turkey' }, { code: 'UA', name: 'Ukraine' },
    { code: 'AE', name: 'UAE' }, { code: 'UY', name: 'Uruguay' }, { code: 'UZ', name: 'Uzbekistan' },
    { code: 'VE', name: 'Venezuela' }, { code: 'VN', name: 'Vietnam' }, { code: 'GB-WLS', name: 'Wales' },
    { code: 'GB-SCT', name: 'Scotland' },
];

export const flagUrl = (code, width = 40) =>
    code ? `https://flagcdn.com/w${width}/${String(code).toLowerCase()}.png` : null;

export const countryName = (code) => COUNTRIES.find((c) => c.code === code)?.name || '';
