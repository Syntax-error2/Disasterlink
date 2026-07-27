<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = App\Models\User::first();
echo "Without login, auth()->check(): " . (auth()->check() ? 'true' : 'false') . "\n";
echo "Without login cache key: incidents_lgu_" . (auth()->check() ? auth()->user()->lgu_id : 'guest') . "\n";

Auth::login($user);
echo "With login, auth()->check(): " . (auth()->check() ? 'true' : 'false') . "\n";
echo "With login cache key: incidents_lgu_" . (auth()->check() ? auth()->user()->lgu_id : 'guest') . "\n";
