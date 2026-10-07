<?php

namespace Database\Seeders;

use App\Models\GachaPack;
use App\Services\GameService;
use Illuminate\Database\Seeder;

class GachaPackSeeder extends Seeder
{
    public function run(): void
    {
        foreach (GameService::PACKS as $slug => $pack) {
            GachaPack::updateOrCreate(
                ['slug' => $slug],
                ['name' => $pack['name'], 'price' => $pack['price'], 'rates' => $pack['rates'], 'is_active' => true]
            );
        }
    }
}
