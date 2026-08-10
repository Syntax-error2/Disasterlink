<?php
require __DIR__ . '/public_html/vendor/autoload.php';
$app = require_once __DIR__ . '/public_html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
App\Models\User::query()->update(['lgu_id' => 1]);
echo "Users updated to LGU 1\n";
