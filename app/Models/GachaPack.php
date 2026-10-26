<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GachaPack extends Model
{
    public const PACK_RANKS = ['bronze', 'silver', 'gold', 'diamond', 'legend', 'potw', 'flashback', 'halloween'];

    protected $fillable = ['slug', 'name', 'price', 'color', 'rates', 'allowed_ranks', 'banner_path', 'is_active'];

    protected $appends = ['banner_url'];

    protected function casts(): array
    {
        return ['rates' => 'array', 'allowed_ranks' => 'array', 'is_active' => 'boolean'];
    }

    public function getBannerUrlAttribute(): ?string
    {
        return $this->banner_path ? '/storage/'.$this->banner_path : null;
    }
}
