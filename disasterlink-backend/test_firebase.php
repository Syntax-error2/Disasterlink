<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $factory = (new \Kreait\Firebase\Factory)->withServiceAccount(base_path('firebase_credentials.json'));
    $messaging = $factory->createMessaging();
    echo 'FIREBASE IS READY! Project ID: ' . $factory->createAuth()->getProjectId();
} catch (\Exception $e) {
    echo 'ERROR: ' . $e->getMessage();
}

