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
        ]);

        Lgu::create([
            'name' => 'Cabanatuan City Node',
            'subdomain' => 'cabanatuan',
            'subscription_status' => 'active',
        ]);
    }
}
