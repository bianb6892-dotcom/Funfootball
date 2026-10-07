<?php

namespace App\Services;

use App\Models\Player;

/**
 * Source of truth untuk seluruh logic game.
 * Port 1:1 dari prototype Football Vault - Cyprus Edition (Beta).
 *
 * - OVR_WEIGHTS / calculateOVR()
 * - getRankFromOVR() : diamond >=90, gold >=80, silver >=70, bronze <70
 * - POSITION_COMPAT / PENALTY exact 0, adjacent -3, far -10
 * - getSlotCompatibility() / getAdjustedOVR()
 * - PACKS weights rollRankFromPack()
 * - FORMATIONS + team OVR dari adjusted OVR
 */
class GameService
{
    public const OVR_WEIGHTS = [
        'GK' => ['pac' => 0.10, 'sho' => 0.10, 'pas' => 0.20, 'dri' => 0.20, 'def' => 0.20, 'phy' => 0.20],
        'DF' => ['pac' => 0.15, 'sho' => 0.05, 'pas' => 0.10, 'dri' => 0.10, 'def' => 0.35, 'phy' => 0.25],
        'MF' => ['pac' => 0.15, 'sho' => 0.15, 'pas' => 0.30, 'dri' => 0.20, 'def' => 0.10, 'phy' => 0.10],
        'FW' => ['pac' => 0.25, 'sho' => 0.30, 'pas' => 0.10, 'dri' => 0.25, 'def' => 0.00, 'phy' => 0.10],
    ];

    public const RANKS = ['bronze', 'silver', 'gold', 'diamond'];

    /** Atribut khusus kiper (FIFA-style): Diving, Handling, Kicking, Reflexes, Speed, Positioning. */
    public const GK_KEYS = ['div', 'han', 'kic', 'ref', 'spd', 'pos'];

