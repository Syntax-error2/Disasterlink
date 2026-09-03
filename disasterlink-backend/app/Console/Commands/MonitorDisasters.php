<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class MonitorDisasters extends Command
{
    protected $signature = 'disaster:monitor {--demo= : Trigger a specific warning}';
    protected $description = 'Omni-Disaster Tracker: Weather, USGS Earthquakes, PHIVOLCS Kanlaon';

    public function handle()
    {
        $demo = $this->option('demo');
        $latitude = 10.1866; // Binalbagan Lat
        $longitude = 122.8587; // Binalbagan Lng
        
        $localThreatMsg = null;
        $cycloneMsg = null;
        $localSeverity = 0;
        $cycloneSeverity = 5;

        if ($demo) {
            $this->info("Running in DEMO mode: {$demo}");
            switch ($demo) {
                case 'rain-red': $localThreatMsg = "🔴 PAGASA RED RAINFALL WARNING: Severe flooding expected in low-lying areas of Binalbagan."; $localSeverity = 5; break;
                case 'volcano': $localThreatMsg = "🌋 VOLCANIC ALERT: PHIVOLCS has raised the alert status for Kanlaon Volcano (Sulfur Dioxide emissions detected)."; $localSeverity = 5; break;
                case 'earthquake': $localThreatMsg = "⚠️ EARTHQUAKE DETECTED: A strong earthquake has struck near Negros Occidental."; $localSeverity = 5; break;
                case 'clear': Cache::forget('active_broadcast'); $this->info("Cleared alerts."); return Command::SUCCESS;
            }
        } else {
            // 1. Check USGS Earthquakes
            $this->info("Checking USGS Earthquakes...");
            try {
                $usgs = Http::timeout(5)->get("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson");
                if ($usgs->successful()) {
                    $quakes = $usgs->json()['features'] ?? [];
                    foreach ($quakes as $q) {
                        $coords = $q['geometry']['coordinates'] ?? [0,0];
                        $lon = $coords[0]; $lat = $coords[1];
                        if ($lat > 9.0 && $lat < 11.5 && $lon > 122.0 && $lon < 124.0) {
                            $mag = $q['properties']['mag'];
                            $localThreatMsg = "⚠️ EARTHQUAKE DETECTED: Magnitude {$mag} earthquake detected near Negros. Expect aftershocks. Stay away from damaged structures.";
                            $localSeverity = 5;
                            break;
                        }
                    }
                }
            } catch (\Exception $e) {
                $this->warn("USGS API check failed: " . $e->getMessage());
            }

            // 2. Check PHIVOLCS Kanlaon
            if (!$localThreatMsg) {
                $this->info("Checking PHIVOLCS Kanlaon status...");
                try {
                    $phivolcs = Http::withOptions([
                        'verify' => false,
                        'curl' => [CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_0]
                    ])->timeout(10)->get('https://www.phivolcs.dost.gov.ph/');
                    
                    if ($phivolcs->successful()) {
                        $body = $phivolcs->body();
                        // Check for elevated alert level OR sulfur dioxide (asupre) emissions near Kanlaon
                        if (preg_match('/Kanlaon Volcano Bulletin.*Alert Level [2345]/sU', $body) || 
                            preg_match('/Kanlaon.*(?:sulfur dioxide|SO2|asupre|emissions)/siU', $body)) {
                            $localThreatMsg = "🌋 VOLCANIC ALERT: PHIVOLCS detected abnormal activity/emissions at Kanlaon Volcano. Prepare for possible ashfall or evacuation.";
                            $localSeverity = 5;
                        }
                    }
                } catch (\Exception $e) {
                    $this->warn("Phivolcs check failed: " . $e->getMessage());
                }
            }

            // 3. Check Open-Meteo Rain
            if (!$localThreatMsg) {
                $this->info("Checking Open-Meteo Weather...");
                try {
                    $weather = Http::timeout(5)->get("https://api.open-meteo.com/v1/forecast", [
                        'latitude' => $latitude,
                        'longitude' => $longitude,
                        'current' => ['precipitation', 'precipitation_probability'],
                    ]);
                    
                    if ($weather->successful()) {
                        $current = $weather->json()['current'];
                        $precipitation = $current['precipitation'] ?? 0;
                        $prob = $current['precipitation_probability'] ?? 0;
                        
                        if ($precipitation > 30.0) {
                            $localThreatMsg = "🔴 PAGASA RED RAINFALL WARNING: {$precipitation} mm/hr detected. Severe flooding expected in Binalbagan.";
                            $localSeverity = 5;
                        } elseif ($precipitation > 15.0) {
                            $localThreatMsg = "🟠 PAGASA ORANGE RAINFALL WARNING: {$precipitation} mm/hr detected. Flooding is threatening Binalbagan.";
                            $localSeverity = 4;
                        } elseif ($precipitation > 7.5) {
                            $localThreatMsg = "🟡 PAGASA YELLOW RAINFALL WARNING: {$precipitation} mm/hr detected. Flooding is possible in Binalbagan.";
                            $localSeverity = 3;
                        } elseif ($prob > 80) {
                            $localThreatMsg = "🌧️ HEAVY RAIN ADVISORY: {$prob}% chance of heavy rain in Binalbagan. Please bring an umbrella and stay safe.";
                            $localSeverity = 2;
                        }
                    }
                } catch (\Exception $e) {
                    $this->warn("Open-Meteo check failed: " . $e->getMessage());
                }
            }
            
            // 4. Check PAGASA Tropical Cyclone (Independent of Local Threats)
            $this->info("Checking PAGASA Tropical Cyclones...");
            try {
                $response = Http::withOptions([
                    'verify' => false,
                    'curl' => [CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_0]
                ])->timeout(10)->withHeaders([
                    'User-Agent' => 'Mozilla/5.0'
                ])->get('https://bagong.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin');
                
                if ($response->successful()) {
                    $html = $response->body();
                    if (stripos($html, 'Tropical Cyclone Bulletin') !== false) {
                        $pattern = '/(Tropical Depression|Tropical Storm|Severe Tropical Storm|Typhoon|Super Typhoon)\s+(&quot;|"|\')([A-Za-z]+)(&quot;|"|\')/i';
                        if (preg_match($pattern, $html, $m)) {
                            $name = strtoupper($m[3]);
                            
                            $location = 'PAR';
                            $cycloneLat = 0;
                            $cycloneLng = 0;
                            
                            if (preg_match('/<div class="panel-heading">\s*Location of Eye\/center\s*<\/div>\s*<div class="panel-body">\s*<p>(.*?)<\/p>/is', $html, $mLoc)) {
                                $locText = trim(strip_tags($mLoc[1]));
                                if (preg_match('/([0-9]+\s*km\s+[a-zA-Z\s\-]+of\s+[^\(]+\([^\)]+\))/i', $locText, $mPrecise)) {
                                    $location = trim($mPrecise[1]);
                                } else if (preg_match('/(?:vicinity of|at)\s+(.*)/i', $locText, $mClean)) {
                                    $location = trim($mClean[1]);
                                } else {
                                    $location = preg_replace('/^.*?estimated based on all available data.*?(?:from.*?Radar\s*|at\s*|in the vicinity of\s*)/i', '', $locText);
                                }
                                
                                // Extract coordinates
                                if (preg_match('/([0-9\.]+)\s*°N,\s*([0-9\.]+)\s*°E/i', $location, $mCoords)) {
                                    $cycloneLat = (float) $mCoords[1];
                                    $cycloneLng = (float) $mCoords[2];
                                }
                            }
                            
                            $wind = 'Unknown';
                            if (preg_match('/winds of\s+([^<]+)/i', $html, $mGust)) {
                                $wind = trim(preg_replace('/\s+and\s+.*/i', '', $mGust[1]));
                            }
                            
                            $gust = 'Unknown';
                            if (preg_match('/gustiness of up to\s+([^<]+)/i', $html, $mGust)) $gust = trim($mGust[1]);

                            $cycloneMsg = "🌀 TROPICAL CYCLONE UPDATE: {$name} is located at {$location}. Winds: {$wind}, Gusts: up to {$gust}.";
                            
                            // Distance calculation logic
                            $isClose = true;
                            if ($cycloneLat > 0 && $cycloneLng > 0) {
                                // Rough distance calculation using Haversine
                                $earthRadius = 6371; // km
                                $latDiff = deg2rad($cycloneLat - $latitude);
                                $lngDiff = deg2rad($cycloneLng - $longitude);
                                $a = sin($latDiff/2) * sin($latDiff/2) +
                                     cos(deg2rad($latitude)) * cos(deg2rad($cycloneLat)) *
                                     sin($lngDiff/2) * sin($lngDiff/2);
                                $c = 2 * atan2(sqrt($a), sqrt(1-$a));
                                $distance = $earthRadius * $c;
                                
                                $this->info("Cyclone is {$distance} km away from Binalbagan.");
                                if ($distance > 300) {
                                    $isClose = false;
                                }
                            }
                            
                            // Determine Cyclone Cooldown: 4 hours if close, 8 hours if far
                            $cycloneCooldown = $isClose ? (3600 * 4) : (3600 * 8);
                            
                            // Process Cyclone Push Notification independently
                            $lastCyclonePush = Cache::get('last_push_time_cyclone', 0);
                            if ((time() - $lastCyclonePush) >= $cycloneCooldown) {
                                $this->warn("Sending Cyclone Push Notification...");
                                $this->sendPushNotification('🌀 Tropical Cyclone', $cycloneMsg);
                                Cache::put('last_push_time_cyclone', time(), now()->addDays(2));
                            } else {
                                $this->info("Cyclone threat active but in cooldown.");
                            }
                        }
                    }
                }
            } catch (\Exception $e) {
                $this->warn("PAGASA Cyclone check failed: " . $e->getMessage());
            }
        }

        // Process Local Threat Push Notification & Dashboard Broadcast
        if ($localThreatMsg) {
            $lastLocalPush = Cache::get('last_push_time_local', 0);
            $lastLocalSeverity = Cache::get('last_push_severity_local', 0);
            $timeSinceLastLocalPush = time() - $lastLocalPush;
            $shouldPushLocal = false;

            if ($localSeverity > $lastLocalSeverity) {
                $shouldPushLocal = true; // Escalate immediately
            } else {
                $localCooldown = 3600 * 4; // Standard 4 hour cooldown for rain/local
                if ($timeSinceLastLocalPush >= $localCooldown) {
                    $shouldPushLocal = true;
                }
            }

            if ($shouldPushLocal) {
                $this->warn("Sending Local Threat Push Notification...");
                $title = '🚨 DISASTER ALERT';
                if (str_contains($localThreatMsg, 'RAIN') || str_contains($localThreatMsg, 'ADVISORY')) {
                    $title = '🌧️ Rain Advisory';
                }
                $this->sendPushNotification($title, $localThreatMsg);
                
                Cache::put('last_push_time_local', time(), now()->addDays(2));
                Cache::put('last_push_severity_local', $localSeverity, now()->addDays(2));
            } else {
                $this->info("Local threat active but in cooldown.");
            }

            // Save to active_broadcast for the Home Screen Dashboard
            $broadcast = ['id' => uniqid('monitor_'), 'message' => $localThreatMsg, 'severity' => $localSeverity];
            Cache::put('active_broadcast', $broadcast, now()->addMinutes(120));
        } else {
            $this->info("No active local threats. System Normal.");
            Cache::forget('active_broadcast');
            Cache::forget('last_push_severity_local');
        }
        
        return Command::SUCCESS;
    }
    
    private function sendPushNotification($title, $message)
    {
        try {
            $tokens = \App\Models\User::whereNotNull('fcm_token')->pluck('fcm_token')->toArray();
            if (!empty($tokens)) {
                $factory = (new \Kreait\Firebase\Factory)->withServiceAccount(base_path('firebase_credentials.json'));
                $messaging = $factory->createMessaging();
                
                // Clean emoji from title to prevent Android notification parse corruption
                $cleanTitle = str_replace(['🚨', '🌧️', '🌀'], '', $title);
                $cleanTitle = trim($cleanTitle);

                $notification = \Kreait\Firebase\Messaging\Notification::create($cleanTitle, $message);
                $config = \Kreait\Firebase\Messaging\AndroidConfig::fromArray([
                    'priority' => 'high',
                    'notification' => [
                        'channel_id' => 'emergency_alerts',
                        'sound' => 'default',
                        'default_vibrate_timings' => true,
                        'default_light_settings' => true,
                    ],
                ]);
                $cloudMessage = \Kreait\Firebase\Messaging\CloudMessage::new()
                    ->withNotification($notification)
                    ->withAndroidConfig($config)
                    ->withData([
                        'title' => $cleanTitle,
                        'body' => $message,
                        'channel_id' => 'emergency_alerts'
                    ]);
                
                $report = $messaging->sendMulticast($cloudMessage, $tokens);
                $this->info("FCM Sent to " . count($tokens) . " devices. Success: " . $report->successes()->count() . ", Failures: " . $report->failures()->count());
                if ($report->failures()->count() > 0) {
                    foreach ($report->failures() as $failure) {
                        \Illuminate\Support\Facades\Log::error('Firebase Token Failure: ' . $failure->error()->getMessage());
                    }
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Firebase Push Failed: ' . $e->getMessage());
        }
    }
}
