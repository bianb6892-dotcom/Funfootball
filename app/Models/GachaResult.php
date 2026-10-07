<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GachaResult extends Model
{
    protected $fillable = ['user_id', 'pack_id', 'player_id', 'player_name', 'ovr', 'rank_rolled', 'price_paid'];

    public function pack()
    {
        return $this->belongsTo(GachaPack::class, 'pack_id');
    }

    public function player()
    {
        return $this->belongsTo(Player::class);
    }
}
