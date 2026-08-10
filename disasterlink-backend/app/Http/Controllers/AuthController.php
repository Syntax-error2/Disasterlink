<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Lgu;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use App\Mail\RegistrationOTP;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // Fetch Dynamic Tenant Configuration
    public function tenantConfig($subdomain)
    {
        $lgu = Lgu::where('subdomain', $subdomain)->first();
        
        if (!$lgu) {
            return response()->json(['message' => 'LGU not found'], 404);
        }

        return response()->json([
            'name' => $lgu->name,
            'subdomain' => $lgu->subdomain,
            'latitude' => $lgu->latitude,
            'longitude' => $lgu->longitude,
            'theme' => 'default' // Future expansion for colors
        ]);
    }

    // Fetch All Active LGUs
    public function getLgus()
    {
        $lgus = Lgu::where('subscription_status', 'active')->select('id', 'name', 'subdomain', 'latitude', 'longitude')->get();
        return response()->json($lgus);
    }
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
            'phone' => 'nullable|string|max:20',
            'otp' => 'required|string|size:6'
        ]);

        // Verify OTP
        $cachedOtp = Cache::get('register_otp_' . $request->email);

        if (!$cachedOtp || $cachedOtp !== $request->otp) {
            return response()->json([
                'message' => 'Invalid or expired OTP. Please try again.'
            ], 400);
        }

        // Default to Binalbagan LGU if not dynamically specified in request
        $subdomain = $request->input('lgu_subdomain', 'binalbagan');
        $lgu = \App\Models\Lgu::where('subdomain', $subdomain)->first() ?? \App\Models\Lgu::first();

        // Clear the OTP
        Cache::forget('register_otp_' . $request->email);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'barangay' => $request->barangay,
            'purok' => $request->purok,
            'account_status' => 'active',
            'lgu_id' => $lgu ? $lgu->id : 1,
            'email_verified_at' => now(),
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

        $user = User::with('lgu')->where('email', $request->email)->first();

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

        // Enforce strict Subdomain / Tenant isolation
        $requestSubdomain = $request->input('subdomain');
        $ignored = ['localhost', '127', 'app', 'capacitor'];
        
        // Superadmins can log in anywhere, but standard users are locked to their LGU (if a valid subdomain is requested)
        if (!empty($requestSubdomain) && !in_array($requestSubdomain, $ignored) && $user->role !== 'superadmin' && $user->lgu && $user->lgu->subdomain !== $requestSubdomain) {
            return response()->json([
                'message' => 'Unauthorized. This account belongs to a different LGU portal. (Requested: ' . $requestSubdomain . ')'
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

    // Sync Firebase Cloud Messaging Token for Push Notifications
    public function updateFcmToken(Request $request)
    {
        $request->validate([
            'token' => 'required|string'
        ]);

        $user = $request->user();
        $user->fcm_token = $request->token;
        $user->save();

        return response()->json(['message' => 'FCM Token synced securely.']);
    }
}