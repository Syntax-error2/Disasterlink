<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Lgu;

class LguSeeder extends Seeder
{
    public function run(): void
    {
        Lgu::create([
            'name' => 'Binalbagan Node',
            'subdomain' => 'binalbagan',
            'subscription_status' => 'active',
            'latitude' => 10.1873,
            'longitude' => 122.8601,
        ]);

        Lgu::create([
            'name' => 'Cabanatuan City Node',
            'subdomain' => 'cabanatuan',
            'subscription_status' => 'active',
            'latitude' => 15.4864,
            'longitude' => 120.9734,
        ]);
    }
}
