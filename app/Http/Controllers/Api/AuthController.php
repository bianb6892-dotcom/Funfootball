<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CoinTransaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', 'confirmed', Password::min(8)],
            'team_name' => 'required|string|max:255',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => 'user',
            'team_name' => $data['team_name'],
            'coins' => 1000,
        ]);

        CoinTransaction::create([
            'user_id' => $user->id, 'type' => 'register_bonus',
            'amount' => 1000, 'balance_after' => 1000, 'description' => 'Starter coins',
        ]);

        return response()->json([
            'user' => $user, 'token' => $user->createToken('web')->plainTextToken,
        ], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate(['email' => 'required|email', 'password' => 'required|string']);
        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }
        if (! $user->is_active) {
            return response()->json(['message' => 'Account disabled.'], 403);
        }

        return response()->json([
            'user' => $user, 'token' => $user->createToken('web')->plainTextToken,
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $user->loadCount(['userPlayers']);

        return response()->json($user);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }
}
