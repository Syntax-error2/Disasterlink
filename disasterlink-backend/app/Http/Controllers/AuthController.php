<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // Process New Personnel Registrations
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|string',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'account_status' => 'pending', 
        ]);

        return response()->json([
            'message' => 'Access request submitted successfully. Pending Admin approval.',
            'user' => $user
        ], 201);
    }

    // Process Logins & Issue Security Tokens
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        // Check if user exists and password is correct
        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid credentials. Please try again.'
            ], 401);
        }

        // Check if Admin has approved the account
        if ($user->account_status !== 'active') {
            return response()->json([
                'message' => 'Your account is currently pending approval by the LGU Admin.'
            ], 403);
        }

        // Issue Sanctum API Token
        $token = $user->createToken('disasterlink_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user
        ]);
    }

    // Destroy Token on Logout
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out securely.']);
    }
}