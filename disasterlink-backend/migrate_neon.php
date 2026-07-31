<?php

use Illuminate\Support\Facades\DB;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Starting data migration from Neon (PostgreSQL) to Hostinger (MySQL)...\n";

// Inject Neon connection dynamically
config(['database.connections.neon' => [
    'driver' => 'pgsql',
    'host' => 'YOUR_NEON_HOST_HERE',
    'port' => '5432',
    'database' => 'YOUR_NEON_DATABASE_HERE',
    'username' => 'YOUR_NEON_USERNAME_HERE',
    'password' => 'YOUR_NEON_PASSWORD_HERE',
    'charset' => 'utf8',
    'prefix' => '',
    'prefix_indexes' => true,
    'search_path' => 'public',
    'sslmode' => 'require',
]]);

try {
    // List of tables to transfer (in order of dependencies)
    $tablesToMigrate = [
        'lgus',
        'users',
        'incident_reports',
        'evacuation_centers',
        'community_posts',
        'family_members',
        'responder_telemetries',
    ];

    foreach ($tablesToMigrate as $table) {
        echo "Migrating $table...\n";
        
        // Fetch from Neon
        $records = DB::connection('neon')->table($table)->get();
        if ($records->isEmpty()) {
            echo "  0 records\n";
            continue;
        }

        $data = json_decode(json_encode($records), true);

        // Clean data for MySQL
        foreach($data as &$row) {
            foreach($row as $key => $val) {
                // Convert booleans to integers for MySQL
                if (is_bool($val)) {
                    $row[$key] = $val ? 1 : 0;
                }
            }
        }

        // Wipe the target table in Hostinger first to prevent duplicates
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::connection('mysql')->table($table)->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        
        // Insert in chunks
        $chunks = array_chunk($data, 100);
        foreach ($chunks as $chunk) {
            DB::connection('mysql')->table($table)->insert($chunk);
        }

        echo "  Migrated " . count($data) . " records\n";
    }

    echo "\nData migration to Hostinger completed successfully!\n";
} catch (\Exception $e) {
    echo "\nError during migration: " . $e->getMessage() . "\n";
}
