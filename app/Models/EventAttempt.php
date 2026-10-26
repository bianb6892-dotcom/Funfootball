<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventAttempt extends Model
{
    protected $fillable = [
        'event_id', 'user_id', 'user_ovr', 'event_ovr',
        'user_score', 'event_score', 'result', 'tier',
        'reward_granted', 'reward_coins', 'reward_player_id',
        'tokens_spent', 'tokens_granted', 'challenge_type',
        'snapshot', 'played_at',
    ];

    protected function casts(): array
    {
        return [
            'reward_granted' => 'boolean',
            'snapshot' => 'array',
            'played_at' => 'datetime',
        ];
    }

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function rewardPlayer()
    {
        return $this->belongsTo(Player::class, 'reward_player_id');
    }
}
