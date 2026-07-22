<?php

use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// Authentication Routes
Route::post('/register/send-otp', [AuthController::class, 'sendOtp']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
});

use App\Http\Controllers\IncidentReportController;
use App\Http\Controllers\EvacuationCenterController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CommunityPostController;
use App\Http\Controllers\FamilyMemberController;
use App\Http\Controllers\ResponderTelemetryController;

// ==========================================
// INCIDENT REPORTING API
// ==========================================
Route::get('/incidents', [IncidentReportController::class, 'index']);
Route::post('/incidents', [IncidentReportController::class, 'store']);
Route::put('/incidents/{id}', [IncidentReportController::class, 'update']);
Route::post('/incidents/{id}/verify', [IncidentReportController::class, 'verify']);
Route::get('/telemetry', [App\Http\Controllers\TelemetryController::class, 'index']);
Route::get('/ai/predictions', [App\Http\Controllers\TelemetryController::class, 'aiPredictions']);
Route::get('/broadcast', [App\Http\Controllers\BroadcastController::class, 'get']);
Route::post('/broadcast', [App\Http\Controllers\BroadcastController::class, 'store']);

// ==========================================
// EVACUATION CENTERS API
// ==========================================
Route::get('/evacuation-centers', [EvacuationCenterController::class, 'index']);
Route::post('/evacuation-centers', [EvacuationCenterController::class, 'store']);

// ==========================================
// DASHBOARD STATS API
// ==========================================
Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

// ==========================================
// COMMUNITY FEED API
// ==========================================
Route::get('/feed', [CommunityPostController::class, 'index']);
Route::post('/feed', [CommunityPostController::class, 'store']);
Route::post('/feed/{id}/like', [CommunityPostController::class, 'like']);

// ==========================================
// FAMILY TRACKING API
// ==========================================
Route::get('/family', [FamilyMemberController::class, 'index']);
Route::post('/family', [FamilyMemberController::class, 'store']);
Route::post('/family/status', [FamilyMemberController::class, 'updateStatus']);

// ==========================================
// RESPONDER TELEMETRY API
// ==========================================
Route::get('/responder/locations', [ResponderTelemetryController::class, 'index']);
Route::post('/responder/ping', [ResponderTelemetryController::class, 'ping']);