    public const OUTFIELD_KEYS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];

    public const OVR_WEIGHTS_GK = ['div' => 0.20, 'han' => 0.20, 'kic' => 0.10, 'ref' => 0.25, 'spd' => 0.05, 'pos' => 0.20];

    public const POSITION_COMPAT = [
        'GK' => ['GK' => 'exact', 'DF' => 'far', 'MF' => 'far', 'FW' => 'far'],
        'DF' => ['DF' => 'exact', 'MF' => 'adjacent', 'GK' => 'far', 'FW' => 'far'],
        'MF' => ['MF' => 'exact', 'DF' => 'adjacent', 'FW' => 'adjacent', 'GK' => 'far'],
        'FW' => ['FW' => 'exact', 'MF' => 'adjacent', 'DF' => 'far', 'GK' => 'far'],
    ];

    public const PENALTY = ['exact' => 0, 'adjacent' => -3, 'far' => -10];

    /** Default pack catalogue — dioverride oleh kolom rates di DB bila admin mengubah. */
    public const PACKS = [
        'bronze'  => ['name' => 'Bronze Pack',  'price' => 100,  'rates' => ['bronze' => 70, 'silver' => 25, 'gold' => 5,  'diamond' => 0]],
        'silver'  => ['name' => 'Silver Pack',  'price' => 300,  'rates' => ['bronze' => 40, 'silver' => 40, 'gold' => 15, 'diamond' => 5]],
        'gold'    => ['name' => 'Gold Pack',    'price' => 800,  'rates' => ['bronze' => 0,  'silver' => 40, 'gold' => 40, 'diamond' => 20]],
        'diamond' => ['name' => 'Diamond Pack', 'price' => 2000, 'rates' => ['bronze' => 0,  'silver' => 0,  'gold' => 50, 'diamond' => 50]],
    ];

    public const FORMATIONS = [
        '4-3-3' => [
            ['id' => 'GK', 'label' => 'GK', 'pos' => 'GK', 'x' => 50, 'y' => 90],
            ['id' => 'LB', 'label' => 'LB', 'pos' => 'DF', 'x' => 15, 'y' => 70],
            ['id' => 'CB1', 'label' => 'CB', 'pos' => 'DF', 'x' => 38, 'y' => 72],
            ['id' => 'CB2', 'label' => 'CB', 'pos' => 'DF', 'x' => 62, 'y' => 72],
            ['id' => 'RB', 'label' => 'RB', 'pos' => 'DF', 'x' => 85, 'y' => 70],
            ['id' => 'CM1', 'label' => 'CM', 'pos' => 'MF', 'x' => 25, 'y' => 48],
            ['id' => 'CM2', 'label' => 'CM', 'pos' => 'MF', 'x' => 50, 'y' => 52],
            ['id' => 'CM3', 'label' => 'CM', 'pos' => 'MF', 'x' => 75, 'y' => 48],
            ['id' => 'LW', 'label' => 'LW', 'pos' => 'FW', 'x' => 20, 'y' => 22],
            ['id' => 'ST', 'label' => 'ST', 'pos' => 'FW', 'x' => 50, 'y' => 15],
            ['id' => 'RW', 'label' => 'RW', 'pos' => 'FW', 'x' => 80, 'y' => 22],
        ],
        '4-4-2' => [
            ['id' => 'GK', 'label' => 'GK', 'pos' => 'GK', 'x' => 50, 'y' => 90],
            ['id' => 'LB', 'label' => 'LB', 'pos' => 'DF', 'x' => 15, 'y' => 70],
            ['id' => 'CB1', 'label' => 'CB', 'pos' => 'DF', 'x' => 38, 'y' => 72],
            ['id' => 'CB2', 'label' => 'CB', 'pos' => 'DF', 'x' => 62, 'y' => 72],
            ['id' => 'RB', 'label' => 'RB', 'pos' => 'DF', 'x' => 85, 'y' => 70],
            ['id' => 'LM', 'label' => 'LM', 'pos' => 'MF', 'x' => 15, 'y' => 45],
            ['id' => 'CM1', 'label' => 'CM', 'pos' => 'MF', 'x' => 38, 'y' => 48],
            ['id' => 'CM2', 'label' => 'CM', 'pos' => 'MF', 'x' => 62, 'y' => 48],
            ['id' => 'RM', 'label' => 'RM', 'pos' => 'MF', 'x' => 85, 'y' => 45],
            ['id' => 'ST1', 'label' => 'ST', 'pos' => 'FW', 'x' => 38, 'y' => 18],
            ['id' => 'ST2', 'label' => 'ST', 'pos' => 'FW', 'x' => 62, 'y' => 18],
        ],
        '4-2-3-1' => [
            ['id' => 'GK', 'label' => 'GK', 'pos' => 'GK', 'x' => 50, 'y' => 90],
            ['id' => 'LB', 'label' => 'LB', 'pos' => 'DF', 'x' => 15, 'y' => 72],
            ['id' => 'CB1', 'label' => 'CB', 'pos' => 'DF', 'x' => 38, 'y' => 74],
            ['id' => 'CB2', 'label' => 'CB', 'pos' => 'DF', 'x' => 62, 'y' => 74],
            ['id' => 'RB', 'label' => 'RB', 'pos' => 'DF', 'x' => 85, 'y' => 72],
            ['id' => 'CDM1', 'label' => 'CDM', 'pos' => 'MF', 'x' => 38, 'y' => 55],
            ['id' => 'CDM2', 'label' => 'CDM', 'pos' => 'MF', 'x' => 62, 'y' => 55],
            ['id' => 'LAM', 'label' => 'LAM', 'pos' => 'MF', 'x' => 20, 'y' => 32],
            ['id' => 'CAM', 'label' => 'CAM', 'pos' => 'MF', 'x' => 50, 'y' => 30],
            ['id' => 'RAM', 'label' => 'RAM', 'pos' => 'MF', 'x' => 80, 'y' => 32],
            ['id' => 'ST', 'label' => 'ST', 'pos' => 'FW', 'x' => 50, 'y' => 13],
        ],
        '3-4-3' => [
            ['id' => 'GK', 'label' => 'GK', 'pos' => 'GK', 'x' => 50, 'y' => 90],
            ['id' => 'CB1', 'label' => 'CB', 'pos' => 'DF', 'x' => 25, 'y' => 74],
            ['id' => 'CB2', 'label' => 'CB', 'pos' => 'DF', 'x' => 50, 'y' => 76],
            ['id' => 'CB3', 'label' => 'CB', 'pos' => 'DF', 'x' => 75, 'y' => 74],
            ['id' => 'LM', 'label' => 'LM', 'pos' => 'MF', 'x' => 12, 'y' => 48],
            ['id' => 'CM1', 'label' => 'CM', 'pos' => 'MF', 'x' => 38, 'y' => 52],
            ['id' => 'CM2', 'label' => 'CM', 'pos' => 'MF', 'x' => 62, 'y' => 52],
            ['id' => 'RM', 'label' => 'RM', 'pos' => 'MF', 'x' => 88, 'y' => 48],
            ['id' => 'LW', 'label' => 'LW', 'pos' => 'FW', 'x' => 20, 'y' => 22],
            ['id' => 'ST', 'label' => 'ST', 'pos' => 'FW', 'x' => 50, 'y' => 15],
            ['id' => 'RW', 'label' => 'RW', 'pos' => 'FW', 'x' => 80, 'y' => 22],
        ],
        '3-5-2' => [
            ['id' => 'GK', 'label' => 'GK', 'pos' => 'GK', 'x' => 50, 'y' => 90],
            ['id' => 'CB1', 'label' => 'CB', 'pos' => 'DF', 'x' => 25, 'y' => 74],
            ['id' => 'CB2', 'label' => 'CB', 'pos' => 'DF', 'x' => 50, 'y' => 76],
            ['id' => 'CB3', 'label' => 'CB', 'pos' => 'DF', 'x' => 75, 'y' => 74],
            ['id' => 'LWB', 'label' => 'LWB', 'pos' => 'MF', 'x' => 10, 'y' => 50],
            ['id' => 'CM1', 'label' => 'CM', 'pos' => 'MF', 'x' => 32, 'y' => 52],
            ['id' => 'CM2', 'label' => 'CM', 'pos' => 'MF', 'x' => 50, 'y' => 55],
            ['id' => 'CM3', 'label' => 'CM', 'pos' => 'MF', 'x' => 68, 'y' => 52],
            ['id' => 'RWB', 'label' => 'RWB', 'pos' => 'MF', 'x' => 90, 'y' => 50],
            ['id' => 'ST1', 'label' => 'ST', 'pos' => 'FW', 'x' => 38, 'y' => 20],
            ['id' => 'ST2', 'label' => 'ST', 'pos' => 'FW', 'x' => 62, 'y' => 20],
        ],
        '5-3-2' => [
            ['id' => 'GK', 'label' => 'GK', 'pos' => 'GK', 'x' => 50, 'y' => 90],
            ['id' => 'LWB', 'label' => 'LWB', 'pos' => 'DF', 'x' => 10, 'y' => 62],
            ['id' => 'CB1', 'label' => 'CB', 'pos' => 'DF', 'x' => 32, 'y' => 74],
            ['id' => 'CB2', 'label' => 'CB', 'pos' => 'DF', 'x' => 50, 'y' => 76],
            ['id' => 'CB3', 'label' => 'CB', 'pos' => 'DF', 'x' => 68, 'y' => 74],
            ['id' => 'RWB', 'label' => 'RWB', 'pos' => 'DF', 'x' => 90, 'y' => 62],
            ['id' => 'CM1', 'label' => 'CM', 'pos' => 'MF', 'x' => 28, 'y' => 45],
            ['id' => 'CM2', 'label' => 'CM', 'pos' => 'MF', 'x' => 50, 'y' => 48],
            ['id' => 'CM3', 'label' => 'CM', 'pos' => 'MF', 'x' => 72, 'y' => 45],
            ['id' => 'ST1', 'label' => 'ST', 'pos' => 'FW', 'x' => 38, 'y' => 18],
            ['id' => 'ST2', 'label' => 'ST', 'pos' => 'FW', 'x' => 62, 'y' => 18],
        ],
    ];

    public static function calculateOvr(array $stats, string $position): int
    {
        if ($position === 'GK') {
            $w = self::OVR_WEIGHTS_GK;

            return (int) round(
                $stats['div'] * $w['div'] + $stats['han'] * $w['han'] + $stats['kic'] * $w['kic']
                + $stats['ref'] * $w['ref'] + $stats['spd'] * $w['spd'] + $stats['pos'] * $w['pos']
            );
        }

        $w = self::OVR_WEIGHTS[$position] ?? self::OVR_WEIGHTS['MF'];

        return (int) round(
            $stats['pac'] * $w['pac'] + $stats['sho'] * $w['sho'] + $stats['pas'] * $w['pas']
            + $stats['dri'] * $w['dri'] + $stats['def'] * $w['def'] + $stats['phy'] * $w['phy']
        );
    }

    public static function statKeysFor(string $position): array
    {
        return $position === 'GK' ? self::GK_KEYS : self::OUTFIELD_KEYS;
    }

    /** Ambil 6 stat yang relevan dengan posisi (abaikan set lainnya). */
    public static function statsFor(Player|array $player): array
    {
        $position = $player instanceof Player ? $player->position : ($player['position'] ?? 'MF');
        $defaults = $position === 'GK'
            ? ['div' => 75, 'han' => 75, 'kic' => 70, 'ref' => 78, 'spd' => 60, 'pos' => 75]
            : ['pac' => 80, 'sho' => 80, 'pas' => 80, 'dri' => 80, 'def' => 50, 'phy' => 70];
        $get = function ($k) use ($player, $defaults) {
            $raw = $player instanceof Player ? $player->$k : ($player[$k] ?? null);

            return $raw === null ? ($defaults[$k] ?? 70) : (int) $raw;
        };
        $out = [];
        foreach (self::statKeysFor($position) as $key) {
            $out[$key] = $get($key);
        }

        return $out;
    }

    public static function rankFromOvr(int $ovr): string
    {
        if ($ovr >= 90) {
            return 'diamond';
        }
        if ($ovr >= 80) {
            return 'gold';
        }
        if ($ovr >= 70) {
            return 'silver';
        }

        return 'bronze';
    }

    /** OVR selalu dihitung ulang dari stats + position — tidak pernah percaya input frontend. */
    public static function ovrFor(Player|array $player): int
    {
        $position = $player instanceof Player ? $player->position : ($player['position'] ?? 'MF');

        return self::calculateOvr(self::statsFor($player), $position);
    }

    public static function rankFor(Player|array $player): string
    {
        $manual = $player instanceof Player ? $player->rank : ($player['rank'] ?? null);
        if ($manual && in_array($manual, self::RANKS, true)) {
            return $manual;
        }

        return self::rankFromOvr(self::ovrFor($player));
    }

    public static function slotCompatibility(string $playerPos, string $slotPos): string
    {
        return self::POSITION_COMPAT[$playerPos][$slotPos] ?? 'far';
    }

    /** @return array{ovr:int,penalty:int,compat:string,base:int} */
    public static function adjustedOvr(Player|array $player, string $slotPos): array
    {
        $pos = $player instanceof Player ? $player->position : ($player['position'] ?? 'MF');
        $base = self::ovrFor($player);
        $compat = self::slotCompatibility($pos, $slotPos);
        $penalty = self::PENALTY[$compat];

        return ['ovr' => $base + $penalty, 'penalty' => $penalty, 'compat' => $compat, 'base' => $base];
    }

    /**
     * Roll rarity dari pack, hanya mempertimbangkan rank yang stoknya ada di pool
     * (port rollRankFromPack prototype).
     */
    public static function rollRank(array $rates, array $poolCounts): ?string
    {
        $available = [];
        $total = 0;
        foreach ($rates as $rank => $weight) {
            if ($weight > 0 && ($poolCounts[$rank] ?? 0) > 0) {
                $available[$rank] = $weight;
                $total += $weight;
            }
        }
        if ($total === 0) {
            foreach ($poolCounts as $rank => $count) {
                if ($count > 0) {
                    $available[$rank] = 1;
                    $total += 1;
                }
            }
        }
        if ($total === 0) {
            return null;
        }

        $rand = mt_rand() / mt_getrandmax() * $total;
        foreach ($available as $rank => $weight) {
            $rand -= $weight;
            if ($rand <= 0) {
                return $rank;
            }
        }

        return array_key_first($available);
    }

    /** Team OVR = rata-rata adjusted OVR (bukan OVR mentah). */
    public static function teamOvr(array $adjustedOvrs): int
    {
        if (count($adjustedOvrs) === 0) {
            return 0;
        }

        return (int) round(array_sum($adjustedOvrs) / count($adjustedOvrs));
    }

    /**
     * Battle calculation PvP: selisih team OVR + noise kecil.
     * Tim lebih kuat tetap favorit, tapi underdog masih bisa draw/win.
     *
     * @return array{a:int,b:int,winner:string}
     */
    public static function simulateMatch(int $ovrA, int $ovrB): array
    {
        $diff = $ovrA - $ovrB;
        $expectedA = 1.35 + $diff * 0.22 + mt_rand(-60, 60) / 100;
        $expectedB = 1.35 - $diff * 0.22 + mt_rand(-60, 60) / 100;

        $scoreA = max(0, (int) round($expectedA + mt_rand(-80, 80) / 100));
        $scoreB = max(0, (int) round($expectedB + mt_rand(-80, 80) / 100));
        $scoreA = min($scoreA, 6);
        $scoreB = min($scoreB, 6);

        if ($scoreA === $scoreB && $diff !== 0 && mt_rand(1, 100) <= min(35, abs($diff) * 6)) {
            if ($diff > 0) {
                $scoreA++;
            } else {
                $scoreB++;
            }
        }

        $winner = $scoreA > $scoreB ? 'A' : ($scoreB > $scoreA ? 'B' : 'DRAW');

        return ['a' => $scoreA, 'b' => $scoreB, 'winner' => $winner];
    }
}
