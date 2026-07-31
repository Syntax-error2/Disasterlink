<?php require 'vendor/autoload.php'; $app = require_once 'bootstrap/app.php'; $app->make('Illuminate\Contracts\Console\Kernel')->bootstrap(); 
echo json_encode(App\Models\User::all(['id', 'role', 'lgu_id', 'email'])->toArray());
