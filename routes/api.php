<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CollectionController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\FunCategoryController;
use App\Http\Controllers\Api\FunLeagueController;
use App\Http\Controllers\Api\FunMatchController;
use App\Http\Controllers\Api\GachaController;
use App\Http\Controllers\Api\LineupController;
use App\Http\Controllers\Api\MailController;
use App\Http\Controllers\Api\MatchController;
use App\Http\Controllers\Api\PlayerController;
use App\Http\Controllers\Api\TokenController;
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

        Route::get('/fun-teams', [FunMatchController::class, 'index']);
        Route::post('/fun-teams/{funTeam}/play', [FunMatchController::class, 'play']);

        Route::get('/mails', [MailController::class, 'index']);
        Route::get('/mails/unread-count', [MailController::class, 'unreadCount']);
        Route::post('/mails/claim-all', [MailController::class, 'claimAll']);
        Route::post('/mails/read-all', [MailController::class, 'readAll']);
        Route::post('/mails/{mail}/read', [MailController::class, 'read']);
        Route::post('/mails/{mail}/unread', [MailController::class, 'unread']);
        Route::post('/mails/{mail}/claim', [MailController::class, 'claim']);

        Route::get('/events', [EventController::class, 'index']);
        Route::get('/events/my-attempts', [EventController::class, 'myAttempts']);
        Route::get('/events/{event}', [EventController::class, 'show']);
        Route::post('/events/{event}/challenge', [EventController::class, 'challenge']);

        Route::get('/daily/status', [TokenController::class, 'status']);
        Route::post('/daily/claim', [TokenController::class, 'claim']);
    });

    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::post('/players', [PlayerController::class, 'store']);
        Route::put('/players/{player}', [PlayerController::class, 'update']);
        Route::delete('/players/{player}', [PlayerController::class, 'destroy']);

        Route::get('/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::get('/users/{user}', [AdminController::class, 'userDetail']);
        Route::post('/users/{user}/coins', [AdminController::class, 'adjustCoins']);
        Route::post('/users/{user}/tokens', [AdminController::class, 'adjustTokens']);
        Route::post('/users/{user}/toggle', [AdminController::class, 'toggleUser']);
        Route::get('/matches', [AdminController::class, 'matches']);
        Route::post('/gacha/packs', [AdminController::class, 'storePack']);
        Route::post('/gacha/packs/{pack}', [AdminController::class, 'updatePack']);
        Route::delete('/gacha/packs/{pack}', [AdminController::class, 'destroyPack']);
        Route::put('/gacha/packs/{pack}', [AdminController::class, 'updatePack']);
        Route::post('/players/{player}/toggle-pool', [AdminController::class, 'togglePool']);
        Route::post('/players/{player}/toggle-visibility', [AdminController::class, 'toggleVisibility']);
        Route::post('/players/{player}/toggle-potw', [AdminController::class, 'togglePotw']);

        Route::get('/mails', [MailController::class, 'adminIndex']);
        Route::post('/mails', [MailController::class, 'send']);
        Route::delete('/mails/{mail}', [MailController::class, 'destroy']);

        Route::get('/events', [EventController::class, 'adminIndex']);
        Route::post('/events', [EventController::class, 'store']);
        Route::get('/events/{event}', [EventController::class, 'adminShow']);
        Route::put('/events/{event}', [EventController::class, 'update']);
        Route::post('/events/{event}/toggle-active', [AdminController::class, 'toggleEventActive']);
        Route::delete('/events/{event}', [EventController::class, 'destroy']);

        Route::get('/fun-categories', [FunCategoryController::class, 'index']);
        Route::post('/fun-categories', [FunCategoryController::class, 'store']);
        Route::put('/fun-categories/{funCategory}', [FunCategoryController::class, 'update']);
        Route::delete('/fun-categories/{funCategory}', [FunCategoryController::class, 'destroy']);
        Route::post('/fun-categories/{funCategory}/toggle-active', [FunCategoryController::class, 'toggleActive']);

        Route::post('/fun-leagues', [FunLeagueController::class, 'store']);
        Route::put('/fun-leagues/{funLeague}', [FunLeagueController::class, 'update']);
        Route::delete('/fun-leagues/{funLeague}', [FunLeagueController::class, 'destroy']);
        Route::post('/fun-leagues/{funLeague}/toggle-active', [FunLeagueController::class, 'toggleActive']);

        Route::get('/fun-teams', [FunMatchController::class, 'adminIndex']);
        Route::post('/fun-teams', [FunMatchController::class, 'store']);
        Route::put('/fun-teams/{funTeam}', [FunMatchController::class, 'update']);
        Route::delete('/fun-teams/{funTeam}', [FunMatchController::class, 'destroy']);
        Route::post('/fun-teams/{funTeam}/toggle-active', [FunMatchController::class, 'toggleActive']);
        Route::post('/fun-teams/{funTeam}/assign-category', [FunMatchController::class, 'assignCategory']);
    });
});
