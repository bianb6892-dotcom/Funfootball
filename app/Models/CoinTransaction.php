<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CoinTransaction extends Model
{
    protected $fillable = ['user_id', 'admin_id', 'type', 'amount', 'balance_after', 'description'];
}
