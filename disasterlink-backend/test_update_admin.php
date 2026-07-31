<?php require 'vendor/autoload.php'; $app = require_once 'bootstrap/app.php'; $app->make('Illuminate\Contracts\Console\Kernel')->bootstrap(); 
$admin = App\Models\User::find(1);
$admin->lgu_id = 1;
$admin->save();
echo "Admin lgu_id updated to 1!";
