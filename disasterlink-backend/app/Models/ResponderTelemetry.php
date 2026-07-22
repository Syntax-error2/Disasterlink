<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResponderTelemetry extends Model
{
    protected $fillable = ['unit_name', 'lat', 'lng', 'status'];
}
