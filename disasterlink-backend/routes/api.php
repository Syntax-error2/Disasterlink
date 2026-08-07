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

// ==========================================
// AUTOMATED DISASTER MONITOR WEBHOOK
// External cron service pings this every 5 min
// to check threats & send FCM push notifications
// ==========================================
Route::get('/cron/monitor/{secret}', function ($secret) {
    if ($secret !== 'DL2026AutoMonitor') {
        return response()->json(['error' => 'Unauthorized'], 403);
    }
    \Illuminate\Support\Facades\Artisan::call('disaster:monitor');
    $output = \Illuminate\Support\Facades\Artisan::output();
    return response()->json(['status' => 'ok', 'output' => trim($output)]);
});

Route::get('/cron', function () { 
    $logPath = storage_path('logs/laravel.log');
    if (file_exists($logPath)) {
        // Get last 1000 lines
        $lines = file($logPath);
        $lastLines = array_slice($lines, -500);
        return response()->json(['log' => implode("", $lastLines)]);
    }
    return response()->json(['message' => 'No log file']); 
});

use App\Http\Controllers\IncidentReportController;
use App\Http\Controllers\EvacuationCenterController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CommunityPostController;
use App\Http\Controllers\FamilyMemberController;
use App\Http\Controllers\ResponderTelemetryController;
use App\Http\Controllers\UserController;

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/fcm-token', [AuthController::class, 'updateFcmToken']);

    // ==========================================
    // INCIDENT REPORTING API
    // ==========================================
    Route::get('/incidents', [IncidentReportController::class, 'index']);
    Route::get('/incidents/sync', [IncidentReportController::class, 'sync']);
    Route::post('/incidents', [IncidentReportController::class, 'store'])->middleware('throttle:sos');
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
    Route::delete('/feed/{id}', [CommunityPostController::class, 'destroy']);

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

    // ==========================================
    // PERSONNEL MANAGEMENT API
    // ==========================================
    Route::get('/personnel/representatives', [UserController::class, 'getRepresentatives'])->middleware('role:barangay_captain,admin');
    Route::post('/personnel/representatives', [UserController::class, 'createRepresentative'])->middleware('role:barangay_captain,admin');
    Route::delete('/personnel/representatives/{id}', [UserController::class, 'deleteRepresentative'])->middleware('role:barangay_captain,admin');

    // ==========================================
    // ADMIN USER MANAGEMENT
    // ==========================================
    Route::get('/admin/users', [\App\Http\Controllers\AdminUserController::class, 'index'])->middleware('role:admin,superadmin');
    Route::post('/admin/users', [\App\Http\Controllers\AdminUserController::class, 'store'])->middleware('role:admin,superadmin');

    // ==========================================
    // DEPLOYMENT TEAMS
    // ==========================================
    Route::get('/teams', [\App\Http\Controllers\TeamController::class, 'index'])->middleware('role:admin,superadmin');
    Route::post('/teams', [\App\Http\Controllers\TeamController::class, 'store'])->middleware('role:admin,superadmin');
    Route::put('/teams/{id}', [\App\Http\Controllers\TeamController::class, 'update'])->middleware('role:admin,superadmin');
    Route::delete('/teams/{id}', [\App\Http\Controllers\TeamController::class, 'destroy'])->middleware('role:admin,superadmin');
});