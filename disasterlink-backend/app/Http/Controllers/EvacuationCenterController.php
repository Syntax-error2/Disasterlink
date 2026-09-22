<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\EvacuationCenter;
use App\Jobs\SendPushNotificationJob;

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
            $tokens = \App\Models\User::whereNotNull('fcm_token')
                ->whereIn('role', ['admin', 'logistics', 'dswd'])
                ->pluck('fcm_token')->toArray();
            
            if (!empty($tokens)) {
                $title = 'LOGISTICS ALERT: Evacuation Center Near Capacity';
                $body = "{$center->name} is at " . round($occupancyRate * 100) . "% capacity. Dispatch relief goods immediately!";
                dispatch(new SendPushNotificationJob($tokens, $title, $body));
            }
        }

        return response()->json($center, 200);
    }
}
