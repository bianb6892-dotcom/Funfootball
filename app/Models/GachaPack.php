<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GachaPack extends Model
{
    protected $fillable = ['slug', 'name', 'price', 'color', 'rates', 'is_active'];

    protected function casts(): array
    {
        return ['rates' => 'array', 'is_active' => 'boolean'];
    }
}
