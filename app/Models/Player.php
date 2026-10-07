<?php

namespace App\Models;

use App\Services\GameService;
use Illuminate\Database\Eloquent\Model;

class Player extends Model
{
    protected $fillable = [
        'name', 'club', 'nationality', 'country_code', 'position', 'shirt_number', 'age', 'image_path',
        'pac', 'sho', 'pas', 'dri', 'def', 'phy',
        'div', 'han', 'kic', 'ref', 'spd', 'pos',
        'ovr', 'rank', 'manual_rank', 'is_active_in_gacha',
    ];

    protected function casts(): array
    {
        return ['manual_rank' => 'boolean', 'is_active_in_gacha' => 'boolean'];
    }

    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path ? '/storage/'.$this->image_path : null;
    }

    protected static function booted(): void
    {
        // Backend = source of truth: OVR & rank auto dihitung, frontend tidak dipercaya.
        static::saving(function (Player $player) {
            $stats = GameService::statsFor($player);
            $player->ovr = GameService::calculateOvr($stats, $player->position);
            if (! $player->manual_rank || ! in_array($player->rank, GameService::RANKS, true)) {
                $player->rank = GameService::rankFromOvr($player->ovr);
                $player->manual_rank = false;
            }
        });
    }

    public function owners()
    {
        return $this->hasMany(UserPlayer::class);
    }
}
