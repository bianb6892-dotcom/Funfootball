<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CollectionController;
use App\Http\Controllers\Api\GachaController;
use App\Http\Controllers\Api\LineupController;
use App\Http\Controllers\Api\MatchController;
use App\Http\Controllers\Api\PlayerController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/players', [PlayerController::class, 'index']);
    Route::get('/players/compare', [PlayerController::class, 'compare']);
    Route::get('/players/{player}', [PlayerController::class, 'show']);

    Route::middleware('role:user,admin')->group(function () {
        Route::get('/gacha/packs', [GachaController::class, 'packs']);
        Route::post('/gacha/{pack:slug}/draw', [GachaController::class, 'draw']);
        Route::get('/gacha/history', [GachaController::class, 'history']);

        Route::get('/collection', [CollectionController::class, 'index']);

        Route::get('/lineup', [LineupController::class, 'show']);
        Route::put('/lineup', [LineupController::class, 'save']);

        Route::get('/users/opponents', [MatchController::class, 'opponents']);
        Route::post('/matches/challenge', [MatchController::class, 'challenge']);
        Route::get('/matches', [MatchController::class, 'history']);
    });

    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::post('/players', [PlayerController::class, 'store']);
        Route::put('/players/{player}', [PlayerController::class, 'update']);
        Route::delete('/players/{player}', [PlayerController::class, 'destroy']);

        Route::get('/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::get('/users/{user}', [AdminController::class, 'userDetail']);
        Route::post('/users/{user}/coins', [AdminController::class, 'adjustCoins']);
        Route::post('/users/{user}/toggle', [AdminController::class, 'toggleUser']);
        Route::get('/matches', [AdminController::class, 'matches']);
        Route::put('/gacha/packs/{pack}', [AdminController::class, 'updatePack']);
        Route::post('/players/{player}/toggle-pool', [AdminController::class, 'togglePool']);
    });
});
