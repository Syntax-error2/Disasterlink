<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class TelemetryController extends Controller
{
    public function index(Request $request)
    {
        $lat = $request->query('lat', '10.1866');
        $lng = $request->query('lng', '122.8587');
        
        $cacheKey = "telemetry_weather_{$lat}_{$lng}";

        // ── Weather (Open-Meteo) cached 5 min ───────────────────────────────
        $weather = null;
        try {
            $weather = \Illuminate\Support\Facades\Cache::remember($cacheKey, 300, function () use ($lat, $lng) {
                $res = Http::timeout(8)->get(
                    "https://api.open-meteo.com/v1/forecast"
                    . "?latitude={$lat}&longitude={$lng}"
                    . "&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,surface_pressure,precipitation_probability,precipitation"
                    . "&hourly=precipitation,precipitation_probability"
                    . "&timezone=Asia%2FManila&forecast_days=2"
                );
                return $res->json();
            });
        } catch (\Exception $e) {}

        // ── GDACS cached 5 min ──────────────────────────────────────────────
        $gdacs = null;
        try {
            $gdacs = \Illuminate\Support\Facades\Cache::remember('telemetry_gdacs', 300, function () {
                return Http::timeout(5)->get("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH")->json();
            });
        } catch (\Exception $e) {}

        // ── USGS cached 5 min ───────────────────────────────────────────────
        $usgs = null;
        try {
            $usgs = \Illuminate\Support\Facades\Cache::remember('telemetry_usgs', 300, function () {
                return Http::timeout(5)->get("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson")->json();
            });
        } catch (\Exception $e) {}

        // ── PAGASA real-time from official CAP RSS (Deprecated, using HTML Scrape) ──
        $pagasa = null;
        try {
            $pagasa = \Illuminate\Support\Facades\Cache::remember('telemetry_pagasa', 300, function () {
                $data = ['active' => false];
                $response = Http::withoutVerifying()
                    ->timeout(8)
                    ->withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    ])
                    ->get('https://bagong.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin');

                if ($response->successful()) {
                    $html = $response->body();
                    if (stripos($html, 'Tropical Cyclone Bulletin') !== false) {
                        $pattern = '/(Tropical Depression|Tropical Storm|Severe Tropical Storm|Typhoon|Super Typhoon)\s+(&quot;|"|\')([A-Za-z]+)(&quot;|"|\')/i';
                        if (preg_match($pattern, $html, $m)) {
                            $data['active'] = true;
                            $data['category'] = $m[1];
                            $data['name'] = strtoupper($m[3]);
                            $data['former_name'] = 'N/A';
                            $data['location'] = 'Philippine Area of Responsibility';
                            $data['wind_gust'] = 'See Official Bulletin';
                            $data['movement'] = 'See Official Bulletin';
                            
                            if (preg_match('/Issued at\s+([^<]+)/i', $html, $mIssued)) {
                                $data['issued_at'] = trim($mIssued[1]);
                            } else {
                                $data['issued_at'] = date('h:i A d M Y');
                            }

                            if (preg_match('/<div class="panel-heading">\s*Location of Eye\/center\s*<\/div>\s*<div class="panel-body">\s*<p>(.*?)<\/p>/is', $html, $mLoc)) {
                                $locText = trim(strip_tags($mLoc[1]));
                                if (preg_match('/([0-9]+\s*km\s+[a-zA-Z\s\-]+of\s+[^\(]+\([^\)]+\))/i', $locText, $mPrecise)) {
                                    $data['location'] = trim($mPrecise[1]);
                                } else if (preg_match('/(?:vicinity of|at)\s+(.*)/i', $locText, $mClean)) {
                                    $data['location'] = trim($mClean[1]);
                                } else {
                                    $data['location'] = preg_replace('/^.*?estimated based on all available data.*?(?:from.*?Radar\s*|at\s*|in the vicinity of\s*)/i', '', $locText);
                                }
                            }

                            if (preg_match('/gustiness of up to\s+([^<]+)/i', $html, $mGust)) {
                                $data['wind_gust'] = "Up to " . trim($mGust[1]);
                            } elseif (preg_match('/winds of\s+([^<]+)/i', $html, $mGust)) {
                                $data['wind_gust'] = trim($mGust[1]);
                            }

                            if (preg_match('/<div class="panel-heading">\s*Movement\s*<\/div>\s*<div class="panel-body">\s*<p>(.*?)<\/p>/is', $html, $mMov)) {
                                $data['movement'] = trim($mMov[1]);
                            }
                        }
                    }
                }
                return $data;
            });
        } catch (\Exception $e) {
            $pagasa = ['active' => false];
        }

        return response()->json([
            'weather' => $weather,
            'gdacs'   => $gdacs,
            'usgs'    => $usgs,
            'pagasa'  => $pagasa,
        ], 200);
    }

    public function aiPredictions(Request $request)
    {
        $lat = $request->query('lat', '10.1866');
        $lng = $request->query('lng', '122.8587');
        $cacheKey = "telemetry_weather_{$lat}_{$lng}";
        $predictions = [];
        
        try {
            // Check weather telemetry for dynamic risk modeling
            $weather = \Illuminate\Support\Facades\Cache::get($cacheKey);
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
