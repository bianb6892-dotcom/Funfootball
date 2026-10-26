<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    protected $fillable = [
        'name', 'description', 'starts_at', 'ends_at', 'formation',
        'reward_coins', 'reward_player_id', 'reward_pack_id', 'reward_pack_draws',
        'reward_tokens', 'token_cost',
        'max_entries_per_user', 'is_active', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function slots()
    {
        return $this->hasMany(EventSlot::class);
    }

    public function rules()
    {
        return $this->hasMany(EventRule::class);
    }

    public function attempts()
    {
        return $this->hasMany(EventAttempt::class);
    }

    public function unlocks()
    {
        return $this->hasMany(EventTierUnlock::class);
    }

    public function rewardPlayer()
    {
        return $this->belongsTo(Player::class, 'reward_player_id');
    }

    public function rewardPack()
    {
        return $this->belongsTo(GachaPack::class, 'reward_pack_id');
    }

    public function rewardTiers()
    {
        return $this->hasMany(EventRewardTier::class)->orderBy('tier');
    }

    public function isLive(): bool
    {
        if (! $this->is_active) {
            return false;
        }
        $now = now();

        return $this->starts_at <= $now && $now <= $this->ends_at;
    }
}
