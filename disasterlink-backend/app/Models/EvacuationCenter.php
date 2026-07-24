<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EvacuationCenter extends Model
{
    protected $fillable = [
        'name',
        'location',
        'barangay',
        'lat',
        'lng',
        'capacity',
        'current_occupants',
        'status',
        'food_level',
        'water_level',
        'medicine_level',
        'lgu_id',
    ];

    public function lgu()
    {
        return $this->belongsTo(Lgu::class);
    }

    protected static function booted()
    {
        static::addGlobalScope('lgu', function (\Illuminate\Database\Eloquent\Builder $builder) {
            if (auth()->check() && auth()->user()->role !== 'superadmin') {
                $builder->where('lgu_id', auth()->user()->lgu_id);
            }
        });
    }
}
