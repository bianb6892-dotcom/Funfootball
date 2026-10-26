<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventRewardTier extends Model
{
    public const CHALLENGE_TYPES = ['match', 'free_kick', 'penalty', 'dribble'];

    protected $fillable = [
        'event_id', 'tier', 'reward_coins', 'reward_player_id',
        'reward_pack_id', 'reward_pack_draws', 'reward_tokens',
        'token_cost', 'challenge_type', 'ovr_boost',
        'formation', 'use_previous_lineup',
    ];

    protected function casts(): array
    {
        return [
            'use_previous_lineup' => 'boolean',
        ];
    }

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function rewardPlayer()
    {
        return $this->belongsTo(Player::class, 'reward_player_id');
    }

    public function rewardPack()
    {
        return $this->belongsTo(GachaPack::class, 'reward_pack_id');
    }

    public function tierSlots()
    {
        return $this->hasMany(EventTierSlot::class);
    }
}
