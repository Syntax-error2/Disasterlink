<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class BroadcastController extends Controller
{
    public function get()
    {
        return response()->json([
            'broadcast' => Cache::get('active_broadcast')
        ]);
    }

    public function store(Request $request)
    {
        $message = $request->input('message');
        $duration = $request->input('duration', 60);
        
        Cache::put('active_broadcast', $message, now()->addMinutes($duration));
        
        // ----------------------------------------------------
        // FIREBASE PUSH NOTIFICATIONS
        // ----------------------------------------------------
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
        }

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
