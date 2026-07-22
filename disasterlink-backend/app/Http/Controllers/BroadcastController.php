<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class BroadcastController extends Controller
{
    public function get()
    {
        return response()->json([
            'broadcast' => Cache::get('active_broadcast')
        ]);
    }

    public function store(Request $request)
    {
        $message = $request->input('message');
        $duration = $request->input('duration', 60);
        
        Cache::put('active_broadcast', $message, now()->addMinutes($duration));
        
        return response()->json(['success' => true]);
    }
    
    public function clear()
    {
        Cache::forget('active_broadcast');
        return response()->json(['success' => true]);
    }
}
