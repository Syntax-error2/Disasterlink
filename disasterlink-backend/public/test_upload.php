<?php
$file = tempnam(sys_get_temp_dir(), 'test');
file_put_contents($file, str_repeat("a", 1000)); // 1KB test file
rename($file, $file . '.jpg');
$file .= '.jpg';

$ch = curl_init('http://127.0.0.1:8000/api/incidents');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$cfile = new CURLFile($file, 'image/jpeg', 'photo.jpg');

curl_setopt($ch, CURLOPT_POSTFIELDS, [
    'reporting_barangay' => 'TestUpload',
    'incident_type' => 'Fire',
    'severity_level' => 'Critical',
    'exact_location' => 'Test',
    'details' => 'Test',
    'image' => $cfile,
]);
$res = curl_exec($ch);
echo "Response: $res\n";
