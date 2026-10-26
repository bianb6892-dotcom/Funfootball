<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyTokenClaim;
use App\Models\TokenTransaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TokenController extends Controller
{
    public const DAILY_BASE = 3;

    public const DAILY_MAX = 5;

    public const REGISTER_BONUS_TOKENS = 3;

    /**
     * Status token + klaim harian milik user yang login.
     * amount = 3 token, +1 tiap kelipatan 3 streak (maks 5/hari).
     */
    public static function claimAmountForStreak(int $streak): int
    {
        return min(self::DAILY_MAX, self::DAILY_BASE + intdiv(max(0, $streak), 3));
    }

    /** @return array{tokens:int,streak:int,today_claimed:bool,can_claim:bool,claim_amount:int,last_claimed_date:?string} */
    public static function dailyStatusFor(User $user): array
    {
        $today = now()->toDateString();
        $row = DailyTokenClaim::where('user_id', $user->id)->first();
        $last = $row?->last_claimed_date?->toDateString();
        $todayClaimed = $last === $today;
        // Streak yang akan tercatat bila klaim sekarang.
        $nextStreak = ! $row || $row->last_claimed_date === null
            ? 1
            : ($last === $today
                ? (int) $row->streak
                : ($row->last_claimed_date->copy()->addDay()->toDateString() === $today
                    ? (int) $row->streak + 1
                    : 1));

        return [
            'tokens' => (int) $user->event_tokens,
            'streak' => (int) ($row?->streak ?? 0),
            'today_claimed' => $todayClaimed,
            'can_claim' => ! $todayClaimed,
            'claim_amount' => self::claimAmountForStreak($nextStreak),
            'next_streak' => $nextStreak,
            'last_claimed_date' => $last,
        ];
    }

    public function status(Request $request)
    {
        return response()->json(self::dailyStatusFor($request->user()));
    }

    /** Klaim harian 1x per hari kalender. Transaksional + anti dobel klaim. */
    public function claim(Request $request)
    {
        $today = now()->toDateString();

        $result = DB::transaction(function () use ($request, $today) {
            $claim = DailyTokenClaim::where('user_id', $request->user()->id)
                ->lockForUpdate()->first();
            if (! $claim) {
                $claim = DailyTokenClaim::create(['user_id' => $request->user()->id]);
            }
            $last = $claim->last_claimed_date?->toDateString();
            if ($last === $today) {
                return null;
            }

            $streak = $claim->last_claimed_date !== null
            && $claim->last_claimed_date->copy()->addDay()->toDateString() === $today
                ? (int) $claim->streak + 1
                : 1;
            $amount = self::claimAmountForStreak($streak);

            $user = $request->user()->lockForUpdate()->find($request->user()->id);
            $user->increment('event_tokens', $amount);
            $user->refresh();
            TokenTransaction::create([
                'user_id' => $user->id, 'type' => 'daily_claim',
                'amount' => $amount, 'balance_after' => $user->event_tokens,
                'description' => "Klaim harian token (streak {$streak} hari)",
            ]);
            $claim->update(['last_claimed_date' => $today, 'streak' => $streak]);

            return [
                'tokens_granted' => $amount,
                'streak' => $streak,
                'tokens' => (int) $user->event_tokens,
                'today_claimed' => true,
                'can_claim' => false,
                'claim_amount' => $amount,
                'next_streak' => $streak,
                'last_claimed_date' => $today,
            ];
        });

        if ($result === null) {
            return response()->json(['message' => 'Klaim harian sudah diambil hari ini. Besok lagi ya!'], 422);
        }

        return response()->json($result, 201);
    }

    public static function grant(User $user, int $amount, string $type, string $description, ?int $adminId = null): int
    {
        $user->increment('event_tokens', $amount);
        $user->refresh();
        TokenTransaction::create([
            'user_id' => $user->id, 'admin_id' => $adminId, 'type' => $type,
            'amount' => $amount, 'balance_after' => $user->event_tokens,
            'description' => $description,
        ]);

        return (int) $user->event_tokens;
    }

    public static function spend(User $user, int $amount, string $type, string $description): int
    {
        $fresh = max(0, (int) $user->event_tokens - $amount);
        $user->update(['event_tokens' => $fresh]);
        TokenTransaction::create([
            'user_id' => $user->id, 'type' => $type,
            'amount' => -$amount, 'balance_after' => $fresh,
            'description' => $description,
        ]);

        return $fresh;
    }
}
