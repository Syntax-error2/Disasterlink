<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = App\Models\User::first();
Auth::login($user);
$req = Illuminate\Http\Request::create('/api/incidents/1/verify', 'POST');
$res = app()->handle($req);

echo "Status Code: " . $res->getStatusCode() . "\n";
echo "Content: " . $res->getContent() . "\n";
