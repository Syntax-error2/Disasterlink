<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\User;

class DashboardController extends Controller
{
    public function stats()
    {
        $authUser = auth()->user();
        $query = User::query();
        
        if ($authUser && $authUser->role !== 'superadmin' && $authUser->lgu_id) {
            $query->where('lgu_id', $authUser->lgu_id);
        }
        
        $totalUsers = $query->count();
        $users = $query->get();
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
