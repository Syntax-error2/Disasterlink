<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('disaster:monitor')->everyFiveMinutes();
Schedule::command('telemetry:sync-pagasa')->everyTenMinutes();  
 