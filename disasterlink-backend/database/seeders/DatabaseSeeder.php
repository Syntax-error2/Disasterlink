<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::create([
            'name' => 'Command Center Admin',
            'email' => 'admin@disasterlink.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'department' => 'MDRRMO',
            'assigned_barangay' => 'Command Center',
            'contact_number' => '09123456789',
            'account_status' => 'active',
        ]);
    }
}
