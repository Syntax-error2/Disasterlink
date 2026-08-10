<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$lguId = 2; // Cabanatuan

$accounts = [
    [
        'name' => 'Cabanatuan Superadmin',
        'email' => 'superadmin@cabanatuan.gov.ph',
        'password' => 'password123',
        'role' => 'superadmin',
        'barangay' => 'City Hall',
        'purok' => 'Zone 1'
    ],
    [
        'name' => 'Cabanatuan Admin',
        'email' => 'admin@cabanatuan.gov.ph',
        'password' => 'password123',
        'role' => 'admin',
        'barangay' => 'City Hall',
        'purok' => 'Zone 1'
    ],
    [
        'name' => 'Cabanatuan Responder',
        'email' => 'responder@cabanatuan.gov.ph',
        'password' => 'password123',
        'role' => 'responder',
        'barangay' => 'Sangitan',
        'purok' => 'Zone 3'
    ],
    [
        'name' => 'Cabanatuan Citizen',
        'email' => 'citizen@cabanatuan.gov.ph',
        'password' => 'password123',
        'role' => 'resident',
        'barangay' => 'Sangitan',
        'purok' => 'Zone 3'
    ]
];

foreach ($accounts as $acc) {
    $existing = User::where('email', $acc['email'])->first();
    if (!$existing) {
        User::create([
            'name' => $acc['name'],
            'email' => $acc['email'],
            'password' => Hash::make($acc['password']),
            'role' => $acc['role'],
            'barangay' => $acc['barangay'],
            'purok' => $acc['purok'],
            'account_status' => 'active',
            'lgu_id' => $lguId,
            'email_verified_at' => now(),
        ]);
        echo "Created " . $acc['email'] . "\n";
    } else {
        echo "Account " . $acc['email'] . " already exists\n";
    }
}
echo "Done.\n";
