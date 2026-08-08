<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::where('email', 'admin@disasterlink.gov.ph')->first();
if ($user) {
    echo "TOKEN=" . $user->createToken('test_apk')->plainTextToken . "\n";
} else {
    echo "User not found.\n";
}
