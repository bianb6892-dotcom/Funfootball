<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventSlot extends Model
{
    protected $fillable = ['event_id', 'slot_id', 'slot_position', 'player_id'];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function player()
    {
        return $this->belongsTo(Player::class);
    }
}
