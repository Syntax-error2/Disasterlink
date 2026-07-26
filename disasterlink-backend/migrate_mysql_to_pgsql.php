<?php

use Illuminate\Support\Facades\DB;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Starting data migration from Hostinger MySQL to Neon PostgreSQL...\n";

config([
    'database.connections.hostinger' => [
        'driver' => 'mysql',
        'host' => '153.92.15.1',
        'port' => '3306',
        'database' => 'u566394116_disasterlink',
        'username' => 'u566394116_disasteradmin',
        'password' => 'Deblamas@01',
        'charset' => 'utf8mb4',
        'collation' => 'utf8mb4_unicode_ci',
        'prefix' => '',
        'strict' => true,
        'engine' => null,
    ]
]);

try {
    DB::connection('pgsql')->statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;');
    DB::connection('pgsql')->statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;');
    
    // We will pull from the 'hostinger' connection
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
        if (!\Illuminate\Support\Facades\Schema::connection('hostinger')->hasTable($table)) {
            echo "Skipping $table (does not exist in MySQL)\n";
            continue;
        }

        echo "Migrating $table...\n";
        
        $records = DB::connection('hostinger')->table($table)->get();
        if ($records->isEmpty()) {
            echo "  0 records\n";
            continue;
        }

        // Convert to array
        $data = json_decode(json_encode($records), true);

        // Delete existing in target to prevent unique constraint failures, except for admin maybe?
        // We seeded an admin with ID=1. If we delete, it gets replaced by the original MySQL data.
        DB::connection('pgsql')->table($table)->delete();
        
        // Insert chunks
        $chunks = array_chunk($data, 100);
        foreach ($chunks as $chunk) {
            DB::connection('pgsql')->table($table)->insert($chunk);
        }

        echo "  Migrated " . count($data) . " records\n";
        
        // Postgres sequence reset
        $maxId = DB::connection('pgsql')->table($table)->max('id');
        if ($maxId) {
            $seqName = clone DB::connection('pgsql')->table($table)->getGrammar();
            DB::connection('pgsql')->statement("SELECT setval('{$table}_id_seq', $maxId)");
            echo "  Reset sequence {$table}_id_seq to $maxId\n";
        }
    }

    echo "\nMigration to Neon PostgreSQL completed successfully!\n";
} catch (\Exception $e) {
    echo "\nError during migration: " . $e->getMessage() . "\n";
}
