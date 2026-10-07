<?php

namespace Database\Seeders;

use App\Models\Player;
use Illuminate\Database\Seeder;

class PlayerSeeder extends Seeder
{
    /** 8 starter dari prototype + 12 tambahan agar semua rank terisi. */
    public const PLAYERS = [
        ['name' => 'Lionel Messi', 'club' => 'Inter Miami', 'position' => 'FW', 'shirt_number' => 10, 'nationality' => 'Argentina', 'country_code' => 'AR', 'age' => 37, 'pac' => 80, 'sho' => 89, 'pas' => 90, 'dri' => 92, 'def' => 35, 'phy' => 64],
        ['name' => 'Cristiano Ronaldo', 'club' => 'Al Nassr', 'position' => 'FW', 'shirt_number' => 7, 'nationality' => 'Portugal', 'country_code' => 'PT', 'age' => 39, 'pac' => 81, 'sho' => 92, 'pas' => 78, 'dri' => 80, 'def' => 34, 'phy' => 76],
        ['name' => 'Erling Haaland', 'club' => 'Manchester City', 'position' => 'FW', 'shirt_number' => 9, 'nationality' => 'Norway', 'country_code' => 'NO', 'age' => 24, 'pac' => 89, 'sho' => 93, 'pas' => 66, 'dri' => 80, 'def' => 45, 'phy' => 88],
        ['name' => 'Kylian Mbappe', 'club' => 'Real Madrid', 'position' => 'FW', 'shirt_number' => 9, 'nationality' => 'France', 'country_code' => 'FR', 'age' => 25, 'pac' => 97, 'sho' => 90, 'pas' => 80, 'dri' => 92, 'def' => 36, 'phy' => 78],
        ['name' => 'Kevin De Bruyne', 'club' => 'Manchester City', 'position' => 'MF', 'shirt_number' => 17, 'nationality' => 'Belgium', 'country_code' => 'BE', 'age' => 33, 'pac' => 72, 'sho' => 88, 'pas' => 94, 'dri' => 87, 'def' => 65, 'phy' => 78],
        ['name' => 'Virgil van Dijk', 'club' => 'Liverpool', 'position' => 'DF', 'shirt_number' => 4, 'nationality' => 'Netherlands', 'country_code' => 'NL', 'age' => 33, 'pac' => 78, 'sho' => 60, 'pas' => 71, 'dri' => 72, 'def' => 89, 'phy' => 86],
        ['name' => 'Thibaut Courtois', 'club' => 'Real Madrid', 'position' => 'GK', 'shirt_number' => 1, 'nationality' => 'Belgium', 'country_code' => 'BE', 'age' => 32, 'div' => 84, 'han' => 89, 'kic' => 76, 'ref' => 90, 'spd' => 45, 'pos' => 88],
        ['name' => 'Luka Modric', 'club' => 'Real Madrid', 'position' => 'MF', 'shirt_number' => 10, 'nationality' => 'Croatia', 'country_code' => 'HR', 'age' => 39, 'pac' => 70, 'sho' => 76, 'pas' => 90, 'dri' => 88, 'def' => 70, 'phy' => 62],
        // Tambahan — diamond & gold atas
        ['name' => 'Vinicius Junior', 'club' => 'Real Madrid', 'position' => 'FW', 'shirt_number' => 7, 'nationality' => 'Brazil', 'country_code' => 'BR', 'age' => 24, 'pac' => 95, 'sho' => 86, 'pas' => 78, 'dri' => 93, 'def' => 30, 'phy' => 75],
        ['name' => 'Jude Bellingham', 'club' => 'Real Madrid', 'position' => 'MF', 'shirt_number' => 5, 'nationality' => 'England', 'country_code' => 'GB-ENG', 'age' => 21, 'pac' => 82, 'sho' => 84, 'pas' => 86, 'dri' => 88, 'def' => 78, 'phy' => 84],
        ['name' => 'Harry Kane', 'club' => 'Bayern Munchen', 'position' => 'FW', 'shirt_number' => 9, 'nationality' => 'England', 'country_code' => 'GB-ENG', 'age' => 31, 'pac' => 75, 'sho' => 93, 'pas' => 82, 'dri' => 78, 'def' => 45, 'phy' => 82],
        ['name' => 'William Saliba', 'club' => 'Arsenal', 'position' => 'DF', 'shirt_number' => 2, 'nationality' => 'France', 'country_code' => 'FR', 'age' => 23, 'pac' => 80, 'sho' => 55, 'pas' => 70, 'dri' => 68, 'def' => 86, 'phy' => 82],
        // Silver
        ['name' => 'Andre Onana', 'club' => 'Manchester United', 'position' => 'GK', 'shirt_number' => 24, 'nationality' => 'Cameroon', 'country_code' => 'CM', 'age' => 28, 'div' => 80, 'han' => 82, 'kic' => 85, 'ref' => 83, 'spd' => 50, 'pos' => 78],
        ['name' => 'Mason Mount', 'club' => 'Manchester United', 'position' => 'MF', 'shirt_number' => 7, 'nationality' => 'England', 'country_code' => 'GB-ENG', 'age' => 25, 'pac' => 72, 'sho' => 74, 'pas' => 78, 'dri' => 76, 'def' => 62, 'phy' => 68],
        ['name' => 'Ben White', 'club' => 'Arsenal', 'position' => 'DF', 'shirt_number' => 4, 'nationality' => 'England', 'country_code' => 'GB-ENG', 'age' => 27, 'pac' => 74, 'sho' => 55, 'pas' => 70, 'dri' => 70, 'def' => 78, 'phy' => 74],
        // Bronze
        ['name' => 'Rizky Pratama', 'club' => 'Persija Jakarta', 'position' => 'FW', 'shirt_number' => 11, 'nationality' => 'Indonesia', 'country_code' => 'ID', 'age' => 21, 'pac' => 68, 'sho' => 62, 'pas' => 60, 'dri' => 64, 'def' => 35, 'phy' => 60],
        ['name' => 'Bima Sakti Jr', 'club' => 'Persib Bandung', 'position' => 'MF', 'shirt_number' => 8, 'nationality' => 'Indonesia', 'country_code' => 'ID', 'age' => 22, 'pac' => 62, 'sho' => 58, 'pas' => 65, 'dri' => 63, 'def' => 55, 'phy' => 60],
        ['name' => 'Agus Setiawan', 'club' => 'Arema FC', 'position' => 'DF', 'shirt_number' => 5, 'nationality' => 'Indonesia', 'country_code' => 'ID', 'age' => 24, 'pac' => 60, 'sho' => 45, 'pas' => 58, 'dri' => 55, 'def' => 66, 'phy' => 68],
        ['name' => 'Dedi Kurniawan', 'club' => 'Bali United', 'position' => 'GK', 'shirt_number' => 1, 'nationality' => 'Indonesia', 'country_code' => 'ID', 'age' => 26, 'div' => 62, 'han' => 60, 'kic' => 58, 'ref' => 64, 'spd' => 55, 'pos' => 61],
        ['name' => 'Fajar Ramadhan', 'club' => 'PSM Makassar', 'position' => 'FW', 'shirt_number' => 19, 'nationality' => 'Indonesia', 'country_code' => 'ID', 'age' => 20, 'pac' => 70, 'sho' => 60, 'pas' => 55, 'dri' => 62, 'def' => 30, 'phy' => 58],
    ];

    public function run(): void
    {
        $statKeys = ['pac', 'sho', 'pas', 'dri', 'def', 'phy', 'div', 'han', 'kic', 'ref', 'spd', 'pos'];
        foreach (self::PLAYERS as $data) {
            foreach ($statKeys as $k) {
                $data[$k] ??= 0;
            }
            // OVR & rank dihitung otomatis oleh model (source of truth).
            Player::updateOrCreate(
                ['name' => $data['name'], 'club' => $data['club']],
                array_merge($data, ['is_active_in_gacha' => true])
            );
        }
    }
}
