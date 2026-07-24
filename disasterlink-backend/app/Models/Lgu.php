<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lgu extends Model
{
    protected $fillable = [
        'name',
        'subdomain',
        'latitude',
        'longitude',
        'subscription_status',
        'next_payment_date',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function incidentReports()
    {
        return $this->hasMany(IncidentReport::class);
    }

    public function evacuationCenters()
    {
        return $this->hasMany(EvacuationCenter::class);
    }
}
