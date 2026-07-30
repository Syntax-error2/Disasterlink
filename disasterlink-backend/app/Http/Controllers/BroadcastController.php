<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class BroadcastController extends Controller
{
    public function get()
    {
        $broadcast = Cache::get('active_broadcast');
        
        if (is_array($broadcast)) {
            return response()->json([
                'broadcast' => $broadcast['message'] ?? null,
                'broadcast_id' => $broadcast['id'] ?? null
            ]);
        }
        
        return response()->json([
            'broadcast' => $broadcast,
            'broadcast_id' => $broadcast ? md5($broadcast) : null
        ]);
    }

    public function store(Request $request)
    {
        $message = $request->input('message');
        $duration = $request->input('duration', 60);
        
        $broadcast = ['id' => uniqid('alert_'), 'message' => $message];
        Cache::put('active_broadcast', $broadcast, now()->addMinutes($duration));
        
        // ----------------------------------------------------
        // FIREBASE PUSH NOTIFICATIONS
        // ----------------------------------------------------
        /* 
        ======================================================================
        [MANUAL CONFIGURATION REQUIRED FOR FIREBASE PUSH NOTIFICATIONS]
        
        To make Push Notifications work on the APK, you MUST provide the Firebase
        Service Account Credentials to this Laravel backend.

        1. Go to Firebase Console -> Project Settings -> Service Accounts
        2. Click "Generate new private key" and download the JSON file.
        3. Place the JSON file in your backend's `storage/` folder (e.g. `storage/firebase-auth.json`).
        4. Add this line to your `.env` file:
           FIREBASE_CREDENTIALS=storage/firebase-auth.json
        5. Uncomment the try-catch block below to enable push notifications!
        ======================================================================
        */
        
        /* 
        try {
            $tokens = \App\Models\User::whereNotNull('fcm_token')->pluck('fcm_token')->toArray();
            
            if (!empty($tokens)) {
                $messaging = \Kreait\Laravel\Firebase\Facades\Firebase::messaging();
                $notification = \Kreait\Firebase\Messaging\Notification::create('🚨 EMERGENCY ALERT', $message);
                
                $config = \Kreait\Firebase\Messaging\AndroidConfig::fromArray([
                    'priority' => 'high',
                    'notification' => [
                        'channel_id' => 'emergency_alerts',
                        'sound' => 'default',
                        'default_vibrate_timings' => true,
                        'default_light_settings' => true,
                    ],
                ]);

                $cloudMessage = \Kreait\Firebase\Messaging\CloudMessage::new()
                    ->withNotification($notification)
                    ->withAndroidConfig($config);
                
                $messaging->sendMulticast($cloudMessage, $tokens);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Firebase Push Failed: ' . $e->getMessage());
            // return response()->json(['success' => false, 'message' => 'Firebase Push Failed: ' . $e->getMessage()], 500);
        }
        */

        if ($request->input('include_sms')) {
            $phones = \App\Models\User::whereNotNull('phone')->pluck('phone')->toArray();
            if (empty($phones)) {
                $phones = ['+639123456789', '+639987654321']; // Fallback mocks
            }
            \App\Jobs\SendEmergencySmsJob::dispatch($message, $phones);
        }
        
        return response()->json(['success' => true]);
    }
    
    public function clear()
    {
        Cache::forget('active_broadcast');
        return response()->json(['success' => true]);
    }
}
