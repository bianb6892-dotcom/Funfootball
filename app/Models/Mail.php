<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Mail extends Model
{
    protected $fillable = [
        'user_id', 'admin_id', 'subject', 'body',
        'coin_amount', 'token_amount', 'player_id', 'is_read',
        'claimed_at', 'available_from', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'claimed_at' => 'datetime',
            'available_from' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function player()
    {
        return $this->belongsTo(Player::class);
    }

    /** Apakah mail membawa hadiah yang bisa diklaim (koin, token, dan/atau pemain). */
    public function hasReward(): bool
    {
        return ((int) $this->coin_amount) > 0
            || ((int) $this->token_amount) > 0
            || $this->player_id !== null;
    }

    public function isClaimed(): bool
    {
        return $this->claimed_at !== null;
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /** Belum masuk masa berlaku: available_from di masa depan. */
    public function isNotYetAvailable(): bool
    {
        return $this->available_from !== null && $this->available_from->isFuture();
    }

    /** Masa berlaku mail: dari available_from (atau sekarang) sampai expires_at (atau selamanya). */
    public function isActivePeriod(): bool
    {
        return ! $this->isNotYetAvailable() && ! $this->isExpired();
    }

    /** Masih bisa diklaim: ada hadiah, belum diklaim, sedang dalam masa berlaku. */
    public function isClaimable(): bool
    {
        return $this->hasReward() && ! $this->isClaimed() && $this->isActivePeriod();
    }
}
