<?php

use App\Models\GachaPack;
use App\Services\GameService;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Pack POTW: berisi HANYA pemain berstatus POTW.
     * Pack reguler (bronze/silver/gold/diamond) tidak boleh berisi pemain POTW
     * (disaring di GachaController::draw). Aman dijalankan ulang.
     */
    public function up(): void
    {
        $pack = GameService::PACKS['potw'];
        GachaPack::updateOrCreate(
            ['slug' => 'potw'],
            ['name' => $pack['name'], 'price' => $pack['price'], 'rates' => $pack['rates'], 'is_active' => true]
        );
    }

    public function down(): void
    {
        GachaPack::where('slug', 'potw')->delete();
    }
};
