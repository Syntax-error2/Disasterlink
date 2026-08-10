<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

try {
    // Check if column exists
    $columns = DB::select("SHOW COLUMNS FROM users LIKE 'fcm_token'");
    if (empty($columns)) {
        DB::statement("ALTER TABLE users ADD COLUMN fcm_token VARCHAR(255) NULL AFTER remember_token");
        echo "Successfully added fcm_token column to users table.\n";
    } else {
        echo "fcm_token column already exists.\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
