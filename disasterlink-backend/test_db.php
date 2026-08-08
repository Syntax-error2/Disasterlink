<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $inc = App\Models\IncidentReport::create([
        'reporting_barangay' => 'Test',
        'incident_type' => 'Test',
        'severity_level' => 'High',
        'latitude' => '10.1',
        'longitude' => '120.1'
    ]);
    echo "SUCCESS: " . $inc->id;
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
