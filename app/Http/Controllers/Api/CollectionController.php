<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GameService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CollectionController extends Controller
{
    public function index(Request $request)
    {
        $query = $request->user()->userPlayers()->with('player')
            ->whereHas('player', fn ($q) => $q
                ->when($request->position, function ($w) use ($request) {
                    $pos = strtoupper(trim($request->position));
                    if (isset(GameService::GROUP_MEMBERS[$pos])) {
                        $members = GameService::GROUP_MEMBERS[$pos];
                        $w->where(function ($ww) use ($members) {
                            $ww->whereIn('position', $members);
                            if (DB::getDriverName() === 'mysql') {
                                foreach ($members as $m) {
                                    $ww->orWhereJsonContains('alt_positions', $m);
                                }
                            }
                        });
                    } else {
                        $w->where(function ($ww) use ($request, $pos) {
                            $ww->where('position', $request->position);
                            if (DB::getDriverName() === 'mysql') {
                                $ww->orWhereJsonContains('alt_positions', $pos);
                            }
                        });
                    }
                })
                ->when($request->category, function ($w) use ($request) {
                    $cat = strtolower(trim($request->category));
                    if ($cat === 'basic') {
                        $w->where('is_potw', false)->where('is_flashback', false)->where('is_halloween', false)->where('is_ucl', false)->where('is_uel', false)->where('is_uecl', false)->where('rank', '!=', 'legend');
                    } elseif ($cat === 'legend') {
                        $w->where('is_potw', false)->where('is_flashback', false)->where('is_halloween', false)->where('is_ucl', false)->where('is_uel', false)->where('is_uecl', false)->where('rank', 'legend');
                    } elseif ($cat === 'potw') {
                        $w->where('is_potw', true);
                    } elseif ($cat === 'flashback') {
                        $w->where('is_flashback', true);
                    } elseif ($cat === 'halloween') {
                        $w->where('is_halloween', true);
                    } elseif ($cat === 'ucl') {
                        $w->where('is_ucl', true);
                    } elseif ($cat === 'uel') {
                        $w->where('is_uel', true);
                    } elseif ($cat === 'uecl') {
                        $w->where('is_uecl', true);
                    } elseif ($cat === 'uefa') {
                        $w->where(fn ($ww) => $ww->where('is_ucl', true)->orWhere('is_uel', true)->orWhere('is_uecl', true));
                    }
                })
                ->when($request->rank, fn ($w) => $w->where('rank', $request->rank))
                ->when($request->search, fn ($w) => $w->where('name', 'like', "%{$request->search}%")));

        $perPage = min(500, max(1, (int) $request->get('per_page', 24)));
        $items = $query->latest()->paginate($perPage);
        // Flatten agar frontend mudah: card pemain + meta kepemilikan.
        $items->getCollection()->transform(fn ($up) => array_merge(
            $up->player->toArray(),
            ['owned_at' => $up->created_at, 'acquired_via' => $up->acquired_via]
        ));

        return response()->json($items);
    }
}
