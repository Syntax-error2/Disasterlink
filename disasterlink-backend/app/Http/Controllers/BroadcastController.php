<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class BroadcastController extends Controller
{
    public function get()
    {
        // First check cache for immediate broadcasts
        $cached = Cache::get('active_broadcast');
        if (is_array($cached) && isset($cached['message'])) {
            return response()->json([
                'broadcast' => $cached['message'],
                'broadcast_id' => $cached['id'] ?? md5($cached['message'])
            ]);
        }
        
        // Fallback to database
        $latest = \App\Models\Broadcast::orderBy('created_at', 'desc')->first();
        
        if ($latest && $latest->created_at->diffInMinutes(now()) < 60) {
            return response()->json([
                'broadcast' => $latest->message,
                'broadcast_id' => $latest->id
            ]);
        }

        return response()->json([
            'broadcast' => null,
            'broadcast_id' => null
        ]);
    }

    public function store(Request $request)
    {
        $message = $request->input('message');
        $targetArea = $request->input('target_area', 'All Barangays (Municipality Wide)');
        $title = explode(' - ', $message)[0] ?? 'EMERGENCY ALERT';
        
        $broadcast = \App\Models\Broadcast::create([
            'lgu_id' => auth()->check() ? auth()->user()->lgu_id : null,
            'title' => $title,
            'message' => $message,
            'target_area' => $targetArea,
            'status' => 'DELIVERED',
        ]);
        
        Cache::put('active_broadcast', ['id' => $broadcast->id, 'message' => $message], now()->addMinutes(60));
        
        // 1. FIRE REAL-TIME PUSHER EVENT (Instant overlay for active users)
        event(new \App\Events\EmergencyBroadcastEvent($broadcast));
        
        // 2. FIREBASE PUSH NOTIFICATIONS
        try {
            $tokens = \App\Models\User::whereNotNull('fcm_token')->pluck('fcm_token')->toArray();
            
            if (!empty($tokens)) {
                $factory = (new \Kreait\Firebase\Factory)->withServiceAccount(base_path('firebase_credentials.json'));
                $messaging = $factory->createMessaging();
                $notification = \Kreait\Firebase\Messaging\Notification::create('🚨 ' . $title, $message);
                
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
            // WE NO LONGER RETURN 500 ERROR HERE. We catch and continue to SMS!
            $broadcast->update(['status' => 'FCM FAILED - SMS SENT']);
        }

        // 3. SMS FALLBACK
        if ($request->input('include_sms', true)) {
            $phones = \App\Models\User::whereNotNull('phone')->pluck('phone')->toArray();
            if (empty($phones)) {
                $phones = ['+639123456789', '+639987654321']; // Fallback mocks
            }
            \App\Jobs\SendEmergencySmsJob::dispatch($message, $phones);
        }
        
        return response()->json(['success' => true, 'broadcast' => $broadcast]);
    }
    
    public function localStore(Request $request)
    {
        $message = $request->input('message');
        $barangay = auth()->user()->assigned_barangay ?? 'Unknown';
        $title = "BARANGAY $barangay ALERT";
        
        $broadcast = \App\Models\Broadcast::create([
            'lgu_id' => auth()->check() ? auth()->user()->lgu_id : null,
            'title' => $title,
            'message' => $message,
            'target_area' => $barangay,
            'status' => 'DELIVERED',
        ]);
        
        // Broadcast Event
        event(new \App\Events\EmergencyBroadcastEvent($broadcast));
        
        return response()->json(['message' => 'Local broadcast dispatch completed.']);
    }

    public function clear()
    {
        Cache::forget('active_broadcast');
        return response()->json(['success' => true]);
    }
}

