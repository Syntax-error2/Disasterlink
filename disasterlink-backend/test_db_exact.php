<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $inc = App\Models\IncidentReport::create([
        'lgu_id'             => null,
        'reporting_barangay' => 'Santo Rosario',
        'incident_type'      => 'SOS Emergency',
        'severity_level'     => 'Critical',
        'exact_location'     => 'GPS Ping',
        'latitude'           => '10.1866',
        'longitude'          => '122.8587',
        'details'            => 'URGENT SOS SIGNAL from Citizen. Immediate dispatch required!',
        'status'             => 'Active',
    ]);
    echo "SUCCESS: " . $inc->id;
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
