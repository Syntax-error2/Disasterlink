<?php
ob_start();

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());

$output = ob_get_clean();
$start = strpos($output, '{');
if ($start === false) $start = strpos($output, '[');

if ($start !== false && $start > 0) {
    // Found rogue output before JSON
    $rogue = substr($output, 0, $start);
    file_put_contents(__DIR__.'/../storage/logs/rogue.log', "ROGUE OUTPUT:\n" . $rogue . "\n\n", FILE_APPEND);
    echo substr($output, $start); // Echo only the JSON
} else {
    echo $output;
}
