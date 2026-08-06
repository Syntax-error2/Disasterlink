<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FamilyMember extends Model
{
    protected $fillable = ['user_id', 'name', 'relation', 'status'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
