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
            
            $forceRain = $request->query('force_rain', false);
            if ($forceRain) {
                $precipitation = max(15.0, $precipitation);
            }

            // 3. True AI Risk Assessment via Gemini
            $apiKey = env('GEMINI_API_KEY');
            if (!$apiKey) {
                // Fallback to basic logic if no key
                if ($precipitation > 5.0) {
                    $vulnerable = array_keys(array_filter($barangayElevations, fn($e) => $e < 5.0));
                    return response()->json([
                        'risk_level' => 'HIGH',
                        'precipitation_mm' => $precipitation,
                        'vulnerable_barangays' => $vulnerable,
                        'ai_recommendation' => "AI ALERT: Heavy rain detected. Target: " . implode(', ', $vulnerable),
                        'suggested_action' => 'TARGETED_EVACUATION',
                        'target_area' => implode(', ', $vulnerable)
                    ]);
                }
                return response()->json([
                    'risk_level' => 'LOW',
                    'precipitation_mm' => $precipitation,
                    'vulnerable_barangays' => [],
                    'ai_recommendation' => "Low precipitation. No immediate risk.",
                    'suggested_action' => 'MONITOR'
                ]);
            }

            // Call Gemini
            $prompt = "You are an expert disaster risk analyst for a Philippine municipality.
Current Weather Precipitation: {$precipitation} mm.
Barangay Elevations (meters above sea level): " . json_encode($barangayElevations) . "
Given the precipitation and elevations, assess the flood risk. If precipitation > 5mm, risk is usually HIGH for elevations < 5m.
Return ONLY a valid JSON object with NO markdown wrapping, containing these exact keys:
- risk_level (HIGH, MODERATE, or LOW)
- vulnerable_barangays (array of strings, e.g., ['Progreso', 'San Jose'])
- ai_recommendation (string, clear alert or monitoring message)
- suggested_action (TARGETED_EVACUATION, STANDBY, or MONITOR)
- target_area (string, comma separated barangays or 'None')
";

            $aiResponse = Http::post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}", [
                'contents' => [
                    ['parts' => [['text' => $prompt]]]
                ],
                'generationConfig' => [
                    'responseMimeType' => 'application/json',
                    'temperature' => 0.1
                ]
            ]);

            if ($aiResponse->successful()) {
                $content = $aiResponse->json('candidates.0.content.parts.0.text');
                $aiData = json_decode($content, true);
                if ($aiData) {
                    $aiData['precipitation_mm'] = $precipitation;
                    return response()->json($aiData);
                }
            }

            throw new \Exception('Failed to parse AI response');
            
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to analyze risk: ' . $e->getMessage()], 500);
        }
    }
}
