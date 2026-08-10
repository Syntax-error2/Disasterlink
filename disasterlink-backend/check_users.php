<?php
require __DIR__ . '/public_html/vendor/autoload.php';
$app = require_once __DIR__ . '/public_html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$users = App\Models\User::all();
echo "Total Users: " . $users->count() . "\n";
foreach($users as $user) {
    echo $user->email . " | " . $user->role . "\n";
}
