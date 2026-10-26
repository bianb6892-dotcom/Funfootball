<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CoinTransaction;
use App\Models\Mail;
use App\Models\Player;
use App\Models\TokenTransaction;
use App\Models\User;
use App\Models\UserPlayer;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MailController extends Controller
{
    // ============ USER ============

    /** Kotak masuk milik user yang login. */
    public function index(Request $request)
    {
        return response()->json(
            Mail::with(['player', 'admin:id,name'])
                ->where('user_id', $request->user()->id)
                ->latest()
                ->paginate($request->get('per_page', 20))
        );
    }

    /** Jumlah mail belum dibaca (untuk badge navigasi). */
    public function unreadCount(Request $request)
    {
        $now = now();
        $rewardQuery = fn ($q) => $q->where('coin_amount', '>', 0)
            ->orWhere('token_amount', '>', 0)
            ->orWhereNotNull('player_id');

        return response()->json([
            'unread' => Mail::where('user_id', $request->user()->id)->where('is_read', false)->count(),
            'claimable' => Mail::where('user_id', $request->user()->id)
                ->whereNull('claimed_at')
                ->where($rewardQuery)
                ->where(fn ($q) => $q->whereNull('available_from')->orWhere('available_from', '<=', $now))
                ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', $now))
                ->count(),
        ]);
    }

    /** Tandai satu mail sudah dibaca. */
    public function read(Request $request, Mail $mail)
    {
        $this->authorizeOwner($request, $mail);
        if (! $mail->is_read) {
            $mail->update(['is_read' => true]);
        }

        return response()->json($mail->fresh()->load(['player', 'admin:id,name']));
    }

    /** Tandai satu mail belum dibaca lagi (toggle balik). */
    public function unread(Request $request, Mail $mail)
    {
        $this->authorizeOwner($request, $mail);
        if ($mail->is_read) {
            $mail->update(['is_read' => false]);
        }

        return response()->json($mail->fresh()->load(['player', 'admin:id,name']));
    }

    /** Tandai semua mail milik user sudah dibaca sekaligus. */
    public function readAll(Request $request)
    {
        $updated = Mail::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'message' => "Semua mail ditandai sudah dibaca ({$updated} mail).",
            'updated' => $updated,
        ]);
    }

    /** Klaim hadiah satu mail (koin dan/atau pemain). Transaksional + anti dobel klaim. */
    public function claim(Request $request, Mail $mail)
    {
        $this->authorizeOwner($request, $mail);

        return DB::transaction(function () use ($request, $mail) {
            $mail = Mail::whereKey($mail->id)->lockForUpdate()->first();

            if ($mail->user_id !== $request->user()->id) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
            if (! $mail->hasReward()) {
                return response()->json(['message' => 'Mail ini tidak berisi hadiah.'], 422);
            }
            if ($mail->isClaimed()) {
                return response()->json(['message' => 'Hadiah sudah diklaim.'], 422);
            }
            if ($mail->isNotYetAvailable()) {
                $mulai = $mail->available_from?->format('d M Y H:i');

                return response()->json(['message' => "Hadiah belum bisa diklaim. Berlaku mulai {$mulai}."], 422);
            }
            if ($mail->isExpired()) {
                return response()->json(['message' => 'Hadiah sudah kedaluwarsa.'], 422);
            }

            $user = $request->user()->lockForUpdate()->find($request->user()->id);
            $result = ['coins_claimed' => 0, 'tokens_claimed' => 0, 'player' => null, 'player_duplicate' => false];

            if ((int) $mail->coin_amount > 0) {
                $user->increment('coins', (int) $mail->coin_amount);
                $user->refresh();
                CoinTransaction::create([
                    'user_id' => $user->id, 'admin_id' => $mail->admin_id,
                    'type' => 'mail_claim', 'amount' => (int) $mail->coin_amount,
                    'balance_after' => $user->coins,
                    'description' => "Klaim mail: {$mail->subject}",
                ]);
                $result['coins_claimed'] = (int) $mail->coin_amount;
            }

            if ((int) $mail->token_amount > 0) {
                $user->increment('event_tokens', (int) $mail->token_amount);
                $user->refresh();
                TokenTransaction::create([
                    'user_id' => $user->id, 'admin_id' => $mail->admin_id,
                    'type' => 'mail_claim', 'amount' => (int) $mail->token_amount,
                    'balance_after' => $user->event_tokens,
                    'description' => "Klaim token via mail: {$mail->subject}",
                ]);
                $result['tokens_claimed'] = (int) $mail->token_amount;
            }

            if ($mail->player_id) {
                $exists = UserPlayer::where('user_id', $user->id)
                    ->where('player_id', $mail->player_id)->exists();
                UserPlayer::firstOrCreate(
                    ['user_id' => $user->id, 'player_id' => $mail->player_id],
                    ['acquired_via' => 'mail']
                );
                $result['player'] = Player::find($mail->player_id);
                $result['player_duplicate'] = $exists;
            }

            $mail->update(['claimed_at' => now(), 'is_read' => true]);
            $fresh = $user->fresh();
            $result['coins'] = $fresh->coins;
            $result['tokens'] = (int) $fresh->event_tokens;
            $result['mail'] = $mail->fresh()->load(['player', 'admin:id,name']);

            return response()->json($result);
        });
    }

    /** Klaim semua hadiah yang masih bisa diklaim sekaligus. */
    public function claimAll(Request $request)
    {
        $now = now();
        $mails = Mail::where('user_id', $request->user()->id)
            ->whereNull('claimed_at')
            ->where(fn ($q) => $q->where('coin_amount', '>', 0)->orWhere('token_amount', '>', 0)->orWhereNotNull('player_id'))
            ->where(fn ($q) => $q->whereNull('available_from')->orWhere('available_from', '<=', $now))
            ->get()->filter(fn ($m) => ! $m->isExpired());

        if ($mails->isEmpty()) {
            return response()->json(['message' => 'Tidak ada hadiah yang bisa diklaim.', 'claimed' => 0]);
        }

        $totalCoins = 0;
        $totalTokens = 0;
        $players = [];
        $duplicates = 0;

        DB::transaction(function () use ($request, $mails, &$totalCoins, &$totalTokens, &$players, &$duplicates) {
            $user = $request->user()->lockForUpdate()->find($request->user()->id);

            foreach ($mails as $mail) {
                $mail = Mail::whereKey($mail->id)->lockForUpdate()->first();
                if (! $mail->isClaimable()) {
                    continue;
                }
                if ((int) $mail->coin_amount > 0) {
                    $totalCoins += (int) $mail->coin_amount;
                }
                if ((int) $mail->token_amount > 0) {
                    $totalTokens += (int) $mail->token_amount;
                }
                if ($mail->player_id) {
                    $exists = UserPlayer::where('user_id', $user->id)
                        ->where('player_id', $mail->player_id)->exists();
                    UserPlayer::firstOrCreate(
                        ['user_id' => $user->id, 'player_id' => $mail->player_id],
                        ['acquired_via' => 'mail']
                    );
                    if ($exists) {
                        $duplicates++;
                    } else {
                        $players[] = Player::find($mail->player_id);
                    }
                }
                $mail->update(['claimed_at' => now(), 'is_read' => true]);
            }

            if ($totalCoins > 0) {
                $user->increment('coins', $totalCoins);
                $user->refresh();
                CoinTransaction::create([
                    'user_id' => $user->id, 'type' => 'mail_claim',
                    'amount' => $totalCoins, 'balance_after' => $user->coins,
                    'description' => "Klaim semua mail ({$mails->count()} mail)",
                ]);
            }
            if ($totalTokens > 0) {
                $user->increment('event_tokens', $totalTokens);
                $user->refresh();
                TokenTransaction::create([
                    'user_id' => $user->id, 'type' => 'mail_claim',
                    'amount' => $totalTokens, 'balance_after' => $user->event_tokens,
                    'description' => "Klaim semua token via mail ({$mails->count()} mail)",
                ]);
            }
        });

        return response()->json([
            'claimed' => $mails->count(),
            'coins_claimed' => $totalCoins,
            'tokens_claimed' => $totalTokens,
            'players' => array_values(array_filter($players)),
            'player_duplicates' => $duplicates,
            'coins' => $request->user()->fresh()->coins,
            'tokens' => (int) $request->user()->fresh()->event_tokens,
        ]);
    }

    // ============ ADMIN ============

    /** Riwayat semua mail terkirim + status dibaca per penerima. */
    public function adminIndex(Request $request)
    {
        $query = Mail::with(['user:id,name,email', 'player:id,name,position,ovr', 'admin:id,name'])
            ->when($request->search, fn ($q) => $q->where('subject', 'like', "%{$request->search}%"))
            ->when($request->is_read !== null && $request->is_read !== '', fn ($q) => $q->where('is_read', (bool) $request->is_read));

        $page = $query->latest()->paginate(15);
        // Ringkasan dibaca untuk filter yang sedang aktif.
        $base = Mail::when($request->search, fn ($q) => $q->where('subject', 'like', "%{$request->search}%"));

        return response()->json(array_merge($page->toArray(), [
            'summary' => [
                'total' => (clone $base)->count(),
                'read' => (clone $base)->where('is_read', true)->count(),
                'unread' => (clone $base)->where('is_read', false)->count(),
            ],
        ]));
    }

    /**
     * Kirim mail: ke satu user (user_id) atau semua user (send_to = all).
     * Lampiran opsional: coin_amount, token_amount, dan/atau player_id
     * (semuanya boleh nol/kosong untuk mail pengumuman tanpa hadiah).
     * Tenggat: available_from ("berlaku dari") sampai expires_at ("hangus pada").
     */
    public function send(Request $request)
    {
        $data = $request->validate([
            'send_to' => 'required|in:user,all',
            'user_id' => 'required_if:send_to,user|exists:users,id',
            'subject' => 'required|string|max:150',
            'body' => 'nullable|string|max:2000',
            'coin_amount' => 'nullable|integer|min:0|max:1000000',
            'token_amount' => 'nullable|integer|min:0|max:1000000',
            'player_id' => 'nullable|exists:players,id',
            'available_from' => 'nullable|date',
            'expires_at' => 'nullable|date|after:now',
        ]);

        // available_from harus sebelum expires_at bila keduanya diisi.
        if (! empty($data['available_from']) && ! empty($data['expires_at'])
            && Carbon::parse($data['available_from'])->gte(Carbon::parse($data['expires_at']))) {
            return response()->json(['message' => 'Tanggal "berlaku dari" harus sebelum tanggal "hangus pada".'], 422);
        }

        $targets = $data['send_to'] === 'all'
            ? User::where('role', 'user')->pluck('id')
            : collect([$data['user_id']]);

        if ($targets->isEmpty()) {
            return response()->json(['message' => 'Tidak ada user tujuan.'], 422);
        }

        $now = now()->toDateTimeString();
        // Normalisasi ke format MySQL: frontend mengirim ISO-8601 (…T…Z) yang
        // ditolak MySQL pada bulk insert mentah (tanpa casting model).
        $expiresAt = ! empty($data['expires_at'])
            ? Carbon::parse($data['expires_at'])->format('Y-m-d H:i:s')
            : null;
        $availableFrom = ! empty($data['available_from'])
            ? Carbon::parse($data['available_from'])->format('Y-m-d H:i:s')
            : null;
        $rows = $targets->map(fn ($uid) => [
            'user_id' => $uid,
            'admin_id' => $request->user()->id,
            'subject' => $data['subject'],
            'body' => $data['body'] ?? null,
            'coin_amount' => (int) ($data['coin_amount'] ?? 0),
            'token_amount' => (int) ($data['token_amount'] ?? 0),
            'player_id' => $data['player_id'] ?? null,
            'available_from' => $availableFrom,
            'expires_at' => $expiresAt,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();

        // Bulk insert per chunk agar kirim ke semua user tetap ringan.
        foreach (array_chunk($rows, 500) as $chunk) {
            Mail::insert($chunk);
        }

        return response()->json([
            'message' => "Mail terkirim ke {$targets->count()} user.",
            'sent' => $targets->count(),
        ], 201);
    }

    public function destroy(Mail $mail)
    {
        $mail->delete();

        return response()->json(['message' => 'Mail dihapus.']);
    }

    private function authorizeOwner(Request $request, Mail $mail): void
    {
        abort_unless($mail->user_id === $request->user()->id, 403);
    }
}
