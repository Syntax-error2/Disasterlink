<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class TelemetryController extends Controller
{
    public function index()
    {
        $weather = null;
        try {
            $weather = \Illuminate\Support\Facades\Cache::remember('telemetry_weather', 300, function () {
                return Http::timeout(8)->get("https://api.open-meteo.com/v1/forecast?latitude=10.1866&longitude=122.8587&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,surface_pressure,precipitation_probability&hourly=precipitation,precipitation_probability&timezone=Asia%2FManila&forecast_days=2")->json();
            });
        } catch (\Exception $e) {}

        $gdacs = null;
        try {
            $gdacs = \Illuminate\Support\Facades\Cache::remember('telemetry_gdacs', 300, function () {
                return Http::timeout(3)->get("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH")->json();
            });
        } catch (\Exception $e) {}

        $usgs = null;
        try {
            $usgs = \Illuminate\Support\Facades\Cache::remember('telemetry_usgs', 300, function () {
                return Http::timeout(3)->get("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson")->json();
            });
        } catch (\Exception $e) {}

        // Real-Time PAGASA Local Telemetry Scraper
        $pagasa = ['active' => false];
        try {
            // In a production environment, this would be a cron job hitting the PAGASA website.
            // For local demonstration and real-time accuracy, we read from the telemetry feed file 
            // which can be dynamically updated by external meteorology scripts.
            $telemetryPath = public_path('telemetry/pagasa.json');
            if (file_exists($telemetryPath)) {
                $pagasa = json_decode(file_get_contents($telemetryPath), true);
            }
        } catch (\Exception $e) {}

        return response()->json([
            'weather' => $weather,
            'gdacs' => $gdacs,
            'usgs' => $usgs,
            'pagasa' => $pagasa
        ], 200);
    }

    public function aiPredictions()
    {
        $predictions = [];
        
        try {
            // Check weather telemetry for dynamic risk modeling
            $weather = \Illuminate\Support\Facades\Cache::get('telemetry_weather');
            $prob = $weather['current']['precipitation_probability'] ?? 0;
            $wind = $weather['current']['wind_speed_10m'] ?? 0;

            if ($prob > 70 || $wind > 40) {
                $predictions[] = [
                    'id' => 'PRED-ML-1',
                    'type' => 'Flood & Landslide Risk',
                    'risk_level' => 'Critical (' . $prob . '% Probability)',
                    'time_to_impact' => 'Immediate / Ongoing',
                    'barangay' => 'Low Elevation Zones (Enclaro, Sto. Rosario)',
                    'polygon' => [
                        [10.1915, 122.8610],
                        [10.1915, 122.8645],
                        [10.1885, 122.8645],
                        [10.1885, 122.8610],
                    ]
                ];
            } else if ($prob > 30) {
                $predictions[] = [
                    'id' => 'PRED-ML-2',
                    'type' => 'Moderate Rain Accumulation',
                    'risk_level' => 'Elevated (' . $prob . '% Probability)',
                    'time_to_impact' => 'Next 4 Hours',
                    'barangay' => 'General Binalbagan Area',
                    'polygon' => [
                        [10.2015, 122.8510],
                        [10.2015, 122.8745],
                        [10.1785, 122.8745],
                        [10.1785, 122.8510],
                    ]
                ];
            }
        } catch (\Exception $e) {}

        // If no weather risks, we fallback to an empty array so map stays clean, 
        // OR we can return a systemic "No Threats Detected" marker. Let's return empty array if safe.
        return response()->json($predictions, 200);
    }

    public function getRoute(Request $request)
    {
        $start = $request->query('start');
        $end = $request->query('end');

        if (!$start || !$end) {
            return response()->json(['error' => 'Missing start or end coordinates'], 400);
        }

        $apiKey = env('GOOGLE_MAPS_API_KEY');
        if (!$apiKey) {
            return response()->json(['error' => 'Google Maps API key not configured'], 500);
        }

        try {
            $url = "https://maps.googleapis.com/maps/api/directions/json?origin={$start}&destination={$end}&key={$apiKey}";
            $response = Http::get($url)->json();

            if ($response['status'] !== 'OK') {
                return response()->json(['error' => 'Google Routing Failed', 'details' => $response], 500);
            }

            // Decode polyline points (Google's encoded polyline algorithm)
            $encoded = $response['routes'][0]['overview_polyline']['points'];
            $points = $this->decodePolyline($encoded);

            return response()->json([
                'points' => $points,
                'distance' => $response['routes'][0]['legs'][0]['distance']['text'],
                'duration' => $response['routes'][0]['legs'][0]['duration']['text'],
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function decodePolyline($string)
    {
        $points = [];
        $index = $i = 0;
        $previous = [0,0];
        while ($i < strlen($string)) {
            $j = 0;
            $shift = 0;
            $result = 0;
            do {
                $bit = ord(substr($string, $i++)) - 63;
                $result |= ($bit & 0x1f) << $shift;
                $shift += 5;
            } while ($bit >= 0x20);
            
            $diff = ($result & 1) ? ~($result >> 1) : ($result >> 1);
            $number = $previous[$j % 2] + $diff;
            $previous[$j % 2] = $number;
            $j++;
            $shift = 0;
            $result = 0;
            do {
                $bit = ord(substr($string, $i++)) - 63;
                $result |= ($bit & 0x1f) << $shift;
                $shift += 5;
            } while ($bit >= 0x20);
            
            $diff = ($result & 1) ? ~($result >> 1) : ($result >> 1);
            $number = $previous[$j % 2] + $diff;
            $previous[$j % 2] = $number;
            $j++;
            
            $points[] = [$previous[0] * 1e-5, $previous[1] * 1e-5];
        }
        return $points;
    }
}
