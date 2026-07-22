<?php
// Look for any php_error.log or error_log in the directory or temp dir
$files = [
    'php_error.log',
    'error_log',
    sys_get_temp_dir() . '/php_error.log',
    sys_get_temp_dir() . '/error_log',
];
foreach ($files as $f) {
    if (file_exists($f)) {
        echo "Found: $f\n";
        echo tail($f, 20) . "\n";
    }
}
function tail($filename, $lines = 10) {
    return trim(implode("", array_slice(file($filename), -$lines)));
}
