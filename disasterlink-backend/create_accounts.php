<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

App\Models\User::whereIn('email', ['kap.villasta@gmail.com', 'rep.villasta@gmail.com'])->delete();

$kap = App\Models\User::create([
    'name' => 'Kapitan Villa Sta. Maria',
    'email' => 'kap.villasta@gmail.com',
    'phone' => '09123456789',
    'password' => Illuminate\Support\Facades\Hash::make('password123'),
    'role' => 'barangay_captain',
    'assigned_barangay' => 'Villa Sta.Maria Phase 2 Brgy Sto.Rosario',
]);

App\Models\User::create([
    'name' => 'Rep Villa Sta. Maria',
    'email' => 'rep.villasta@gmail.com',
    'phone' => '09987654321',
    'password' => Illuminate\Support\Facades\Hash::make('password123'),
    'role' => 'responder',
    'assigned_barangay' => 'Villa Sta.Maria Phase 2 Brgy Sto.Rosario',
    'barangay_captain_id' => $kap->id
]);

echo "Accounts created successfully!\n";
