<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Broadcast extends Model
{
    protected $fillable = [
        'lgu_id',
        'title',
        'message',
        'target_area',
        'status',
    ];
}
