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
            }
            
            return response()->json($member, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
