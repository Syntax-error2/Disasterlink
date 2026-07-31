<?php require 'vendor/autoload.php'; $app = require_once 'bootstrap/app.php'; $app->make('Illuminate\Contracts\Console\Kernel')->bootstrap(); 
auth()->loginUsingId(1); // Log in as Admin
DB::enableQueryLog();
$incidents = App\Models\IncidentReport::with('user:id,name,phone,email')
    ->select(['id', 'user_id', 'reporting_barangay', 'incident_type', 'severity_level', 'exact_location', 'latitude', 'longitude', 'status', 'created_at', 'verifications', 'image_path'])
    ->orderBy('created_at', 'desc')
    ->get();
echo json_encode(DB::getQueryLog());
