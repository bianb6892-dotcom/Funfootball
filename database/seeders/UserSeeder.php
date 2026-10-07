<?php

namespace Database\Seeders;

use App\Models\CoinTransaction;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            ['name' => 'Sabian', 'email' => 'sabian@test.com', 'team_name' => 'Sabian FC'],
            ['name' => 'Rizky', 'email' => 'rizky@test.com', 'team_name' => 'Rizky FC'],
        ];

        foreach ($users as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => 'password123',
                    'role' => 'user',
                    'team_name' => $data['team_name'],
                    'coins' => 1000,
                ]
            );

            CoinTransaction::firstOrCreate(
                ['user_id' => $user->id, 'type' => 'register_bonus', 'amount' => 1000],
                ['balance_after' => $user->coins, 'description' => 'Starter coins']
            );
        }
    }
}
