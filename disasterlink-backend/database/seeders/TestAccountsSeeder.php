<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class TestAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('password');

        User::create([
            'name' => 'John Doe (Responder)',
            'email' => 'responder1@disasterlink.gov.ph',
            'password' => $password,
            'role' => 'responder',
            'department' => 'Rescue Unit',
            'assigned_barangay' => 'Poblacion',
            'contact_number' => '09123456781',
            'account_status' => 'active',
        ]);

        User::create([
            'name' => 'Jane Smith (MDRRMO)',
            'email' => 'mdrrmo@disasterlink.gov.ph',
            'password' => $password,
            'role' => 'mdrrmo_staff',
            'department' => 'MDRRMO',
            'assigned_barangay' => 'Command Center',
            'contact_number' => '09123456782',
            'account_status' => 'active',
        ]);

        User::create([
            'name' => 'Kapitan Garcia',
            'email' => 'kapitan@disasterlink.gov.ph',
            'password' => $password,
            'role' => 'barangay_captain',
            'department' => 'Barangay Council',
            'assigned_barangay' => 'San Jose',
            'contact_number' => '09123456783',
            'account_status' => 'active',
        ]);
        
        User::create([
            'name' => 'Dave Hermoso (Resident)',
            'email' => 'davehermoso01@gmail.com',
            'password' => $password,
            'role' => 'resident',
            'department' => 'Resident',
            'assigned_barangay' => 'Poblacion',
            'contact_number' => '09123456784',
            'account_status' => 'active',
        ]);
    }
}
