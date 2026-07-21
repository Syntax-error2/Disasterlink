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

// ==========================================
// INCIDENT REPORTING API
// ==========================================

Route::get('/incidents', [IncidentReportController::class, 'index']);
Route::post('/incidents', [IncidentReportController::class, 'store']);
Route::patch('/incidents/{id}', [IncidentReportController::class, 'update']);