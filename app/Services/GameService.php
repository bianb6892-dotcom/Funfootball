<?php

namespace App\Services;

use App\Models\Player;

/**
 * Source of truth untuk seluruh logic game.
 * Port 1:1 dari prototype Football Vault - Cyprus Edition (Beta).
 *
 * - OVR_WEIGHTS / calculateOVR()
 * - getRankFromOVR() : diamond >=90, gold >=80, silver >=70, bronze <70
 * - POSITION_COMPAT / PENALTY exact 0, adjacent -3, far -10;
 *   selini beda detail = shift (-2 kaki sesuai, -3 bila tidak)
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

    public const RANKS = ['bronze', 'silver', 'gold', 'diamond', 'legend'];

    /**
     * Daftar posisi detail.
     * DF: LB, CB, RB | MF: LM, CM, CDM, CAM, RM | FW: LW, ST, SS, RW | GK
     * Nilai lama DF/MF/FW tetap didukung agar data pemain lama tidak berubah/hilang.
     */
    public const POSITIONS = [
        'GK',
        'LB', 'CB', 'RB',
        'LM', 'CM', 'CDM', 'CAM', 'RM',
        'LW', 'ST', 'SS', 'RW',
        // legacy (data lama) — tetap valid, jangan dihapus
        'DF', 'MF', 'FW',
    ];

    /** Posisi baru yang bisa dipilih saat tambah/edit pemain. */
    public const SELECTABLE_POSITIONS = [
        'GK',
        'LB', 'CB', 'RB',
        'LM', 'CM', 'CDM', 'CAM', 'RM',
        'LW', 'ST', 'SS', 'RW',
    ];

    /** Maksimal posisi alternatif per pemain (selain posisi utama). */
    public const MAX_ALT_POSITIONS = 3;

    /** Pemetaan posisi detail → grup lini (untuk bobot OVR & kompatibilitas). */
    public const POSITION_GROUPS = [
        'GK' => 'GK',
        'LB' => 'DF', 'CB' => 'DF', 'RB' => 'DF', 'DF' => 'DF',
        'LM' => 'MF', 'CM' => 'MF', 'CDM' => 'MF', 'CAM' => 'MF', 'RM' => 'MF', 'MF' => 'MF',
        'LW' => 'FW', 'ST' => 'FW', 'SS' => 'FW', 'RW' => 'FW', 'FW' => 'FW',
    ];

    /** Anggota tiap grup lini (termasuk nilai legacy agar filter grup tetap menemukan data lama). */
    public const GROUP_MEMBERS = [
        'GK' => ['GK'],
        'DF' => ['LB', 'CB', 'RB', 'DF'],
        'MF' => ['LM', 'CM', 'CDM', 'CAM', 'RM', 'MF'],
        'FW' => ['LW', 'ST', 'SS', 'RW', 'FW'],
    ];

    /** Level kesulitan Fun Match: modifier OVR tim CPU (lihat FunMatchController).
     *  Server = source of truth, frontend hanya menampilkan. */
    public const FUN_DIFFICULTIES = [
        'mudah' => ['label' => 'Mudah', 'icon' => 'fa-seedling', 'modifier' => -8, 'desc' => 'CPU -8 OVR · cocok untuk pemanasan'],
        'sedang' => ['label' => 'Sedang', 'icon' => 'fa-scale-balanced', 'modifier' => -3, 'desc' => 'CPU -3 OVR · tantangan seimbang'],
        'sulit' => ['label' => 'Sulit', 'icon' => 'fa-fire', 'modifier' => 3, 'desc' => 'CPU +3 OVR · butuh XI rapi'],
        'legenda' => ['label' => 'Legenda', 'icon' => 'fa-crown', 'modifier' => 8, 'desc' => 'CPU +8 OVR · hanya untuk pemberani'],
    ];

    public static function baseGroup(string $position): string
    {
        return self::POSITION_GROUPS[strtoupper($position)] ?? 'MF';
    }

    /**
     * Normalisasi posisi alternatif: uppercase, hanya posisi detail yang bisa
     * dipilih, unik, tanpa posisi utama, maksimal MAX_ALT_POSITIONS.
     * Kiper (GK) tidak punya posisi alternatif outfield dan sebaliknya.
     *
     * @param  mixed  $raw  array/json/string/null dari input
     */
    public static function normalizeAltPositions(mixed $raw, string $mainPosition): array
    {
        $main = strtoupper(trim($mainPosition));
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : preg_split('/[\s,;|]+/', $raw);
        }
        if (! is_array($raw)) {
            return [];
        }
        $mainIsGk = self::baseGroup($main) === 'GK';
        $out = [];
        foreach ($raw as $item) {
            $p = strtoupper(trim((string) $item));
            if ($p === '' || $p === $main) {
                continue;
            }
            if (! in_array($p, self::SELECTABLE_POSITIONS, true)) {
                continue;
            }
            // Jaga kewarasan: GK <-> outfield tidak boleh campur.
            $isGk = self::baseGroup($p) === 'GK';
            if ($mainIsGk !== $isGk) {
                continue;
            }
            if (! in_array($p, $out, true)) {
                $out[] = $p;
            }
            if (count($out) >= self::MAX_ALT_POSITIONS) {
                break;
            }
        }

        return array_values($out);
    }

    /** @return string[] posisi alternatif pemain (tanpa posisi utama). */
    public static function altPositionsOf(Player|array $player): array
    {
        $main = $player instanceof Player ? $player->position : ($player['position'] ?? 'MF');
        $raw = $player instanceof Player
            ? $player->getAttributes()['alt_positions'] ?? $player->alt_positions ?? []
            : ($player['alt_positions'] ?? $player['altPositions'] ?? []);
        // Atribut bisa berupa JSON string (cast belum jalan pada array mentah).
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : [];
        }

        return self::normalizeAltPositions(is_array($raw) ? $raw : [], (string) $main);
    }

    /** @return string[] semua posisi natural: [utama, ...alternatif]. */
    public static function naturalPositionsOf(Player|array $player): array
    {
        $main = strtoupper(trim($player instanceof Player ? ($player->position ?? 'MF') : ($player['position'] ?? 'MF')));

        return array_values(array_unique(array_merge([$main], self::altPositionsOf($player))));
    }

    /**
     * True bila slot adalah posisi natural pemain (utama ATAU alternatif).
     * Dipasang di posisi natural = exact (OVR utuh, penalti 0, kaki diabaikan).
     * Contoh: Mbappe ST + alt [LW] dipasang di slot LW/ST mana pun = natural.
     */
    public static function isNaturalFit(Player|array $player, string $slotIdOrPos): bool
    {
        $slotKey = self::slotBaseKey($slotIdOrPos);
        foreach (self::naturalPositionsOf($player) as $natural) {
            if (strtoupper($natural) === $slotKey) {
                return true;
            }
        }

        return false;
    }

    public static function isOutfield(string $position): bool
    {
        return self::baseGroup($position) !== 'GK';
    }

    /** Atribut khusus kiper (FIFA-style): Diving, Handling, Kicking, Reflexes, Speed, Positioning. */
    public const GK_KEYS = ['div', 'han', 'kic', 'ref', 'spd', 'pos'];

    public const OUTFIELD_KEYS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];

    public const DETAILED_ATTRIBUTE_KEYS = [
        'acceleration', 'sprint_speed',
        'positioning', 'finishing', 'shot_power', 'long_shots', 'volleys', 'penalties',
        'vision', 'crossing', 'free_kick_accuracy', 'short_passing', 'long_passing', 'curve',
        'agility', 'balance', 'reactions', 'ball_control', 'dribbling', 'composure',
        'interceptions', 'heading_accuracy', 'def_awareness', 'standing_tackle', 'sliding_tackle',
        'jumping', 'stamina', 'strength', 'aggression',
        'gk_diving', 'gk_handling', 'gk_kicking', 'gk_positioning', 'gk_reflexes',
    ];

    public const OVR_WEIGHTS_GK = ['div' => 0.20, 'han' => 0.20, 'kic' => 0.10, 'ref' => 0.25, 'spd' => 0.05, 'pos' => 0.20];

    public const POSITION_COMPAT = [
        'GK' => ['GK' => 'exact', 'DF' => 'far', 'MF' => 'far', 'FW' => 'far'],
        'DF' => ['DF' => 'exact', 'MF' => 'adjacent', 'GK' => 'far', 'FW' => 'far'],
        'MF' => ['MF' => 'exact', 'DF' => 'adjacent', 'FW' => 'adjacent', 'GK' => 'far'],
        'FW' => ['FW' => 'exact', 'MF' => 'adjacent', 'DF' => 'far', 'GK' => 'far'],
    ];

    public const PENALTY = ['exact' => 0, 'adjacent' => -3, 'far' => -10];

    /** Penalti geser selini beda detail: -2 bila kaki sesuai preferensi slot, -3 bila tidak. */
    public const SHIFT_PENALTY_FOOT_OK = -2;

    public const SHIFT_PENALTY = -3;

    /**
     * Kaki utama pemain: left (kiri), right (kanan), both (dua kaki / ambidex).
     * Data lama tanpa kolom ini dianggap 'right' (default DB).
     */
    public const FOOTS = ['left', 'right', 'both'];

    /** OVR maksimum kartu spesial (Flashback, Legend, POTW, UCL/UEL/UECL).
     *  Stat input tetap 30-99, hasil akhir yang dicap. */
    public const SPECIAL_MAX_OVR = 97;

    /** Rentang OVR khusus kartu Halloween event. */
    public const HALLOWEEN_MIN_OVR = 78;

    public const HALLOWEEN_MAX_OVR = 98;

    /** Penalti kaki (-2) hanya bila posisi pemain juga tidak pas (compat bukan exact).
     *  Posisi sesuai = kaki diabaikan, OVR tidak berkurang. */
    public const FOOT_PENALTY = -2;

    public const FOOT_PENALTIES = ['exact' => 0, 'mismatch' => -2];

    /** Jembatan CAM ↔ SS beda lini tapi peran mirip: total hanya -2 dua arah, kaki diabaikan. */
    public const BRIDGE_PENALTY_CAM_SS = -2;

    /**
     * Sisi lapangan tiap slot: L (kiri) / C (tengah) / R (kanan).
     * Ditentukan dari ID slot (LB, RW, ...) agar slot tengah seperti ST/CB/CM
     * tetap netral meski satu grup lini dengan slot sayap.
     */
    public const SLOT_SIDES = [
        'LB' => 'L', 'LM' => 'L', 'LW' => 'L', 'LWB' => 'L', 'LAM' => 'L',
        'RB' => 'R', 'RM' => 'R', 'RW' => 'R', 'RWB' => 'R', 'RAM' => 'R',
    ];

    /**
     * Kaki ideal tiap sisi (meta modern):
     * - Bek sayap (LB/RB) lurus: LB mau kaki kiri, RB mau kaki kanan.
     * - Gelandang/sayap serang inverted: LM/LW mau kaki kanan, RM/RW mau kaki kiri
     *   agar bisa cut-inside (contoh: ST kaki kanan di tengah = cocok,
     *   digeser ke RW yang maunya kaki kiri = kena penalti).
     * - Tengah & kiper netral: selalu mengikuti kaki utama (tanpa penalti).
     */
    public const FOOT_PREFERENCE = [
        'LB' => 'left', 'LWB' => 'left',
        'RB' => 'right', 'RWB' => 'right',
        'LM' => 'right', 'LW' => 'right', 'LAM' => 'right',
        'RM' => 'left', 'RW' => 'left', 'RAM' => 'left',
    ];

    /** Default pack catalogue — dioverride oleh kolom rates di DB bila admin mengubah.
     *  Pack POTW berisi HANYA pemain POTW (pool khusus, bukan roll rank). */
    public const PACKS = [
        'bronze' => ['name' => 'Bronze Pack',  'price' => 100,  'rates' => ['bronze' => 70, 'silver' => 25, 'gold' => 5,  'diamond' => 0]],
        'silver' => ['name' => 'Silver Pack',  'price' => 300,  'rates' => ['bronze' => 40, 'silver' => 40, 'gold' => 15, 'diamond' => 5]],
        'gold' => ['name' => 'Gold Pack',    'price' => 800,  'rates' => ['bronze' => 0,  'silver' => 40, 'gold' => 40, 'diamond' => 20]],
        'diamond' => ['name' => 'Diamond Pack', 'price' => 2000, 'rates' => ['bronze' => 0,  'silver' => 0,  'gold' => 50, 'diamond' => 50]],
        'potw' => ['name' => 'POTW Pack',    'price' => 1500, 'rates' => ['potw' => 100]],
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
            ['id' => 'LM', 'label' => 'LM', 'pos' => 'MF', 'x' => 20, 'y' => 32],
            ['id' => 'CAM', 'label' => 'CAM', 'pos' => 'MF', 'x' => 50, 'y' => 30],
            ['id' => 'RM', 'label' => 'RM', 'pos' => 'MF', 'x' => 80, 'y' => 32],
            ['id' => 'ST', 'label' => 'ST', 'pos' => 'FW', 'x' => 50, 'y' => 13],
        ],
        '4-2-1-3' => [
            ['id' => 'GK', 'label' => 'GK', 'pos' => 'GK', 'x' => 50, 'y' => 90],
            ['id' => 'LB', 'label' => 'LB', 'pos' => 'DF', 'x' => 15, 'y' => 72],
            ['id' => 'CB1', 'label' => 'CB', 'pos' => 'DF', 'x' => 38, 'y' => 74],
            ['id' => 'CB2', 'label' => 'CB', 'pos' => 'DF', 'x' => 62, 'y' => 74],
            ['id' => 'RB', 'label' => 'RB', 'pos' => 'DF', 'x' => 85, 'y' => 72],
            ['id' => 'CDM1', 'label' => 'CDM', 'pos' => 'MF', 'x' => 38, 'y' => 55],
            ['id' => 'CDM2', 'label' => 'CDM', 'pos' => 'MF', 'x' => 62, 'y' => 55],
            ['id' => 'CAM', 'label' => 'CAM', 'pos' => 'MF', 'x' => 50, 'y' => 35],
            ['id' => 'LW', 'label' => 'LW', 'pos' => 'FW', 'x' => 20, 'y' => 18],
            ['id' => 'ST', 'label' => 'ST', 'pos' => 'FW', 'x' => 50, 'y' => 13],
            ['id' => 'RW', 'label' => 'RW', 'pos' => 'FW', 'x' => 80, 'y' => 18],
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
        '3-4-1-2' => [
            ['id' => 'GK', 'label' => 'GK', 'pos' => 'GK', 'x' => 50, 'y' => 90],
            ['id' => 'CB1', 'label' => 'CB', 'pos' => 'DF', 'x' => 25, 'y' => 74],
            ['id' => 'CB2', 'label' => 'CB', 'pos' => 'DF', 'x' => 50, 'y' => 76],
            ['id' => 'CB3', 'label' => 'CB', 'pos' => 'DF', 'x' => 75, 'y' => 74],
            ['id' => 'LM', 'label' => 'LM', 'pos' => 'MF', 'x' => 12, 'y' => 48],
            ['id' => 'CM1', 'label' => 'CM', 'pos' => 'MF', 'x' => 38, 'y' => 52],
            ['id' => 'CM2', 'label' => 'CM', 'pos' => 'MF', 'x' => 62, 'y' => 52],
            ['id' => 'RM', 'label' => 'RM', 'pos' => 'MF', 'x' => 88, 'y' => 48],
            ['id' => 'CAM', 'label' => 'CAM', 'pos' => 'MF', 'x' => 50, 'y' => 30],
            ['id' => 'ST1', 'label' => 'ST', 'pos' => 'FW', 'x' => 38, 'y' => 15],
            ['id' => 'ST2', 'label' => 'ST', 'pos' => 'FW', 'x' => 62, 'y' => 15],
        ],
        '3-4-2-1' => [
            ['id' => 'GK', 'label' => 'GK', 'pos' => 'GK', 'x' => 50, 'y' => 90],
            ['id' => 'CB1', 'label' => 'CB', 'pos' => 'DF', 'x' => 25, 'y' => 74],
            ['id' => 'CB2', 'label' => 'CB', 'pos' => 'DF', 'x' => 50, 'y' => 76],
            ['id' => 'CB3', 'label' => 'CB', 'pos' => 'DF', 'x' => 75, 'y' => 74],
            ['id' => 'LM', 'label' => 'LM', 'pos' => 'MF', 'x' => 12, 'y' => 48],
            ['id' => 'CM1', 'label' => 'CM', 'pos' => 'MF', 'x' => 38, 'y' => 52],
            ['id' => 'CM2', 'label' => 'CM', 'pos' => 'MF', 'x' => 62, 'y' => 52],
            ['id' => 'RM', 'label' => 'RM', 'pos' => 'MF', 'x' => 88, 'y' => 48],
            ['id' => 'CAM1', 'label' => 'CAM', 'pos' => 'MF', 'x' => 35, 'y' => 28],
            ['id' => 'CAM2', 'label' => 'CAM', 'pos' => 'MF', 'x' => 65, 'y' => 28],
            ['id' => 'ST', 'label' => 'ST', 'pos' => 'FW', 'x' => 50, 'y' => 13],
        ],
        '3-4-2-1-SS' => [
            ['id' => 'GK', 'label' => 'GK', 'pos' => 'GK', 'x' => 50, 'y' => 90],
            ['id' => 'CB1', 'label' => 'CB', 'pos' => 'DF', 'x' => 25, 'y' => 74],
            ['id' => 'CB2', 'label' => 'CB', 'pos' => 'DF', 'x' => 50, 'y' => 76],
            ['id' => 'CB3', 'label' => 'CB', 'pos' => 'DF', 'x' => 75, 'y' => 74],
            ['id' => 'LM', 'label' => 'LM', 'pos' => 'MF', 'x' => 12, 'y' => 48],
            ['id' => 'CM1', 'label' => 'CM', 'pos' => 'MF', 'x' => 38, 'y' => 52],
            ['id' => 'CM2', 'label' => 'CM', 'pos' => 'MF', 'x' => 62, 'y' => 52],
            ['id' => 'RM', 'label' => 'RM', 'pos' => 'MF', 'x' => 88, 'y' => 48],
            ['id' => 'SS1', 'label' => 'SS', 'pos' => 'FW', 'x' => 35, 'y' => 28],
            ['id' => 'SS2', 'label' => 'SS', 'pos' => 'FW', 'x' => 65, 'y' => 28],
            ['id' => 'ST', 'label' => 'ST', 'pos' => 'FW', 'x' => 50, 'y' => 13],
        ],
        '3-5-2' => [
            ['id' => 'GK', 'label' => 'GK', 'pos' => 'GK', 'x' => 50, 'y' => 90],
            ['id' => 'CB1', 'label' => 'CB', 'pos' => 'DF', 'x' => 25, 'y' => 74],
            ['id' => 'CB2', 'label' => 'CB', 'pos' => 'DF', 'x' => 50, 'y' => 76],
            ['id' => 'CB3', 'label' => 'CB', 'pos' => 'DF', 'x' => 75, 'y' => 74],
            ['id' => 'LM', 'label' => 'LM', 'pos' => 'MF', 'x' => 12, 'y' => 50],
            ['id' => 'CM1', 'label' => 'CM', 'pos' => 'MF', 'x' => 33, 'y' => 55],
            ['id' => 'CM2', 'label' => 'CM', 'pos' => 'MF', 'x' => 50, 'y' => 58],
            ['id' => 'CM3', 'label' => 'CM', 'pos' => 'MF', 'x' => 67, 'y' => 55],
            ['id' => 'RM', 'label' => 'RM', 'pos' => 'MF', 'x' => 88, 'y' => 50],
            ['id' => 'ST1', 'label' => 'ST', 'pos' => 'FW', 'x' => 38, 'y' => 20],
            ['id' => 'ST2', 'label' => 'ST', 'pos' => 'FW', 'x' => 62, 'y' => 20],
        ],
        '3-2-4-1' => [
            ['id' => 'GK', 'label' => 'GK', 'pos' => 'GK', 'x' => 50, 'y' => 90],
            ['id' => 'CB1', 'label' => 'CB', 'pos' => 'DF', 'x' => 25, 'y' => 76],
            ['id' => 'CB2', 'label' => 'CB', 'pos' => 'DF', 'x' => 50, 'y' => 78],
            ['id' => 'CB3', 'label' => 'CB', 'pos' => 'DF', 'x' => 75, 'y' => 76],
            ['id' => 'CDM1', 'label' => 'CDM', 'pos' => 'MF', 'x' => 38, 'y' => 58],
            ['id' => 'CDM2', 'label' => 'CDM', 'pos' => 'MF', 'x' => 62, 'y' => 58],
            ['id' => 'LM', 'label' => 'LM', 'pos' => 'MF', 'x' => 12, 'y' => 38],
            ['id' => 'CAM1', 'label' => 'CAM', 'pos' => 'MF', 'x' => 38, 'y' => 34],
            ['id' => 'CAM2', 'label' => 'CAM', 'pos' => 'MF', 'x' => 62, 'y' => 34],
            ['id' => 'RM', 'label' => 'RM', 'pos' => 'MF', 'x' => 88, 'y' => 38],
            ['id' => 'ST', 'label' => 'ST', 'pos' => 'FW', 'x' => 50, 'y' => 14],
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
        $group = self::baseGroup($position);
        if ($group === 'GK') {
            $w = self::OVR_WEIGHTS_GK;

            return (int) round(
                $stats['div'] * $w['div'] + $stats['han'] * $w['han'] + $stats['kic'] * $w['kic']
                + $stats['ref'] * $w['ref'] + $stats['spd'] * $w['spd'] + $stats['pos'] * $w['pos']
            );
        }

        $w = self::OVR_WEIGHTS[$group] ?? self::OVR_WEIGHTS['MF'];

        return (int) round(
            $stats['pac'] * $w['pac'] + $stats['sho'] * $w['sho'] + $stats['pas'] * $w['pas']
            + $stats['dri'] * $w['dri'] + $stats['def'] * $w['def'] + $stats['phy'] * $w['phy']
        );
    }

    public static function statKeysFor(string $position): array
    {
        return self::baseGroup($position) === 'GK' ? self::GK_KEYS : self::OUTFIELD_KEYS;
    }

    /** Ambil 6 stat yang relevan dengan posisi (abaikan set lainnya). */
    public static function statsFor(Player|array $player): array
    {
        $position = $player instanceof Player ? $player->position : ($player['position'] ?? 'MF');
        $defaults = self::baseGroup($position) === 'GK'
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

    /**
     * Nilai awal atribut detail, diturunkan dari 6 stat ringkasan.
     * Dipakai saat pemain baru dibuat dan saat migrasi data lama.
     */
    public static function defaultDetailedAttributes(Player|array $player): array
    {
        $get = function (string $key, int $fallback) use ($player): int {
            $raw = $player instanceof Player ? $player->getAttribute($key) : ($player[$key] ?? null);

            return $raw === null || $raw === '' ? $fallback : (int) $raw;
        };

        $pac = $get('pac', 80);
        $sho = $get('sho', 80);
        $pas = $get('pas', 80);
        $dri = $get('dri', 80);
        $def = $get('def', 50);
        $phy = $get('phy', 70);

        return [
            'acceleration' => self::clampAttribute($pac + 1),
            'sprint_speed' => self::clampAttribute($pac),
            'positioning' => self::clampAttribute($sho - 1),
            'finishing' => self::clampAttribute($sho),
            'shot_power' => self::clampAttribute($sho + 1),
            'long_shots' => self::clampAttribute($sho - 2),
            'volleys' => self::clampAttribute($sho - 3),
            'penalties' => self::clampAttribute($sho - 2),
            'vision' => self::clampAttribute($pas + 1),
            'crossing' => self::clampAttribute($pas - 1),
            'free_kick_accuracy' => self::clampAttribute($pas - 2),
            'short_passing' => self::clampAttribute($pas + 1),
            'long_passing' => self::clampAttribute($pas),
            'curve' => self::clampAttribute($pas - 1),
            'agility' => self::clampAttribute($dri + 1),
            'balance' => self::clampAttribute($dri),
            'reactions' => self::clampAttribute($dri),
            'ball_control' => self::clampAttribute($dri + 1),
            'dribbling' => self::clampAttribute($dri),
            'composure' => self::clampAttribute($dri),
            'interceptions' => self::clampAttribute($def + 1),
            'heading_accuracy' => self::clampAttribute($def - 2),
            'def_awareness' => self::clampAttribute($def + 1),
            'standing_tackle' => self::clampAttribute($def),
            'sliding_tackle' => self::clampAttribute($def - 1),
            'jumping' => self::clampAttribute($phy),
            'stamina' => self::clampAttribute($phy + 1),
            'strength' => self::clampAttribute($phy),
            'aggression' => self::clampAttribute($phy - 1),
            'gk_diving' => self::clampAttribute($get('div', 75)),
            'gk_handling' => self::clampAttribute($get('han', 75)),
            'gk_kicking' => self::clampAttribute($get('kic', 70)),
            'gk_positioning' => self::clampAttribute($get('pos', 75)),
            'gk_reflexes' => self::clampAttribute($get('ref', 78)),
        ];
    }

    public static function clampAttribute(int $value): int
    {
        return max(30, min(99, $value));
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

    /** OVR selalu dihitung ulang dari stats + position — tidak pernah percaya input frontend.
     *  Kartu Halloween dikunci pada rentang 78-98; kartu spesial lain dicap maksimal 97.
     *  Flashback tetap menang atas Halloween sehingga memakai cap 97. */
    public static function ovrFor(Player|array $player): int
    {
        $position = $player instanceof Player ? $player->position : ($player['position'] ?? 'MF');
        $ovr = self::calculateOvr(self::statsFor($player), $position);

        if ($player instanceof Player) {
            $isFlashback = (bool) ($player->is_flashback ?? false);
            $isHalloween = (bool) ($player->is_halloween ?? false);
            $isUcl = (bool) ($player->is_ucl ?? false);
            $isUel = (bool) ($player->is_uel ?? false);
            $isUecl = (bool) ($player->is_uecl ?? false);
            $isPotw = (bool) ($player->is_potw ?? false);
            $rank = strtolower((string) ($player->rank ?? ''));
        } else {
            $isFlashback = (bool) ($player['is_flashback'] ?? false);
            $isHalloween = (bool) ($player['is_halloween'] ?? ($player['isHalloween'] ?? false));
            $isUcl = (bool) ($player['is_ucl'] ?? ($player['isUcl'] ?? false));
            $isUel = (bool) ($player['is_uel'] ?? ($player['isUel'] ?? false));
            $isUecl = (bool) ($player['is_uecl'] ?? ($player['isUecl'] ?? false));
            $isPotw = (bool) ($player['is_potw'] ?? ($player['isPotw'] ?? false));
            $rank = strtolower((string) ($player['rank'] ?? ($player['card'] ?? '')));
        }
        $isHalloweenCard = ($isHalloween || $rank === 'halloween') && ! $isFlashback;

        if ($isHalloweenCard) {
            $ovr = max(self::HALLOWEEN_MIN_OVR, min($ovr, self::HALLOWEEN_MAX_OVR));
        } elseif ($isFlashback || $isUcl || $isUel || $isUecl || $isPotw || $rank === 'legend' || in_array($rank, ['ucl', 'uel', 'uecl'], true)) {
            $ovr = min($ovr, self::SPECIAL_MAX_OVR);
        }

        return $ovr;
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
        // Samakan dulu ke grup lini agar posisi detail (CB, CDM, ST, ...) tetap kompatibel
        // dengan slot formasi yang memakai grup (DF/MF/FW) maupun label detail.
        // Aturan: posisi detail yang sama persis = exact (0); selini beda detail = shift
        // (-2 bila kaki sesuai, -3 bila tidak); beda lini = adjacent (-3) / far (-10).
        if (strtoupper($playerPos) === strtoupper($slotPos)) {
            return 'exact';
        }
        $pg = self::baseGroup($playerPos);
        $sg = self::baseGroup($slotPos);
        if ($pg === $sg) {
            return 'shift';
        }

        return self::POSITION_COMPAT[$pg][$sg] ?? 'far';
    }

    public static function normalizeFoot(Player|array $player): string
    {
        $raw = strtolower((string) ($player instanceof Player ? ($player->preferred_foot ?? 'right') : ($player['preferred_foot'] ?? 'right')));
        if (! in_array($raw, self::FOOTS, true)) {
            return 'right';
        }

        return $raw;
    }

    /** Kunci slot generik (CB1 → CB, ST2 → ST, BENCH1 → BENCH) agar cocok dengan peta sisi. */
    public static function slotBaseKey(string $slotIdOrPos): string
    {
        $s = strtoupper(trim($slotIdOrPos));
        if (str_starts_with($s, 'BENCH')) {
            return 'BENCH';
        }
        if (preg_match('/^(GK|LWB|RWB|LAM|RAM|LB|CB|RB|LM|CDM|CAM|CM|RM|LW|ST|SS|RW|DF|MF|FW)(?=\d|\b)/', $s, $m)) {
            return $m[1];
        }

        return $s;
    }

    /** Sisi slot: L / C / R. Tengah (termasuk ST, CB, CM, GK, bench) selalu netral. */
    public static function slotSide(string $slotIdOrPos): string
    {
        return self::SLOT_SIDES[self::slotBaseKey($slotIdOrPos)] ?? 'C';
    }

    /**
     * Kecocokan kaki utama vs slot (info murni kaki-vs-slot, tanpa melihat posisi).
     * - Tengah/GK/bench/grup lini (DF/MF/FW): selalu exact (mengikuti kaki utama).
     * - Dua kaki (both): selalu exact di sisi mana pun.
     * - Sayap: exact bila sesuai FOOT_PREFERENCE, mismatch bila tidak.
     * Penalti -2 dari mismatch hanya diberlakukan di adjustedOvr bila posisi
     * juga tidak exact (posisi sesuai = OVR tidak berkurang).
     *
     * @return array{compat:string,side:string,wanted:?string}
     */
    public static function footCompatibility(Player|array $player, string $slotIdOrPos): array
    {
        $key = self::slotBaseKey($slotIdOrPos);
        $side = self::slotSide($slotIdOrPos);
        $wanted = self::FOOT_PREFERENCE[$key] ?? null;
        if ($wanted === null) {
            return ['compat' => 'exact', 'side' => $side, 'wanted' => null];
        }
        $pos = $player instanceof Player ? $player->position : ($player['position'] ?? 'MF');
        if (self::baseGroup($pos) === 'GK') {
            return ['compat' => 'exact', 'side' => $side, 'wanted' => $wanted];
        }
        $foot = self::normalizeFoot($player);
        if ($foot === 'both') {
            return ['compat' => 'exact', 'side' => $side, 'wanted' => $wanted];
        }

        return ['compat' => $foot === $wanted ? 'exact' : 'mismatch', 'side' => $side, 'wanted' => $wanted];
    }

    public static function footLabel(?string $foot): string
    {
        return match (strtolower((string) $foot)) {
            'left' => 'Kiri',
            'both' => 'Dua kaki',
            default => 'Kanan',
        };
    }

    /** CAM ↔ SS dua arah: beda lini tapi peran lubang mirip → hanya -2, kaki diabaikan. */
    public static function isCamSsBridge(Player|array|string $playerOrPos, string $slotIdOrPos): bool
    {
        $s = self::slotBaseKey($slotIdOrPos);
        $positions = is_string($playerOrPos)
            ? [strtoupper(trim($playerOrPos))]
            : self::naturalPositionsOf($playerOrPos);
        foreach ($positions as $p) {
            $p = strtoupper(trim((string) $p));
            if ($p === $s) {
                continue;
            }
            if (($p === 'CAM' && $s === 'SS') || ($p === 'SS' && $s === 'CAM')) {
                return true;
            }
        }

        return false;
    }

    /** @return array{ovr:int,penalty:int,compat:string,base:int,pos_penalty:int,foot_penalty:int,foot_compat:string,slot_side:string,is_natural:bool,natural_positions:array} */
    public static function adjustedOvr(Player|array $player, string $slotPos, ?string $slotId = null): array
    {
        $pos = $player instanceof Player ? $player->position : ($player['position'] ?? 'MF');
        $base = self::ovrFor($player);
        $compat = self::slotCompatibility($pos, $slotPos);
        $slotKey = self::slotBaseKey($slotId ?? $slotPos);
        $naturalPositions = self::naturalPositionsOf($player);
        $isNatural = self::isNaturalFit($player, $slotId ?? $slotPos);
        if ($isNatural) {
            // Posisi utama ATAU alternatif yang sama persis dengan slotnya
            // (mis. ST+alt LW dipasang di slot LW/ST): pas sempurna, kaki diabaikan.
            $compat = 'exact';
        } elseif ($compat === 'shift' && strtoupper($pos) === $slotKey) {
            // Detail sama dengan slotnya (mis. LB di slot LB yang posisinya grup DF):
            // pas sempurna, kaki diabaikan.
            $compat = 'exact';
        }
        $foot = self::footCompatibility($player, $slotId ?? $slotPos);
        if ($compat === 'exact') {
            $posPenalty = 0;
            $footPenalty = 0;
        } elseif (self::isCamSsBridge($player, $slotId ?? $slotPos)) {
            // Pengecualian: CAM→SS maupun SS→CAM hanya -2 total, kaki diabaikan.
            $posPenalty = self::BRIDGE_PENALTY_CAM_SS;
            $footPenalty = 0;
        } elseif ($compat === 'shift') {
            // Selini beda detail (LM→CM, ST→LW, RB→LB, ...): -2 bila kaki sesuai
            // preferensi slot (dua kaki dihitung sesuai), -3 bila tidak.
            // Slot netral (CM, CB, ST, ...) tidak punya preferensi = -3.
            $wanted = self::FOOT_PREFERENCE[$slotKey] ?? null;
            $posPenalty = ($wanted !== null && $foot['compat'] === 'exact')
                ? self::SHIFT_PENALTY_FOOT_OK
                : self::SHIFT_PENALTY;
            $footPenalty = 0;
        } else {
            $posPenalty = self::PENALTY[$compat];
            $footPenalty = $compat === 'exact' ? 0 : (self::FOOT_PENALTIES[$foot['compat']] ?? 0);
        }
        $total = $posPenalty + $footPenalty;

        return [
            'ovr' => $base + $total, 'penalty' => $total, 'compat' => $compat, 'base' => $base,
            'pos_penalty' => $posPenalty, 'foot_penalty' => $footPenalty,
            'foot_compat' => $foot['compat'], 'slot_side' => $foot['side'],
            'is_natural' => $isNatural, 'natural_positions' => $naturalPositions,
        ];
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

    /** Chemistry: tiap pasangan pemain satu klub +1, satu negara +2.
     *  Total poin dikonversi menjadi bonus OVR tim (maks +5). */
    public const CHEMISTRY_CLUB_POINTS = 1;

    public const CHEMISTRY_NATION_POINTS = 2;

    public const CHEMISTRY_OVR_DIVISOR = 10;

    public const CHEMISTRY_MAX_BONUS = 5;

    private static function sameClub(Player|array $a, Player|array $b): bool
    {
        $clubA = mb_strtolower(trim((string) ($a instanceof Player ? $a->club : ($a['club'] ?? ''))));
        $clubB = mb_strtolower(trim((string) ($b instanceof Player ? $b->club : ($b['club'] ?? ''))));

        return $clubA !== '' && $clubA === $clubB;
    }

    private static function sameNation(Player|array $a, Player|array $b): bool
    {
        $codeA = mb_strtolower(trim((string) ($a instanceof Player ? ($a->country_code ?? '') : ($a['country_code'] ?? ($a['countryCode'] ?? '')))));
        $codeB = mb_strtolower(trim((string) ($b instanceof Player ? ($b->country_code ?? '') : ($b['country_code'] ?? ($b['countryCode'] ?? '')))));
        if ($codeA !== '' && $codeA === $codeB) {
            return true;
        }

        $natA = mb_strtolower(trim((string) ($a instanceof Player ? ($a->nationality ?? '') : ($a['nationality'] ?? ''))));
        $natB = mb_strtolower(trim((string) ($b instanceof Player ? ($b->nationality ?? '') : ($b['nationality'] ?? ''))));

        return $natA !== '' && $natA === $natB;
    }

    /**
     * Chemistry antar pemain pada satu XI: setiap pasangan yang satu klub
     * mendapat +1, yang satu negara +2 (bisa keduanya). Poin per pemain
     * dikembalikan berurutan sesuai input agar bisa ditampilkan di slot.
     *
     * @param  array<int, Player|array>  $players
     * @return array{points:int,possible:int,club_links:int,nation_links:int,average:float,bonus:int,per_player:array<int,int>}
     */
    public static function chemistry(array $players): array
    {
        $players = array_values(array_filter($players, fn ($p) => $p !== null));
        $count = count($players);
        $perPlayer = array_fill(0, $count, 0);
        $clubLinks = 0;
        $nationLinks = 0;
        $points = 0;

        for ($i = 0; $i < $count; $i++) {
            for ($j = $i + 1; $j < $count; $j++) {
                $pair = 0;
                if (self::sameClub($players[$i], $players[$j])) {
                    $pair += self::CHEMISTRY_CLUB_POINTS;
                    $clubLinks++;
                }
                if (self::sameNation($players[$i], $players[$j])) {
                    $pair += self::CHEMISTRY_NATION_POINTS;
                    $nationLinks++;
                }
                if ($pair > 0) {
                    $points += $pair;
                    $perPlayer[$i] += $pair;
                    $perPlayer[$j] += $pair;
                }
            }
        }

        $maxPairs = (int) ($count * ($count - 1) / 2);
        $possible = $maxPairs * (self::CHEMISTRY_CLUB_POINTS + self::CHEMISTRY_NATION_POINTS);

        return [
            'points' => $points,
            'possible' => $possible,
            'club_links' => $clubLinks,
            'nation_links' => $nationLinks,
            'average' => $count > 0 ? round($points / $count, 1) : 0,
            'bonus' => $count > 0 ? min(self::CHEMISTRY_MAX_BONUS, intdiv($points, self::CHEMISTRY_OVR_DIVISOR)) : 0,
            'per_player' => $perPlayer,
        ];
    }

    /**
     * Kekuatan tim = rata-rata adjusted OVR + bonus chemistry.
     *
     * @param  array<int,int>  $adjustedOvrs  OVR per slot (sudah kena penalti posisi/kaki)
     * @param  array<int, Player|array>  $players  pemain pada XI (urutan sama)
     * @return array{base:int,bonus:int,ovr:int,chemistry:array}
     */
    public static function teamStrength(array $adjustedOvrs, array $players): array
    {
        $base = self::teamOvr($adjustedOvrs);
        $chemistry = self::chemistry($players);

        return [
            'base' => $base,
            'bonus' => $chemistry['bonus'],
            'ovr' => min(99, $base + $chemistry['bonus']),
            'chemistry' => $chemistry,
        ];
    }

    /**
     * Mini-game latihan event: free_kick | penalty | dribble.
     * Format set 5x percobaan (ala adu penalti): butuh >= 3 berhasil untuk menang.
     * Skill = gabungan stat XI yang relevan + team OVR; target = OVR lawan efektif.
     *
     * @param  array<int, Player|array>  $xiPlayers  XI user (model atau array stat)
     * @return array{goals:int,misses:int,success:bool,skill:float,target:float,rounds:array<int,array{success:bool,roll:float,p:int}>}
     */
    public const MINIGAME_TYPES = [
        'match' => ['label' => 'Full Match', 'icon' => 'fa-trophy'],
        'free_kick' => ['label' => 'Latihan Free Kick', 'icon' => 'fa-bullseye', 'weights' => ['sho' => 0.5, 'pas' => 0.3, 'dri' => 0.2]],
        'penalty' => ['label' => 'Latihan Penalti', 'icon' => 'fa-circle-dot', 'weights' => ['sho' => 0.6, 'pas' => 0.2, 'phy' => 0.2]],
        'dribble' => ['label' => 'Latihan Dribble', 'icon' => 'fa-wind', 'weights' => ['dri' => 0.5, 'pac' => 0.3, 'pas' => 0.2]],
    ];

    public static function minigameLabel(string $type): string
    {
        return self::MINIGAME_TYPES[$type]['label'] ?? self::MINIGAME_TYPES['match']['label'];
    }

    public static function minigameStat(Player|array $player, string $key): int
    {
        if ($player instanceof Player) {
            $v = $player->$key;
            if ($v !== null) {
                return (int) $v;
            }

            // Kiper tidak punya stat outfield — pakai OVR sebagai proksi netral.
            return self::ovrFor($player);
        }

        return (int) ($player[$key] ?? $player['ovr'] ?? 70);
    }

    public static function simulateMinigame(string $type, array $xiPlayers, int $difficulty, int $rounds = 5, int $need = 3): array
    {
        $weights = self::MINIGAME_TYPES[$type]['weights'] ?? self::MINIGAME_TYPES['free_kick']['weights'];
        $statAvg = 0;
        foreach ($xiPlayers as $p) {
            $s = 0;
            foreach ($weights as $key => $w) {
                $s += self::minigameStat($p, $key) * $w;
            }
            $statAvg += $s;
        }
        $statAvg = count($xiPlayers) > 0 ? $statAvg / count($xiPlayers) : 70;

        // Team OVR ikut menentukan (kekuatan umum tim), stat relevan jadi pembeda utama.
        $ovrAvg = 0;
        foreach ($xiPlayers as $p) {
            $ovrAvg += self::ovrFor($p);
        }
        $ovrAvg = count($xiPlayers) > 0 ? $ovrAvg / count($xiPlayers) : 70;

        $skill = round($statAvg * 0.65 + $ovrAvg * 0.35, 1);
        $target = (float) $difficulty;

        $out = [];
        $goals = 0;
        for ($i = 0; $i < $rounds; $i++) {
            $p = 0.5 + ($skill - $target) * 0.035;
            $p = max(0.10, min(0.92, $p));
            $roll = mt_rand() / mt_getrandmax();
            $ok = $roll < $p;
            if ($ok) {
                $goals++;
            }
            $out[] = ['success' => $ok, 'roll' => round($roll, 3), 'p' => round($p, 3)];
        }

        return [
            'goals' => $goals, 'misses' => $rounds - $goals,
            'success' => $goals >= $need,
            'skill' => $skill, 'target' => $target,
            'rounds' => $out, 'need' => $need, 'total' => $rounds,
        ];
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

    /** Bobot peluang cetak gol per lini — semua posisi BISA cetak gol,
     *  tidak dipatok selalu penyerang (bahkan kiper punya peluang kecil). */
    public const SCORER_WEIGHTS = ['GK' => 0.4, 'DF' => 1.5, 'MF' => 2.8, 'FW' => 4.2];

    /** Bobot peluang assist per lini — siapa pun bisa assist (termasuk bek/kiper). */
    public const ASSIST_WEIGHTS = ['GK' => 0.5, 'DF' => 1.8, 'MF' => 3.2, 'FW' => 2.4];

    /** Peluang sebuah gol disertai assist (sisanya: solo run / freekick / penalti). */
    public const ASSIST_CHANCE = 0.62;

    /** Peluang pertandingan TANPA kartu sama sekali. */
    public const NO_CARD_CHANCE = 0.30;

    /** Peluang ada kartu merah langsung di sebuah pertandingan. */
    public const RED_CARD_CHANCE = 0.10;

    /**
     * Statistik pertandingan yang konsisten dengan skor:
     * penguasaan bola, tendangan, tendangan ke gawang, sentuhan kotak lawan,
     * kesempatan besar, umpan akurat, pelanggaran, sepak pojok, offside.
     *
     * @return array{a:array<string,int>,b:array<string,int>}
     */
    public static function matchStatistics(int $ovrA, int $ovrB, int $goalsA, int $goalsB): array
    {
        $diff = $ovrA - $ovrB;
        $possessionA = max(28, min(72, (int) round(50 + $diff * 0.7 + mt_rand(-6, 6))));
        $possessionB = 100 - $possessionA;

        $build = function (int $possession, int $goals, int $edge) {
            $shots = 8 + (int) round($possession / 9) + $goals * 2 + $edge + mt_rand(-3, 4);
            $shots = max($goals, min(30, $shots));

            $onTarget = (int) round($shots * (0.38 + mt_rand(-6, 10) / 100));
            $onTarget = max($goals, min($shots, $onTarget));

            $bigChances = max($goals, (int) round($onTarget * (0.48 + mt_rand(-12, 16) / 100)));
            $bigChances = min($shots, $bigChances);

            $touches = max($onTarget, (int) round(16 + $possession * 0.42 + mt_rand(-6, 8)));
            $touches = min(90, $touches);

            $passes = (int) round(300 + $possession * 5.5 + mt_rand(-30, 30));
            $accuracy = max(68, min(94, 76 + (int) round(($possession - 50) * 0.25) + mt_rand(-4, 4)));
            $accurate = min($passes, (int) round($passes * $accuracy / 100));

            return [
                'possession' => $possession,
                'shots' => $shots,
                'shots_on_target' => $onTarget,
                'touches_in_box' => $touches,
                'big_chances' => $bigChances,
                'passes_attempted' => $passes,
                'accurate_passes' => $accurate,
                'pass_accuracy' => $accuracy,
                'fouls' => max(3, min(20, 13 - (int) round($possession / 14) + mt_rand(-3, 4))),
                'corners' => max(0, min(14, (int) round($shots / 3.5) + mt_rand(-1, 2))),
                'offsides' => max(0, min(6, mt_rand(0, 4) + (int) round(max(0, $edge) / 2))),
            ];
        };

        return [
            'a' => $build($possessionA, $goalsA, (int) round($diff * 0.5)),
            'b' => $build($possessionB, $goalsB, (int) round(-$diff * 0.5)),
        ];
    }

    /**
     * Simulasi lengkap: skor (pakai simulateMatch agar konsisten) + rincian
     * pencetak gol, assist, kartu, statistik, rating pemain & MOTM.
     *
     * @param  array<int, array{name:string,pos:string}>  $xiA  XI tim A (pos = slot_id)
     * @param  array<int, array{name:string,pos:string}>  $xiB  XI tim B
     * @return array{a:int,b:int,winner:string,events:array,stats:array,ratings:array,motm:array}
     */
    public static function simulateMatchDetail(int $ovrA, int $ovrB, array $xiA, array $xiB): array
    {
        $sim = self::simulateMatch($ovrA, $ovrB);
        $events = ['a' => self::teamEvents($xiA, $sim['a']), 'b' => self::teamEvents($xiB, $sim['b'])];
        self::assignCards($events, $xiA, $xiB);
        $stats = self::matchStatistics($ovrA, $ovrB, $sim['a'], $sim['b']);

        $ratings = [
            'a' => self::teamRatings($xiA, $events['a'], $sim['winner'] === 'A' ? 'win' : ($sim['winner'] === 'DRAW' ? 'draw' : 'loss')),
            'b' => self::teamRatings($xiB, $events['b'], $sim['winner'] === 'B' ? 'win' : ($sim['winner'] === 'DRAW' ? 'draw' : 'loss')),
        ];
        $motm = self::pickMotm($ratings);

        return array_merge($sim, ['events' => $events, 'stats' => $stats, 'ratings' => $ratings, 'motm' => $motm]);
    }

    /** @return array{goals:array,yellows:array,reds:array} */
    private static function teamEvents(array $xi, int $goals): array
    {
        $out = ['goals' => [], 'yellows' => [], 'reds' => []];
        if ($goals <= 0 || count($xi) === 0) {
            return $out;
        }
        $minutes = self::pickMinutes($goals);
        for ($i = 0; $i < $goals; $i++) {
            $scorer = self::pickWeighted($xi, fn ($p) => (self::SCORER_WEIGHTS[self::baseGroup(self::slotBaseKey($p['pos'] ?? 'MF'))] ?? 2.0));
            $entry = ['player' => $scorer['name'], 'minute' => $minutes[$i], 'type' => 'open', 'assist' => null];
            // Tidak semua gol ada assist.
            if (mt_rand() / mt_getrandmax() < self::ASSIST_CHANCE) {
                $mates = array_values(array_filter($xi, fn ($p) => $p['name'] !== $scorer['name']));
                if (count($mates) > 0) {
                    $assister = self::pickWeighted($mates, fn ($p) => (self::ASSIST_WEIGHTS[self::baseGroup(self::slotBaseKey($p['pos'] ?? 'MF'))] ?? 2.0));
                    $entry['assist'] = $assister['name'];
                } else {
                    $entry['type'] = self::soloGoalType();
                }
            } else {
                $entry['type'] = self::soloGoalType();
            }
            $out['goals'][] = $entry;
        }

        return $out;
    }

    private static function soloGoalType(): string
    {
        $r = mt_rand(1, 100);

        return $r <= 50 ? 'solo' : ($r <= 80 ? 'freekick' : 'penalty');
    }

    /** Kartu kuning acak (bisa nol), merah jarang — posisi mana pun bisa kena. */
    private static function assignCards(array &$events, array $xiA, array $xiB): void
    {
        if (mt_rand(1, 100) <= (int) (self::NO_CARD_CHANCE * 100)) {
            return;
        }
        $all = array_merge(
            array_map(fn ($p) => ['team' => 'a', 'name' => $p['name']], $xiA),
            array_map(fn ($p) => ['team' => 'b', 'name' => $p['name']], $xiB),
        );
        if (count($all) === 0) {
            return;
        }
        $nYellow = 1;
        if (mt_rand(1, 100) <= 40) {
            $nYellow++;
        }
        if (mt_rand(1, 100) <= 15) {
            $nYellow++;
        }
        $nYellow = min($nYellow, 4);
        $minutes = self::pickMinutes($nYellow);
        $yellowed = [];
        for ($i = 0; $i < $nYellow; $i++) {
            $pick = $all[array_rand($all)];
            $events[$pick['team']]['yellows'][] = ['player' => $pick['name'], 'minute' => $minutes[$i]];
            $yellowed[$pick['team'].chr(0).$pick['name']] = $minutes[$i];
        }
        if (mt_rand(1, 100) <= (int) (self::RED_CARD_CHANCE * 100)) {
            $pick = $all[array_rand($all)];
            $key = $pick['team'].chr(0).$pick['name'];
            $events[$pick['team']]['reds'][] = [
                'player' => $pick['name'],
                'minute' => mt_rand(1, 90),
                'type' => isset($yellowed[$key]) ? 'second_yellow' : 'direct',
            ];
        }
    }

    /** @return array<int, array{player:string,rating:float,goals:int,assists:int}> */
    private static function teamRatings(array $xi, array $events, string $outcome): array
    {
        $adj = $outcome === 'win' ? 0.4 : ($outcome === 'draw' ? 0.1 : -0.2);
        $goalsBy = [];
        $assistsBy = [];
        foreach ($events['goals'] as $g) {
            $goalsBy[$g['player']] = ($goalsBy[$g['player']] ?? 0) + 1;
            if (! empty($g['assist'])) {
                $assistsBy[$g['assist']] = ($assistsBy[$g['assist']] ?? 0) + 1;
            }
        }
        $yellowBy = [];
        foreach ($events['yellows'] as $c) {
            $yellowBy[$c['player']] = ($yellowBy[$c['player']] ?? 0) + 1;
        }
        $redBy = [];
        foreach ($events['reds'] as $c) {
            $redBy[$c['player']] = true;
        }
        $out = [];
        foreach ($xi as $p) {
            $name = $p['name'];
            $r = 6.3 + mt_rand(0, 70) / 100
                + ($goalsBy[$name] ?? 0) * 0.9
                + ($assistsBy[$name] ?? 0) * 0.6
                - ($yellowBy[$name] ?? 0) * 0.4
                - (isset($redBy[$name]) ? 2.0 : 0)
                + $adj;
            $r = max(5.0, min(10.0, $r));
            $out[] = [
                'player' => $name, 'rating' => round($r, 1),
                'goals' => $goalsBy[$name] ?? 0, 'assists' => $assistsBy[$name] ?? 0,
            ];
        }
        usort($out, fn ($x, $y) => $y['rating'] <=> $x['rating']);

        return $out;
    }

    private static function pickMotm(array $ratings): array
    {
        $best = ['team' => 'a', 'player' => '—', 'rating' => 0, 'goals' => 0, 'assists' => 0];
        foreach (['a', 'b'] as $team) {
            foreach ($ratings[$team] ?? [] as $r) {
                $better = $r['rating'] > $best['rating']
                    || ($r['rating'] == $best['rating'] && (($r['goals'] + $r['assists']) > ($best['goals'] + $best['assists'])));
                if ($better) {
                    $best = ['team' => $team] + $r;
                }
            }
        }

        return $best;
    }

    /** @return int[] menit unik terurut 1–90. */
    private static function pickMinutes(int $n): array
    {
        $pool = range(1, 90);
        $out = [];
        for ($i = 0; $i < $n && count($pool) > 0; $i++) {
            $k = array_rand($pool);
            $out[] = $pool[$k];
            unset($pool[$k]);
        }
        sort($out);

        return array_values($out);
    }

    /** @param array<int, mixed> $items */
    private static function pickWeighted(array $items, callable $weight): mixed
    {
        $total = 0;
        $bag = [];
        foreach ($items as $item) {
            // Jitter acak agar pemain yang sama tidak selalu terpilih.
            $w = max(0.05, ((float) $weight($item)) * (0.5 + mt_rand() / mt_getrandmax()));
            $bag[] = [$item, $w];
            $total += $w;
        }
        if ($total <= 0) {
            return $items[array_rand($items)];
        }
        $roll = (mt_rand() / mt_getrandmax()) * $total;
        foreach ($bag as [$item, $w]) {
            $roll -= $w;
            if ($roll <= 0) {
                return $item;
            }
        }

        return $bag[count($bag) - 1][0];
    }
}
