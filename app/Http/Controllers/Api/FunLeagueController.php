<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FunLeague;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FunLeagueController extends Controller
{
    public function store(Request $request)
    {
        $categoryId = (int) $request->input('fun_category_id');

        $data = $request->validate([
            'fun_category_id' => 'required|integer|exists:fun_categories,id',
            'name' => [
                'required', 'string', 'max:80',
                Rule::unique('fun_leagues', 'name')->where(fn ($q) => $q->where('fun_category_id', $categoryId)),
            ],
            'sort_order' => 'sometimes|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $league = FunLeague::create([
            'fun_category_id' => $categoryId,
            'name' => $data['name'],
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json($this->present($league), 201);
    }

    public function update(Request $request, FunLeague $funLeague)
    {
        $categoryId = (int) ($request->input('fun_category_id') ?? $funLeague->fun_category_id);

        $data = $request->validate([
            'fun_category_id' => 'sometimes|integer|exists:fun_categories,id',
            'name' => [
                'required', 'string', 'max:80',
                Rule::unique('fun_leagues', 'name')
                    ->where(fn ($q) => $q->where('fun_category_id', $categoryId))
                    ->ignore($funLeague->id),
            ],
            'sort_order' => 'sometimes|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $oldCategoryId = $funLeague->fun_category_id;
        $funLeague->update([
            'fun_category_id' => $categoryId,
            'name' => $data['name'],
            'sort_order' => $data['sort_order'] ?? $funLeague->sort_order,
            'is_active' => $data['is_active'] ?? $funLeague->is_active,
        ]);

        if ($oldCategoryId !== $categoryId) {
            $funLeague->teams()->update(['fun_category_id' => $categoryId]);
        }

        return response()->json($this->present($funLeague->fresh()));
    }

    public function destroy(FunLeague $funLeague)
    {
        $name = $funLeague->name;
        $funLeague->teams()->update(['fun_league_id' => null]);
        $funLeague->delete();

        return response()->json(['message' => "Liga \"{$name}\" dihapus. Timnya menjadi tim nasional di benua terkait."]);
    }

    public function toggleActive(FunLeague $funLeague)
    {
        $funLeague->update(['is_active' => ! $funLeague->is_active]);

        return response()->json($this->present($funLeague));
    }

    private function present(FunLeague $league): array
    {
        return [
            'id' => $league->id,
            'fun_category_id' => $league->fun_category_id,
            'name' => $league->name,
            'sort_order' => $league->sort_order,
            'is_active' => (bool) $league->is_active,
            'created_at' => $league->created_at,
            'updated_at' => $league->updated_at,
        ];
    }
}
