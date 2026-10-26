<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class FunCategory extends Model
{
    protected $fillable = ['name', 'icon', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    /** Ikon globe Font Awesome yang cocok dengan nama benua. */
    public static function iconForName(string $name): string
    {
        $normalized = Str::lower(trim($name));

        $icons = [
            'eropa' => 'fa-earth-europe',
            'europe' => 'fa-earth-europe',
            'asia' => 'fa-earth-asia',
            'afrika' => 'fa-earth-africa',
            'africa' => 'fa-earth-africa',
            'amerika' => 'fa-earth-americas',
            'americas' => 'fa-earth-americas',
            'oseania' => 'fa-earth-oceania',
            'oceania' => 'fa-earth-oceania',
            'australia' => 'fa-earth-oceania',
        ];

        foreach ($icons as $needle => $icon) {
            if (str_contains($normalized, $needle)) {
                return $icon;
            }
        }

        return 'fa-globe';
    }

    public function leagues()
    {
        return $this->hasMany(FunLeague::class);
    }

    public function teams()
    {
        return $this->hasMany(FunTeam::class);
    }
}
