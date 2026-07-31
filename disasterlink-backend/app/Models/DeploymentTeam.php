<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeploymentTeam extends Model
{
    protected $fillable = [
        'lgu_id',
        'name',
        'category',
        'status'
    ];

    public function lgu()
    {
        return $this->belongsTo(Lgu::class);
    }

    public function responders()
    {
        return $this->hasMany(User::class, 'team_id');
    }

    protected static function booted()
    {
        static::addGlobalScope('lgu', function (\Illuminate\Database\Eloquent\Builder $builder) {
            if (auth()->check() && auth()->user()->role !== 'superadmin') {
                $builder->where(function($q) {
                    $q->where('lgu_id', auth()->user()->lgu_id)
                      ->orWhereNull('lgu_id');
                });
            }
        });
    }
}
