<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TenantMigrationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Create Binalbagan LGU
        $binalbagan = \App\Models\Lgu::updateOrCreate(
            ['subdomain' => 'binalbagan'],
            [
                'name' => 'Binalbagan Municipality',
                'subscription_status' => 'active',
                'latitude' => 10.1866,
                'longitude' => 122.8587
            ]
        );

        // 2. Assign existing un-tenanted data to Binalbagan
        \App\Models\User::whereNull('lgu_id')->update(['lgu_id' => $binalbagan->id]);
        \Illuminate\Support\Facades\DB::table('incident_reports')->whereNull('lgu_id')->update(['lgu_id' => $binalbagan->id]);
        \App\Models\EvacuationCenter::whereNull('lgu_id')->update(['lgu_id' => $binalbagan->id]);

        // 3. Create Superadmin User
        \App\Models\User::updateOrCreate(
            ['email' => 'admin@disasterlink.com'],
            [
                'name' => 'DisasterLink SuperAdmin',
                'password' => \Illuminate\Support\Facades\Hash::make('password123'),
                'role' => 'superadmin',
                'account_status' => 'active',
                'lgu_id' => null // Superadmins do not belong to a specific LGU
            ]
        );
    }
}
