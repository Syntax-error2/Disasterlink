<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IncidentReport extends Model
{
    protected $fillable = [
        'user_id',
        'reporting_barangay',
        'incident_type',
        'severity_level',
        'exact_location',
        'latitude',
        'longitude',
        'details',
        'image_data',
        'image_path',
        'status',
        'verifications',
        'lgu_id',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function lgu()
    {
        return $this->belongsTo(Lgu::class);
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
