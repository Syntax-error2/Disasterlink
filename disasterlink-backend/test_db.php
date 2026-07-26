<?php
$host = '153.92.15.1';
$db   = 'u566394116_disasterlink';
$user = 'u566394116_disasteradmin';
$pass = 'Deblamas@01';

try {
    echo "Connecting to MySQL...\n";
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_TIMEOUT => 5,
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    echo "Connection OK!\n";
} catch (\Exception $e) {
    echo "Connection Failed: " . $e->getMessage() . "\n";
}
