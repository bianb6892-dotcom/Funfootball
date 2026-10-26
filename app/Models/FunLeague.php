<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FunLeague extends Model
{
    protected $fillable = ['fun_category_id', 'name', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function category()
    {
        return $this->belongsTo(FunCategory::class, 'fun_category_id');
    }

    public function teams()
    {
        return $this->hasMany(FunTeam::class);
    }
}
