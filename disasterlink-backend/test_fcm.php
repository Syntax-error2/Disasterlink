<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;
use Kreait\Firebase\Messaging\AndroidConfig;

try {
    $user = User::whereNotNull('fcm_token')->first();
    if (!$user) {
        die("No users have an FCM token.\n");
    }

    echo "Sending test push to user: " . $user->email . "\n";

    $factory = (new Factory)->withServiceAccount(base_path('firebase_credentials.json'));
    $messaging = $factory->createMessaging();
    
    $notification = Notification::create('TEST ALERT', 'This is a test push notification from SSH.');
    
    $config = AndroidConfig::fromArray([
        'priority' => 'high',
        'notification' => [
            'channel_id' => 'emergency_alerts',
            'sound' => 'default',
        ],
    ]);

    $cloudMessage = CloudMessage::new()
        ->withNotification($notification)
        ->withAndroidConfig($config);
    
    $result = $messaging->sendMulticast($cloudMessage, [$user->fcm_token]);
    echo "FCM Sent successfully! Successes: " . $result->successes()->count() . "\n";
    echo "Failures: " . $result->failures()->count() . "\n";
    if ($result->failures()->count() > 0) {
        print_r($result->failures()->getItems());
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
