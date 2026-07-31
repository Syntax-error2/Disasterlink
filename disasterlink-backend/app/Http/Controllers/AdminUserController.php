<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminUserController extends Controller
{
    public function index()
    {
        $lguId = auth()->user()->lgu_id;
        $users = User::where('lgu_id', $lguId)
            ->whereIn('role', ['admin', 'mdrrmo_staff', 'responder', 'barangay_captain'])
            ->with('team')
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($users);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => 'nullable|string|max:20',
            'role' => 'required|string|in:mdrrmo_staff,responder,barangay_captain,admin',
            'assigned_barangay' => 'nullable|string|max:255',
            'team_id' => 'nullable|exists:deployment_teams,id'
        ]);

        $generatedPassword = Str::random(8);

        $user = User::create([
            'lgu_id' => auth()->user()->lgu_id,
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'role' => $request->role,
            'assigned_barangay' => $request->assigned_barangay,
            'team_id' => $request->team_id,
            'password' => Hash::make($generatedPassword),
            'account_status' => 'Active',
        ]);

        $user->load('team');

        return response()->json([
            'user' => $user,
            'generated_password' => $generatedPassword
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::where('lgu_id', auth()->user()->lgu_id)->findOrFail($id);
        
        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'role' => 'required|string|in:mdrrmo_staff,responder,barangay_captain,admin',
            'assigned_barangay' => 'nullable|string|max:255',
            'team_id' => 'nullable|exists:deployment_teams,id',
            'account_status' => 'required|string|in:Active,Suspended',
        ]);

        $user->update($request->only(['name', 'phone', 'role', 'assigned_barangay', 'team_id', 'account_status']));
        
        $user->load('team');

        return response()->json($user);
    }
}
