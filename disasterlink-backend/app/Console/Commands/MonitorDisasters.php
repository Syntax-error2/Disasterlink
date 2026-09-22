<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use App\Models\Lgu;
use App\Models\User;
use App\Jobs\SendPushNotificationJob;

class MonitorDisasters extends Command
{
    protected $signature = 'disaster:monitor {--demo= : Trigger a specific warning}';
    protected $description = 'Omni-Disaster Tracker: Weather, USGS Earthquakes, PHIVOLCS Kanlaon';

    public function handle()
    {
        $demo = $this->option('demo');
        
        if ($demo === 'clear') {
            // Need to clear cache for all LGUs if we want a global clear, but for demo we just clear a few generic keys
            Cache::flush();
            $this->info("Cleared all alerts and cache.");
            return Command::SUCCESS;
        }

        // 1. Fetch Global Threat Data ONCE (Save API Calls)
        $this->info("Fetching Global Threat Data (USGS, PHIVOLCS, PAGASA)...");
        
        $earthquakes = [];
        try {
            $usgs = Http::timeout(5)->get("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson");
            if ($usgs->successful()) {
                $earthquakes = $usgs->json()['features'] ?? [];
            }
        } catch (\Exception $e) { $this->warn("USGS API check failed."); }

        $volcanoActive = false;
        try {
            $phivolcs = Http::withOptions(['verify' => false, 'curl' => [CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_0]])->timeout(10)->get('https://www.phivolcs.dost.gov.ph/');
            if ($phivolcs->successful()) {
                $body = $phivolcs->body();
                if (preg_match('/Kanlaon Volcano Bulletin.*Alert Level [2345]/sU', $body) || preg_match('/Kanlaon.*(?:sulfur dioxide|SO2|asupre|emissions)/siU', $body)) {
                    $volcanoActive = true;
                }
            }
        } catch (\Exception $e) { $this->warn("Phivolcs check failed."); }

        $cycloneData = null;
        try {
            $pagasa = Http::withOptions(['verify' => false, 'curl' => [CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_0]])->timeout(10)->withHeaders(['User-Agent' => 'Mozilla/5.0'])->get('https://bagong.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin');
            if ($pagasa->successful()) {
                $html = $pagasa->body();
                if (stripos($html, 'Tropical Cyclone Bulletin') !== false && preg_match('/(Tropical Depression|Tropical Storm|Severe Tropical Storm|Typhoon|Super Typhoon)\s+(&quot;|"|\')([A-Za-z]+)(&quot;|"|\')/i', $html, $m)) {
                    $name = strtoupper($m[3]);
                    $location = 'PAR'; $cycloneLat = 0; $cycloneLng = 0; $wind = 'Unknown'; $gust = 'Unknown';
                    
                    if (preg_match('/<div class="panel-heading">\s*Location of Eye\/center\s*<\/div>\s*<div class="panel-body">\s*<p>(.*?)<\/p>/is', $html, $mLoc)) {
                        $locText = trim(strip_tags($mLoc[1]));
                        if (preg_match('/([0-9]+\s*km\s+[a-zA-Z\s\-]+of\s+[^\(]+\([^\)]+\))/i', $locText, $mPrecise)) {
                            $location = trim($mPrecise[1]);
                        }
                        if (preg_match('/([0-9\.]+)\s*°N,\s*([0-9\.]+)\s*°E/i', $location, $mCoords)) {
                            $cycloneLat = (float) $mCoords[1];
                            $cycloneLng = (float) $mCoords[2];
                        }
                    }
                    if (preg_match('/winds of\s+([^<]+)/i', $html, $mGust)) $wind = trim(preg_replace('/\s+and\s+.*/i', '', $mGust[1]));
                    if (preg_match('/gustiness of up to\s+([^<]+)/i', $html, $mGust)) $gust = trim($mGust[1]);
                    
                    $cycloneData = [
                        'name' => $name, 'location' => $location, 'lat' => $cycloneLat, 'lng' => $cycloneLng, 'wind' => $wind, 'gust' => $gust
                    ];
                }
            }
        } catch (\Exception $e) { $this->warn("PAGASA Cyclone check failed."); }

        // 2. Loop through all LGUs
        try {
            $lgus = Lgu::all();
        } catch (\Exception $e) {
            $this->error("Database connection failed. Cannot fetch LGUs.");
            return Command::FAILURE;
        }

        foreach ($lgus as $lgu) {
            $this->info("Analyzing threats for {$lgu->name}...");
            $localThreats = [];
            $localSeverity = 0;

            if ($demo) {
                switch ($demo) {
                    case 'rain-red': $localThreats[] = "🔴 PAGASA RED RAINFALL WARNING: Severe flooding expected in low-lying areas of {$lgu->name}."; $localSeverity = 5; break;
                    case 'volcano': $localThreats[] = "🌋 VOLCANIC ALERT: PHIVOLCS has raised the alert status. Prepare for ashfall in {$lgu->name}."; $localSeverity = 5; break;
                    case 'earthquake': $localThreats[] = "⚠️ EARTHQUAKE DETECTED: A strong earthquake has struck. Stay away from damaged structures in {$lgu->name}."; $localSeverity = 5; break;
                }
            } else {
                // Check Earthquake Proximity
                foreach ($earthquakes as $q) {
                    $coords = $q['geometry']['coordinates'] ?? [0,0];
                    $lon = $coords[0]; $lat = $coords[1];
                    // Very rough bounding box around the LGU (approx 100km radius)
                    if (abs($lat - $lgu->latitude) < 1.0 && abs($lon - $lgu->longitude) < 1.0) {
                        $mag = $q['properties']['mag'];
                        if ($mag >= 4.5) {
                            $localThreats[] = "⚠️ EARTHQUAKE DETECTED: Magnitude {$mag} earthquake detected near {$lgu->name}. Expect aftershocks. Stay away from damaged structures.";
                            $localSeverity = max($localSeverity, 5);
                            break;
                        }
                    }
                }

                // Check Volcano (Assume Kanlaon affects all Negros LGUs for now, or check distance)
                if ($volcanoActive) {
                    // Kanlaon rough coordinates: 10.4116, 123.1328
                    if (abs(10.4116 - $lgu->latitude) < 1.5 && abs(123.1328 - $lgu->longitude) < 1.5) {
                        $localThreats[] = "🌋 VOLCANIC ALERT: PHIVOLCS detected abnormal activity at Kanlaon Volcano. Prepare for possible ashfall in {$lgu->name}.";
                        $localSeverity = max($localSeverity, 5);
                    }
                }

                // Check Open-Meteo Rain per LGU
                try {
                    $weather = Http::timeout(5)->get("https://api.open-meteo.com/v1/forecast", [
                        'latitude' => $lgu->latitude, 'longitude' => $lgu->longitude,
                        'current' => ['precipitation', 'precipitation_probability'],
                    ]);
                    
                    if ($weather->successful()) {
                        $current = $weather->json()['current'];
                        $precipitation = $current['precipitation'] ?? 0;
                        $prob = $current['precipitation_probability'] ?? 0;
                        
                        if ($precipitation > 30.0) {
                            $localThreats[] = "🔴 PAGASA RED RAINFALL WARNING: {$precipitation} mm/hr detected. Severe flooding expected in {$lgu->name}.";
                            $localSeverity = max($localSeverity, 5);
                        } elseif ($precipitation > 15.0) {
                            $localThreats[] = "🟠 PAGASA ORANGE RAINFALL WARNING: {$precipitation} mm/hr detected. Flooding is threatening {$lgu->name}.";
                            $localSeverity = max($localSeverity, 4);
                        } elseif ($precipitation > 7.5) {
                            $localThreats[] = "🟡 PAGASA YELLOW RAINFALL WARNING: {$precipitation} mm/hr detected. Flooding is possible in {$lgu->name}.";
                            $localSeverity = max($localSeverity, 3);
                        } elseif ($prob > 80) {
                            $localThreats[] = "🌧️ HEAVY RAIN ADVISORY: {$prob}% chance of heavy rain in {$lgu->name}. Please bring an umbrella and stay safe.";
                            $localSeverity = max($localSeverity, 2);
                        }
                    }
                } catch (\Exception $e) { $this->warn("Open-Meteo check failed for {$lgu->name}."); }

                // Check Cyclone Proximity
                if ($cycloneData) {
                    $cycloneMsg = "🌀 TROPICAL CYCLONE UPDATE: {$cycloneData['name']} is located at {$cycloneData['location']}. Winds: {$cycloneData['wind']}, Gusts: up to {$cycloneData['gust']}.";
                    
                    $isClose = true;
                    if ($cycloneData['lat'] > 0 && $cycloneData['lng'] > 0) {
                        $earthRadius = 6371;
                        $latDiff = deg2rad($cycloneData['lat'] - $lgu->latitude);
                        $lngDiff = deg2rad($cycloneData['lng'] - $lgu->longitude);
                        $a = sin($latDiff/2) * sin($latDiff/2) + cos(deg2rad($lgu->latitude)) * cos(deg2rad($cycloneData['lat'])) * sin($lngDiff/2) * sin($lngDiff/2);
                        $c = 2 * atan2(sqrt($a), sqrt(1-$a));
                        $distance = $earthRadius * $c;
                        
                        if ($distance > 300) { $isClose = false; }
                    }
                    
                    $cycloneCooldown = $isClose ? (3600 * 4) : (3600 * 8);
                    $lastCyclonePush = Cache::get("last_push_time_cyclone_{$lgu->id}", 0);
                    
                    if ((time() - $lastCyclonePush) >= $cycloneCooldown) {
                        $this->warn("Sending Cyclone Push Notification to {$lgu->name}...");
                        $tokens = User::where('lgu_id', $lgu->id)->whereNotNull('fcm_token')->pluck('fcm_token')->toArray();
                        if (!empty($tokens)) {
                            dispatch(new SendPushNotificationJob($tokens, '🌀 Tropical Cyclone', $cycloneMsg));
                        }
                        Cache::put("last_push_time_cyclone_{$lgu->id}", time(), now()->addDays(2));
                    }
                }
            }

            // Process Local Threat Push Notification & Dashboard Broadcast per LGU
            if (!empty($localThreats)) {
                $localThreatMsg = implode("\n\n", $localThreats);
                $lastLocalPush = Cache::get("last_push_time_local_{$lgu->id}", 0);
                $lastLocalSeverity = Cache::get("last_push_severity_local_{$lgu->id}", 0);
                $timeSinceLastLocalPush = time() - $lastLocalPush;
                $shouldPushLocal = false;

                if ($localSeverity > $lastLocalSeverity) {
                    $shouldPushLocal = true; // Escalate immediately
                } else {
                    $localCooldown = 3600 * 4; // Standard 4 hour cooldown
                    if ($timeSinceLastLocalPush >= $localCooldown) {
                        $shouldPushLocal = true;
                    }
                }

                if ($shouldPushLocal) {
                    $this->warn("Sending Local Threat Push Notification to {$lgu->name}...");
                    $title = '🚨 DISASTER ALERT';
                    if (str_contains($localThreatMsg, 'RAIN') || str_contains($localThreatMsg, 'ADVISORY')) {
                        $title = '🌧️ Rain Advisory';
                    }
                    
                    $tokens = User::where('lgu_id', $lgu->id)->whereNotNull('fcm_token')->pluck('fcm_token')->toArray();
                    if (!empty($tokens)) {
                        dispatch(new SendPushNotificationJob($tokens, $title, $localThreatMsg));
                    }
                    
                    Cache::put("last_push_time_local_{$lgu->id}", time(), now()->addDays(2));
                    Cache::put("last_push_severity_local_{$lgu->id}", $localSeverity, now()->addDays(2));
                }

                // Save to active_broadcast for the Home Screen Dashboard
                $broadcast = ['id' => uniqid('monitor_'), 'message' => $localThreatMsg, 'severity' => $localSeverity];
                Cache::put("active_broadcast_{$lgu->id}", $broadcast, now()->addMinutes(120));
            } else {
                $this->info("No active local threats for {$lgu->name}. System Normal.");
                Cache::forget("active_broadcast_{$lgu->id}");
                Cache::forget("last_push_severity_local_{$lgu->id}");
            }
        }
        
        return Command::SUCCESS;
    }
}
