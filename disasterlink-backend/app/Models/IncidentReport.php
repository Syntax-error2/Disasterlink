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
    ];
}
