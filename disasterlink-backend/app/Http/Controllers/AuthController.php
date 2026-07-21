<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use App\Mail\RegistrationOTP;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // Generate and Email OTP
    public function sendOtp(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|string',
        ]);

        // Generate a cryptographically secure 6-digit OTP
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Store OTP in cache for 10 minutes, keyed by email
        Cache::put('register_otp_' . $request->email, $otp, now()->addMinutes(10));

        // Dispatch email
        Mail::to($request->email)->send(new RegistrationOTP($otp, $request->name));

        return response()->json([
            'message' => 'OTP sent successfully to ' . $request->email,
        ], 200);
    }

    // Process New Personnel Registrations
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|string',
            'barangay' => 'required|string',
            'purok' => 'required|string',
            'otp' => 'required|string|size:6'
        ]);

        // Verify OTP
        $cachedOtp = Cache::get('register_otp_' . $request->email);

        if (!$cachedOtp || $cachedOtp !== $request->otp) {
            return response()->json([
                'message' => 'Invalid or expired OTP. Please try again.'
            ], 400);
        }

        // Clear the OTP
        Cache::forget('register_otp_' . $request->email);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'barangay' => $request->barangay,
            'purok' => $request->purok,
            'account_status' => 'active', 
        ]);

        return response()->json([
            'message' => 'Account created successfully. You now have access.',
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
        if (strtolower($user->account_status) !== 'active') {
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