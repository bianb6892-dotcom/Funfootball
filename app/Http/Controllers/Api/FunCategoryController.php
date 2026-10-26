<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FunCategory;
use Illuminate\Http\Request;

class FunCategoryController extends Controller
{
    /** Daftar benua beserta liga dan jumlah timnya (admin). */
    public function index()
    {
        $categories = FunCategory::with(['leagues' => fn ($q) => $q->orderBy('sort_order')->orderBy('name')])
            ->withCount(['teams', 'leagues'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json($categories->map(fn ($c) => $this->present($c))->values());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:60|unique:fun_categories,name',
            'icon' => 'sometimes|nullable|string|max:50|regex:/^fa-[a-z0-9-]+$/',
            'sort_order' => 'sometimes|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $category = FunCategory::create([
            'name' => $data['name'],
            'icon' => ! empty($data['icon']) ? $data['icon'] : FunCategory::iconForName($data['name']),
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json($this->present($category->load('leagues')->loadCount(['teams', 'leagues'])), 201);
    }

    public function update(Request $request, FunCategory $funCategory)
    {
        $data = $request->validate([
            'name' => 'required|string|max:60|unique:fun_categories,name,'.$funCategory->id,
            'icon' => 'sometimes|nullable|string|max:50|regex:/^fa-[a-z0-9-]+$/',
            'sort_order' => 'sometimes|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($request->has('icon')) {
            $icon = ! empty($data['icon'])
                ? $data['icon']
                : FunCategory::iconForName($data['name']);
        } else {
            $icon = $data['name'] !== $funCategory->name
                ? FunCategory::iconForName($data['name'])
                : $funCategory->icon;
        }

        $funCategory->update([
            'name' => $data['name'],
            'icon' => $icon,
            'sort_order' => $data['sort_order'] ?? $funCategory->sort_order,
            'is_active' => $data['is_active'] ?? $funCategory->is_active,
        ]);

        return response()->json($this->present($funCategory->load('leagues')->loadCount(['teams', 'leagues'])));
    }

    public function destroy(FunCategory $funCategory)
    {
        $name = $funCategory->name;
        $funCategory->delete();

        return response()->json(['message' => "Kategori \"{$name}\" dihapus. Tim di dalamnya menjadi tanpa kategori."]);
    }

    public function toggleActive(FunCategory $funCategory)
    {
        $funCategory->update(['is_active' => ! $funCategory->is_active]);

        return response()->json($this->present($funCategory->load('leagues')->loadCount(['teams', 'leagues'])));
    }

    private function present(FunCategory $category): array
    {
        return [
            'id' => $category->id,
            'name' => $category->name,
            'icon' => $category->icon,
            'sort_order' => $category->sort_order,
            'is_active' => (bool) $category->is_active,
            'teams_count' => $category->teams_count ?? 0,
            'leagues_count' => $category->leagues_count ?? $category->leagues->count(),
            'leagues' => $category->leagues->map(fn ($l) => [
                'id' => $l->id,
                'fun_category_id' => $l->fun_category_id,
                'name' => $l->name,
                'sort_order' => $l->sort_order,
                'is_active' => (bool) $l->is_active,
            ])->values(),
            'created_at' => $category->created_at,
            'updated_at' => $category->updated_at,
        ];
    }
}
