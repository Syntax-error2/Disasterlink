<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IncidentReport extends Model
{
    protected $fillable = [
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
