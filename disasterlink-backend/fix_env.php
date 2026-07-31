<?php
$envPath = __DIR__ . '/.env';
$content = file_get_contents($envPath);
$content = str_replace('}"FIREBASE_CREDENTIALS', "}\nFIREBASE_CREDENTIALS", $content);
file_put_contents($envPath, $content);
echo "Fixed .env";
