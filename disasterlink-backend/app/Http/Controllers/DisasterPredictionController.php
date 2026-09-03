<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class DisasterPredictionController extends Controller
{
    public function analyzeRisk(Request $request)
    {
        // For demonstration, we'll use Binalbagan's coordinates
        $lat = 10.1866;
        $lng = 122.8587;
        
        try {
            // 1. Fetch live weather data from OpenMeteo
            $weatherResponse = Http::get("https://api.open-meteo.com/v1/forecast", [
                'latitude' => $lat,
                'longitude' => $lng,
                'current' => 'precipitation,rain,showers,weather_code',
                'timezone' => 'auto'
            ]);
            
            $weather = $weatherResponse->json();
            $precipitation = $weather['current']['precipitation'] ?? 0;
            
            // 2. Mock Elevation Data for Barangays (Usually fetched from a GIS DB or Google Elevation API)
            $barangayElevations = [
                'Progreso' => 2.5, // Meters above sea level (High flood risk)
                'San Jose' => 3.1,
                'Santo Rosario' => 4.0,
                'Payao' => 12.0,   // High elevation (Low risk)
                'Bi-ao' => 15.5
            ];
            
            // 3. AI Risk Assessment Logic
            $forceRain = $request->query('force_rain', false);
            
            if ($precipitation > 5.0 || $forceRain) {
                // Find vulnerable barangays (Elevation < 5m)
                $vulnerable = [];
                foreach ($barangayElevations as $brgy => $elevation) {
                    if ($elevation < 5.0) {
                        $vulnerable[] = $brgy;
                    }
                }
                
                $targetArea = implode(', ', $vulnerable);
                $message = "AI ALERT: Heavy rain detected. Barangays " . $targetArea . " are identified as low-elevation (high flood risk). Dispatching targeted pre-emptive evacuation alert specifically to residents in these areas.";
                
                return response()->json([
                    'risk_level' => 'HIGH',
                    'precipitation_mm' => $forceRain ? 12.5 : $precipitation,
                    'vulnerable_barangays' => $vulnerable,
                    'ai_recommendation' => $message,
                    'suggested_action' => 'TARGETED_EVACUATION',
                    'target_area' => $targetArea
                ]);
            }
            
            return response()->json([
                'risk_level' => 'LOW',
                'precipitation_mm' => $precipitation,
                'vulnerable_barangays' => [],
                'ai_recommendation' => "Current precipitation is low. No immediate flood risk detected for low-elevation areas.",
                'suggested_action' => 'MONITOR'
            ]);
            
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to analyze risk: ' . $e->getMessage()], 500);
        }
    }
}
