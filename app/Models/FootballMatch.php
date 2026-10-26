<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FootballMatch extends Model
{
    protected $table = 'matches';

    protected $fillable = [
        'challenger_id', 'opponent_id', 'fun_team_id', 'difficulty',
        'challenger_ovr', 'opponent_ovr',
        'challenger_score', 'opponent_score', 'result', 'snapshot', 'played_at',
    ];

    protected function casts(): array
    {
        return ['snapshot' => 'array', 'played_at' => 'datetime'];
    }
}
