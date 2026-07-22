<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EvacuationCenter extends Model
{
    protected $fillable = [
        'name',
        'location',
        'lat',
        'lng',
        'capacity',
        'current_occupants',
        'status',
        'food_level',
        'water_level',
        'medicine_level',
    ];
}
