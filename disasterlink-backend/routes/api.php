<?php

use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// --------------------------------------------------------
// SuperAdmin Routes
// --------------------------------------------------------
Route::middleware(['auth:sanctum', 'throttle:api', 'role:superadmin'])->group(function () {
    Route::get('/superadmin/lgus', [\App\Http\Controllers\SuperAdminController::class, 'getLgus']);
    Route::post('/superadmin/lgus', [\App\Http\Controllers\SuperAdminController::class, 'createLgu']);
});

// --------------------------------------------------------
// Auth & Public Routes
// --------------------------------------------------------
Route::middleware('throttle:auth')->group(function () {
    Route::post('/register/send-otp', [AuthController::class, 'sendOtp']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});
Route::get('/tenant-config/{subdomain}', [AuthController::class, 'tenantConfig'])->middleware('throttle:api');

Route::get('/telemetry', [App\Http\Controllers\TelemetryController::class, 'index']);
Route::get('/route', [App\Http\Controllers\TelemetryController::class, 'getRoute']);
Route::get('/ai/predictions', [App\Http\Controllers\TelemetryController::class, 'aiPredictions']);

use App\Http\Controllers\IncidentReportController;
use App\Http\Controllers\EvacuationCenterController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CommunityPostController;
use App\Http\Controllers\FamilyMemberController;
use App\Http\Controllers\ResponderTelemetryController;

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/fcm-token', [AuthController::class, 'updateFcmToken']);

    // ==========================================
    // INCIDENT REPORTING API
    // ==========================================
    Route::get('/incidents', [IncidentReportController::class, 'index']);
    Route::get('/incidents/sync', [IncidentReportController::class, 'sync']);
    Route::post('/incidents', [IncidentReportController::class, 'store']);
    Route::put('/incidents/{id}', [IncidentReportController::class, 'update'])->middleware('role:admin,responder');
    Route::delete('/incidents/{id}', [IncidentReportController::class, 'destroy'])->middleware('role:admin');
    Route::post('/incidents/{id}/verify', [IncidentReportController::class, 'verify'])->middleware('role:admin,responder');
    Route::get('/broadcast', [App\Http\Controllers\BroadcastController::class, 'get']);
    Route::post('/broadcast', [App\Http\Controllers\BroadcastController::class, 'store'])->middleware('role:admin');

    // ==========================================
    // EVACUATION CENTERS API
    // ==========================================
    Route::get('/evacuation-centers', [EvacuationCenterController::class, 'index']);
    Route::post('/evacuation-centers', [EvacuationCenterController::class, 'store'])->middleware('role:admin');

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
    Route::post('/responder/ping', [ResponderTelemetryController::class, 'ping'])->middleware('role:responder,admin');
});