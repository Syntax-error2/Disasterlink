<?php
$file = 'domains/darkgoldenrod-anteater-579870.hostingersite.com/public_html/app/Http/Controllers/BroadcastController.php';
$content = file_get_contents($file);
$search = '$messaging = \Kreait\Laravel\Firebase\Facades\Firebase::messaging();';
$replace = '$factory = (new \Kreait\Firebase\Factory)->withServiceAccount(base_path(''firebase_credentials.json''));
                $messaging = $factory->createMessaging();';
$newContent = str_replace($search, $replace, $content);
file_put_contents($file, $newContent);
echo 'Patched successfully.';

