<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventRule extends Model
{
    public const KINDS = ['country', 'rank'];

    public const OPERATORS = ['eq', 'lte', 'gte'];

    protected $fillable = ['event_id', 'kind', 'code', 'operator', 'count'];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function describe(): string
    {
        $target = $this->kind === 'rank'
            ? ucfirst((string) $this->code)
            : strtoupper((string) $this->code);
        $label = match ($this->operator) {
            'lte' => "maksimal {$this->count}",
            'gte' => "minimal {$this->count}",
            default => "tepat {$this->count}",
        };

        return ($this->kind === 'rank' ? 'Pemain rank ' : 'Pemain ').$target." {$label}";
    }
}
