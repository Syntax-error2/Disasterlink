<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\User;

class DashboardController extends Controller
{
    public function stats()
    {
        $totalUsers = User::count();
        $totalBarangays = User::whereNotNull('barangay')
            ->orWhereNotNull('assigned_barangay')
            ->distinct()
            ->count('barangay');
            
        // Because of the schema, we might need a custom distinct query to grab both columns safely, or just count distinct barangay
        // Let's do a simpler approach: get all users and extract unique barangays in PHP for safety since it's a small app
        $users = User::all();
        $barangayCounts = [];
        
        foreach($users as $user) {
            $brgy = $user->barangay ?: $user->assigned_barangay;
            if ($brgy) {
                if (!isset($barangayCounts[$brgy])) {
                    $barangayCounts[$brgy] = 0;
                }
                $barangayCounts[$brgy]++;
            }
        }

        $demographics = [];
        foreach($barangayCounts as $brgy => $count) {
            $demographics[] = [
                'barangay' => $brgy,
                'users' => $count
            ];
        }

        return response()->json([
            'total_users' => $totalUsers,
            'active_barangays' => count($barangayCounts),
            'demographics' => $demographics
        ]);
    }
}
