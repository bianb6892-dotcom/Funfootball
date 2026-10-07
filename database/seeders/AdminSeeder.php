<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@footballfun.test'],
            [
                'name' => 'Admin',
                'password' => 'password123',
                'role' => 'admin',
                'team_name' => 'FOOTBALL-FUN HQ',
                'coins' => 0,
            ]
        );
    }
}
