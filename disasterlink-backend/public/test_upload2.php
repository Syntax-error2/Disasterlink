<?php
$data = 'data:image/jpeg;base64,' . base64_encode(str_repeat("a", 50000));
$ch = curl_init('http://127.0.0.1:8000/api/incidents');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
    'reporting_barangay' => 'Test',
    'incident_type' => 'Fire',
    'severity_level' => 'High',
    'exact_location' => 'GPS Ping',
    'details' => 'Test',
    'status' => 'Pending Review',
    'image_data' => $data
]);
$response = curl_exec($ch);
echo "Response:\n$response\n";
