<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyTokenClaim extends Model
{
    protected $fillable = ['user_id', 'last_claimed_date', 'streak'];

    protected function casts(): array
    {
        return [
            'last_claimed_date' => 'date',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
