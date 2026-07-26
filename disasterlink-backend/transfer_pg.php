<?php

use Illuminate\Support\Facades\DB;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Starting data migration to PostgreSQL (Neon)...\n";

try {
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
        if (!\Illuminate\Support\Facades\Schema::connection('sqlite')->hasTable($table)) {
            echo "Skipping $table (does not exist in sqlite)\n";
            continue;
        }

        echo "Migrating $table...\n";
        
        $records = DB::connection('sqlite')->table($table)->get();
        if ($records->isEmpty()) {
            echo "  0 records\n";
            continue;
        }

        // Convert to array
        $data = json_decode(json_encode($records), true);

        // Delete existing in target to prevent unique constraint failures
        DB::connection('pgsql')->table($table)->delete();
        
        // Insert chunks
        $chunks = array_chunk($data, 100);
        foreach ($chunks as $chunk) {
            DB::connection('pgsql')->table($table)->insert($chunk);
        }

        echo "  Migrated " . count($data) . " records\n";
        
        // Postgres sequence reset!
        // When we insert manually with IDs, the Postgres auto-increment sequence gets out of sync.
        $maxId = DB::connection('pgsql')->table($table)->max('id');
        if ($maxId) {
            $seqName = $table . '_id_seq';
            DB::connection('pgsql')->statement("SELECT setval('$seqName', $maxId)");
            echo "  Reset sequence $seqName to $maxId\n";
        }
    }

    echo "\nMigration to Neon PostgreSQL completed successfully!\n";
} catch (\Exception $e) {
    echo "\nError during migration: " . $e->getMessage() . "\n";
}
