<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class BarangayCaptainSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\User::updateOrCreate(
            ['email' => 'kapitan@binalbagan.gov.ph'],
            [
                'name' => 'Kapitan Dave',
                'password' => \Illuminate\Support\Facades\Hash::make('password123'),
                'role' => 'barangay_captain',
                'assigned_barangay' => 'Progreso',
                'account_status' => 'Active',
                'department' => 'LGU'
            ]
        );
    }
}
