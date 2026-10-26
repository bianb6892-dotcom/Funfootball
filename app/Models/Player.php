<?php

namespace App\Models;

use App\Services\GameService;
use Illuminate\Database\Eloquent\Model;

class Player extends Model
{
    public const CARDS = ['legend', 'diamond', 'gold', 'silver', 'bronze', 'potw', 'flashback', 'halloween', 'ucl', 'uel', 'uecl'];

    protected $fillable = [
        'name', 'club', 'nationality', 'country_code', 'position', 'alt_positions', 'preferred_foot', 'shirt_number', 'age', 'image_path',
        'pac', 'sho', 'pas', 'dri', 'def', 'phy', 'div', 'han', 'kic', 'ref', 'spd', 'pos',
        'acceleration', 'sprint_speed',
        'positioning', 'finishing', 'shot_power', 'long_shots', 'volleys', 'penalties',
        'vision', 'crossing', 'free_kick_accuracy', 'short_passing', 'long_passing', 'curve',
        'agility', 'balance', 'reactions', 'ball_control', 'dribbling', 'composure',
        'interceptions', 'heading_accuracy', 'def_awareness', 'standing_tackle', 'sliding_tackle',
        'jumping', 'stamina', 'strength', 'aggression',
        'gk_diving', 'gk_handling', 'gk_kicking', 'gk_positioning', 'gk_reflexes',
        'ovr', 'rank', 'manual_rank', 'is_potw', 'is_flashback', 'is_halloween', 'is_ucl', 'is_uel', 'is_uecl', 'is_active_in_gacha', 'is_visible',
    ];

    protected function casts(): array
    {
        return ['alt_positions' => 'array', 'manual_rank' => 'boolean', 'is_potw' => 'boolean', 'is_flashback' => 'boolean', 'is_halloween' => 'boolean', 'is_ucl' => 'boolean', 'is_uel' => 'boolean', 'is_uecl' => 'boolean', 'is_active_in_gacha' => 'boolean', 'is_visible' => 'boolean'];
    }

    protected $appends = ['image_url', 'card'];

    /**
     * Kartu efektif untuk tampilan & filter kategori.
     * Prioritas: FLASHBACK > HALLOWEEN > UCL > UEL > UECL > POTW > rank (termasuk legend).
     * BASIC = diamond/gold/silver/bronze (tanpa legend, POTW, flashback, Halloween & UEFA).
     * UEFA = gabungan UCL + UEL + UECL.
     */
    public function getCardAttribute(): string
    {
        if ($this->is_flashback) {
            return 'flashback';
        }
        if ($this->is_halloween) {
            return 'halloween';
        }
        if ($this->is_ucl) {
            return 'ucl';
        }
        if ($this->is_uel) {
            return 'uel';
        }
        if ($this->is_uecl) {
            return 'uecl';
        }

        return $this->is_potw ? 'potw' : ($this->rank ?? 'bronze');
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path ? '/storage/'.$this->image_path : null;
    }

    protected static function booted(): void
    {
        // Backend = source of truth: OVR & rank auto dihitung, frontend tidak dipercaya.
        // Jalur tunggal via ovrFor() agar cap/rentang OVR kartu spesial selalu berlaku.
        static::saving(function (Player $player) {
            $player->alt_positions = GameService::normalizeAltPositions($player->alt_positions ?? [], $player->position ?? 'MF');
            foreach (GameService::defaultDetailedAttributes($player) as $key => $value) {
                if ($player->getAttribute($key) === null) {
                    $player->setAttribute($key, $value);
                }
            }
            $player->ovr = GameService::ovrFor($player);
            if (! $player->manual_rank || ! in_array($player->rank, GameService::RANKS, true)) {
                $player->rank = GameService::rankFromOvr($player->ovr);
                $player->manual_rank = false;
            }
        });
    }

    /** Posisi alternatif yang dinormalisasi (uppercase, unik, tanpa posisi utama). */
    public function altPositions(): array
    {
        return GameService::altPositionsOf($this);
    }

    /** Semua posisi natural: [utama, ...alternatif]. */
    public function naturalPositions(): array
    {
        return GameService::naturalPositionsOf($this);
    }

    /** True bila slot (id/pos) adalah posisi natural pemain (utama/alternatif) = tanpa penalti. */
    public function isNaturalFor(string $slotIdOrPos): bool
    {
        return GameService::isNaturalFit($this, $slotIdOrPos);
    }

    public function owners()
    {
        return $this->hasMany(UserPlayer::class);
    }
}
