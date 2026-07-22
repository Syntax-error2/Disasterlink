<?php
$data = str_repeat("a", 100000); // 100KB

// 1. Send SOS
$ch = curl_init('http://127.0.0.1:8000/api/incidents');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
    'reporting_barangay' => 'TestMerge',
    'incident_type' => 'SOS Emergency',
    'severity_level' => 'Critical',
    'exact_location' => 'Test',
    'details' => 'SOS details',
    'image_data' => $data,
]);
$res = curl_exec($ch);
echo "SOS Response: $res\n";

// 2. Send regular report
$ch2 = curl_init('http://127.0.0.1:8000/api/incidents');
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_POSTFIELDS, [
    'reporting_barangay' => 'TestMerge',
    'incident_type' => 'Fire',
    'severity_level' => 'High',
    'exact_location' => 'Test',
    'details' => 'Regular details',
    'image_data' => $data,
]);
$res2 = curl_exec($ch2);
echo "Merge Response: $res2\n";
