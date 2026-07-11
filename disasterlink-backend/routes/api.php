<?php

use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// Authentication Routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
});

// ==========================================
// INCIDENT REPORTING API
// ==========================================

Route::post('/incidents', function (Request $request) {
    try {
        $id = DB::table('incident_reports')->insertGetId([
            'reporting_barangay' => $request->input('reporting_barangay', 'Unknown'),
            'incident_type'      => $request->input('incident_type', 'Fire'),
            'severity_level'     => $request->input('severity_level', 'High'),
            'exact_location'     => $request->input('exact_location', 'GPS Ping'),
            'details'            => $request->input('details', 'No narrative provided.'),
            'image_data'         => $request->input('image_data'), // Catches the Base64 String
            'status'             => $request->input('status', 'Pending Review'),
            'created_at'         => now(),
            'updated_at'         => now(),
        ]);
        
        return response()->json(['message' => 'Incident created!', 'id' => $id], 201);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

Route::get('/incidents', function () {
    try {
        $incidents = DB::table('incident_reports')->orderBy('created_at', 'desc')->get();
        return response()->json($incidents, 200);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

Route::patch('/incidents/{id}', function (Request $request, $id) {
    try {
        DB::table('incident_reports')->where('id', $id)->update([
            'status' => $request->input('status'),
            'updated_at' => now()
        ]);
        return response()->json(['message' => 'Status updated!'], 200);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});