<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FunTeamSlot extends Model
{
    protected $fillable = ['fun_team_id', 'slot_id', 'slot_position', 'player_id'];

    public function player()
    {
        return $this->belongsTo(Player::class);
    }
}
