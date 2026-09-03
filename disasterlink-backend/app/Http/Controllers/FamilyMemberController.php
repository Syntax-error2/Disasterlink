<?php

namespace App\Http\Controllers;

use App\Models\FamilyMember;
use Illuminate\Http\Request;

class FamilyMemberController extends Controller
{
    public function index()
    {
        try {
            $userId = auth()->id();
            if (!$userId) return response()->json(['error' => 'Unauthorized'], 401);

            $members = FamilyMember::where('user_id', $userId)->get();
            return response()->json($members, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $userId = auth()->id();
            if (!$userId) return response()->json(['error' => 'Unauthorized'], 401);

            $member = FamilyMember::create([
                'user_id'  => $userId,
                'name'     => $request->input('name'),
                'relation' => $request->input('relation', 'Family'),
                'status'   => $request->input('status', 'Waiting...'),
            ]);
            
            return response()->json($member, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function updateStatus(Request $request)
    {
        try {
            $name = $request->input('name');
            $status = $request->input('status');
            $userId = auth()->id();
            if (!$userId) return response()->json(['error' => 'Unauthorized'], 401);
            
            $member = FamilyMember::where('user_id', $userId)->where('name', $name)->first();
            
            if ($member) {
                $member->update(['status' => $status]);
            } else {
                $member = FamilyMember::create([
                    'user_id' => $userId,
                    'name' => $name,
                    'status' => $status,
                    'relation' => 'Self'
                ]);
            }

            // Sync: If the main user is marking themselves as Safe, mark their manually added family members Safe too.
            $authUser = auth()->user();
            if ($authUser && $name === $authUser->name && stripos($status, 'safe') !== false) {
                FamilyMember::where('user_id', $userId)
                            ->where('name', '!=', $name)
                            ->update(['status' => $status]);
                            
                // Dispatch Push Notification to family members (devices logged into this account)
                if (!empty($authUser->fcm_token)) {
                    try {
                        $factory = (new \Kreait\Firebase\Factory)->withServiceAccount(base_path('firebase_credentials.json'));
                        $messaging = $factory->createMessaging();
                        $notification = \Kreait\Firebase\Messaging\Notification::create('Family Safety Alert', "{$name} has marked themselves as SAFE.");
                        
                        $config = \Kreait\Firebase\Messaging\AndroidConfig::fromArray([
                            'priority' => 'high',
                            'notification' => [
                                'channel_id' => 'general_announcements',
                                'sound' => 'default',
                                'default_vibrate_timings' => true,
                            ],
                        ]);

                        $cloudMessage = \Kreait\Firebase\Messaging\CloudMessage::new()
                            ->withNotification($notification)
                            ->withAndroidConfig($config)
                            ->withData([
                                'title' => 'Family Safety Alert',
                                'body' => "{$name} has marked themselves as SAFE.",
                                'channel_id' => 'general_announcements'
                            ]);
                        
                        $messaging->sendMulticast($cloudMessage, [$authUser->fcm_token]);
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::error('Family Status Firebase Push Failed: ' . $e->getMessage());
                    }
                }
            }
            
            return response()->json($member, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
