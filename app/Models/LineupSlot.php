<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LineupSlot extends Model
{
    protected $fillable = ['lineup_id', 'slot_id', 'slot_position', 'player_id', 'is_bench', 'bench_order'];

    protected function casts(): array
    {
        return ['is_bench' => 'boolean'];
    }

    public function player()
    {
        return $this->belongsTo(Player::class);
    }
}
