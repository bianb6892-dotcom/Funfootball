<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FunTeam extends Model
{
    protected $fillable = [
        'name', 'short_name', 'fun_category_id', 'fun_league_id', 'formation', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function slots()
    {
        return $this->hasMany(FunTeamSlot::class);
    }

    public function category()
    {
        return $this->belongsTo(FunCategory::class, 'fun_category_id');
    }

    public function league()
    {
        return $this->belongsTo(FunLeague::class, 'fun_league_id');
    }
}
