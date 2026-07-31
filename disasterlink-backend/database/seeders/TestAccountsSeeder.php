<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TestAccountsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Delete existing if they exist
        \App\Models\User::whereIn('email', ['kap.villasta@gmail.com', 'rep.villasta@gmail.com'])->delete();

        // 1. Create Barangay Captain
        $kap = \App\Models\User::create([
            'name' => 'Kapitan Villa Sta. Maria',
            'email' => 'kap.villasta@gmail.com',
            'phone' => '09123456789',
            'password' => \Illuminate\Support\Facades\Hash::make('password123'),
            'role' => 'barangay_captain',
            'assigned_barangay' => 'Villa Sta.Maria Phase 2 Brgy Sto.Rosario',
        ]);

        // 2. Create Barangay Representative
        \App\Models\User::create([
            'name' => 'Rep Villa Sta. Maria',
            'email' => 'rep.villasta@gmail.com',
            'phone' => '09987654321',
            'password' => \Illuminate\Support\Facades\Hash::make('password123'),
            'role' => 'responder', // Representatives are technically responders with assigned_barangay
            'assigned_barangay' => 'Villa Sta.Maria Phase 2 Brgy Sto.Rosario',
            'barangay_captain_id' => $kap->id
        ]);
    }
}
