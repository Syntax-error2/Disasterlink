<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\EvacuationCenter;

class EvacuationCenterController extends Controller
{
    public function index()
    {
        return response()->json(EvacuationCenter::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'location' => 'required|string|max:255',
            'capacity' => 'required|integer|min:1',
            'current_occupants' => 'integer|min:0',
            'status' => 'string|in:Active,Full,Closed'
        ]);

        $center = EvacuationCenter::create($validated);
        return response()->json($center, 201);
    }
}
