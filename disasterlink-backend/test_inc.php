<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$incident = App\Models\IncidentReport::with('user:id,name,phone')->select(['id', 'user_id', 'reporting_barangay', 'incident_type', 'severity_level', 'exact_location', 'latitude', 'longitude', 'status', 'created_at', 'verifications', 'image_path'])->find(19);
echo json_encode($incident->toArray(), JSON_PRETTY_PRINT);
