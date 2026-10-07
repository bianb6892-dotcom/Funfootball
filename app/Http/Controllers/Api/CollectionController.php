<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CollectionController extends Controller
{
    public function index(Request $request)
    {
        $query = $request->user()->userPlayers()->with('player')
            ->whereHas('player', fn ($q) => $q
                ->when($request->position, fn ($w) => $w->where('position', $request->position))
                ->when($request->rank, fn ($w) => $w->where('rank', $request->rank))
                ->when($request->search, fn ($w) => $w->where('name', 'like', "%{$request->search}%")));

        $items = $query->latest()->paginate(24);
        // Flatten agar frontend mudah: card pemain + meta kepemilikan.
        $items->getCollection()->transform(fn ($up) => array_merge(
            $up->player->toArray(),
            ['owned_at' => $up->created_at, 'acquired_via' => $up->acquired_via]
        ));

        return response()->json($items);
    }
}
