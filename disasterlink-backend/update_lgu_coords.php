<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Binalbagan Node
App\Models\Lgu::where('subdomain', 'binalbagan')->update([
    'latitude' => 10.1983,
    'longitude' => 122.8687
]);

// Cabanatuan City Node
App\Models\Lgu::where('subdomain', 'cabanatuan')->update([
    'latitude' => 15.4865,
    'longitude' => 120.9734
]);

echo "LGU coordinates updated successfully.\n";
