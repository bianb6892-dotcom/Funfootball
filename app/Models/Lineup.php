<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lineup extends Model
{
    protected $fillable = ['user_id', 'formation'];

    public function slots()
    {
        return $this->hasMany(LineupSlot::class);
    }
}
