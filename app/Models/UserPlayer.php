<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserPlayer extends Model
{
    protected $fillable = ['user_id', 'player_id', 'acquired_via'];

    public function player()
    {
        return $this->belongsTo(Player::class);
    }
}
