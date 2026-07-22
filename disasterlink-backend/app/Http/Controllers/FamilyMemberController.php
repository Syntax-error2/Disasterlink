<?php

namespace App\Http\Controllers;

use App\Models\FamilyMember;
use Illuminate\Http\Request;

class FamilyMemberController extends Controller
{
    public function index()
    {
        try {
            $members = FamilyMember::all();
            return response()->json($members, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $member = FamilyMember::create([
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
            
            $member = FamilyMember::where('name', $name)->first();
            if ($member) {
                $member->update(['status' => $status]);
            } else {
                $member = FamilyMember::create([
                    'name' => $name,
                    'status' => $status,
                    'relation' => 'Self'
                ]);
            }
            return response()->json($member, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
