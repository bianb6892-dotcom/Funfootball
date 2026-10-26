<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventTierSlot extends Model
{
    protected $fillable = [
        'event_reward_tier_id', 'slot_id', 'slot_position', 'player_id',
    ];

    public function tier()
    {
        return $this->belongsTo(EventRewardTier::class, 'event_reward_tier_id');
    }

    public function player()
    {
        return $this->belongsTo(Player::class);
    }
}
