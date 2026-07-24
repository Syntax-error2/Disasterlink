<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Lgu;
use App\Models\User;

class SuperAdminController extends Controller
{
    public function getLgus()
    {
        // Only superadmins should reach here via middleware, but let's double check
        if (auth()->user()->role !== 'superadmin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $lgus = Lgu::withCount('users', 'incidentReports')->get();
        
        return response()->json($lgus);
    }

    public function createLgu(Request $request)
    {
        if (auth()->user()->role !== 'superadmin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name' => 'required|string|unique:lgus',
            'subdomain' => 'required|string|unique:lgus',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        $lgu = Lgu::create([
            'name' => $request->name,
            'subdomain' => $request->subdomain,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'subscription_status' => 'active',
            'next_payment_date' => now()->addMonth()->toDateString(),
        ]);

        return response()->json($lgu, 201);
    }
}
