<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\EvacuationCenter;

class EvacuationCenterController extends Controller
{
    public function index()
    {
        $centers = \Illuminate\Support\Facades\Cache::remember('evac_centers', 600, function () {
            return EvacuationCenter::orderBy('created_at', 'desc')->get()->toArray();
        });
        return response()->json($centers);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'location' => 'required|string|max:255',
            'barangay' => 'nullable|string|max:255',
            'capacity' => 'required|integer|min:1',
            'current_occupants' => 'integer|min:0',
            'status' => 'string|in:Active,Full,Closed',
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric'
        ]);

        $center = EvacuationCenter::create($validated);
        \Illuminate\Support\Facades\Cache::forget('evac_centers');
        return response()->json($center, 201);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'current_occupants' => 'required|integer|min:0',
            'status' => 'string|in:Active,Full,Closed'
        ]);

        $center = EvacuationCenter::findOrFail($id);
        $center->update($validated);
        \Illuminate\Support\Facades\Cache::forget('evac_centers');

        // AI LOGISTICS ALERT: Check if > 85% full
        $occupancyRate = $center->current_occupants / $center->capacity;
        if ($occupancyRate > 0.85) {
            try {
                $tokens = \App\Models\User::whereNotNull('fcm_token')
                    ->whereIn('role', ['admin', 'logistics', 'dswd'])
                    ->pluck('fcm_token')->toArray();
                
                if (!empty($tokens)) {
                    $factory = (new \Kreait\Firebase\Factory)->withServiceAccount(base_path('firebase_credentials.json'));
                    $messaging = $factory->createMessaging();
                    $notification = \Kreait\Firebase\Messaging\Notification::create(
                        'LOGISTICS ALERT: Evacuation Center Near Capacity', 
                        "{$center->name} is at " . round($occupancyRate * 100) . "% capacity. Dispatch relief goods immediately!"
                    );
                    
                    $config = \Kreait\Firebase\Messaging\AndroidConfig::fromArray([
                        'priority' => 'high',
                        'notification' => [
                            'channel_id' => 'emergency_alerts',
                            'sound' => 'default',
                            'default_vibrate_timings' => true,
                        ],
                    ]);

                    $cloudMessage = \Kreait\Firebase\Messaging\CloudMessage::new()
                        ->withNotification($notification)
                        ->withAndroidConfig($config)
                        ->withData([
                            'title' => 'LOGISTICS ALERT',
                            'body' => "{$center->name} is at " . round($occupancyRate * 100) . "% capacity.",
                            'channel_id' => 'emergency_alerts'
                        ]);
                    
                    $messaging->sendMulticast($cloudMessage, $tokens);
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Logistics Firebase Push Failed: ' . $e->getMessage());
            }
        }

        return response()->json($center, 200);
    }
}
