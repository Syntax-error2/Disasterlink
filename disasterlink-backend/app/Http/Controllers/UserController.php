<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    /**
     * Get all representatives (responders) for the authenticated barangay captain's barangay.
     */
    public function getRepresentatives(Request $request)
    {
        $user = auth()->user();
        
        if ($user->role !== 'barangay_captain' && $user->role !== 'admin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $barangay = $user->role === 'barangay_captain' ? ($user->assigned_barangay ?? $user->barangay) : $request->query('barangay');

        $query = User::where('role', 'responder');
        
        if ($barangay) {
            $query->where(function($q) use ($barangay) {
                $q->where('barangay', $barangay)
                  ->orWhere('assigned_barangay', $barangay);
            });
        }

        $representatives = $query->get(['id', 'name', 'email', 'phone', 'barangay', 'purok', 'account_status']);

        return response()->json($representatives, 200);
    }

    /**
     * Barangay Captain creates a new representative (responder) account.
     */
    public function createRepresentative(Request $request)
    {
        $user = auth()->user();
        
        if ($user->role !== 'barangay_captain' && $user->role !== 'admin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'purok' => 'required|string',
            'phone' => 'nullable|string|max:20',
        ]);

        $barangay = $user->role === 'barangay_captain' ? $user->barangay : $request->input('barangay');

        $newRep = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'role' => 'responder',
            'barangay' => $barangay,
            'purok' => $request->purok,
            'account_status' => 'active',
            'lgu_id' => $user->lgu_id,
            'email_verified_at' => now(), // Auto-verified since created by Captain
        ]);

        return response()->json([
            'message' => 'Representative account created successfully',
            'representative' => $newRep
        ], 201);
    }

    /**
     * Barangay Captain removes a representative.
     */
    public function deleteRepresentative($id)
    {
        $user = auth()->user();
        
        if ($user->role !== 'barangay_captain' && $user->role !== 'admin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $rep = User::findOrFail($id);

        if ($user->role === 'barangay_captain' && $rep->barangay !== $user->barangay) {
            return response()->json(['error' => 'Unauthorized to delete this user'], 403);
        }

        $rep->delete();

        return response()->json(['message' => 'Representative removed successfully'], 200);
    }
}
