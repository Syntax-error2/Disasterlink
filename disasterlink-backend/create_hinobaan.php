<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$lgu = App\Models\Lgu::firstOrCreate(['subdomain' => 'hinobaan'], [
    'name' => 'Hinobaan',
    'latitude' => 9.5532,
    'longitude' => 122.4839,
    'subscription_status' => 'active',
    'next_payment_date' => now()->addMonth()->toDateString()
]);

$admin = App\Models\User::firstOrCreate(['email' => 'admin@hinobaan.gov.ph'], [
    'name' => 'Hinobaan MDRRMO',
    'password' => bcrypt('password123'),
    'role' => 'admin',
    'lgu_id' => $lgu->id,
    'phone' => '09170000001'
]);

$responder = App\Models\User::firstOrCreate(['email' => 'responder@hinobaan.gov.ph'], [
    'name' => 'Hinobaan Rescue Unit',
    'password' => bcrypt('password123'),
    'role' => 'responder',
    'lgu_id' => $lgu->id,
    'phone' => '09170000002'
]);

echo "Created LGU: {$lgu->name}\nAdmin: {$admin->email} / password123\nResponder: {$responder->email} / password123\n";
