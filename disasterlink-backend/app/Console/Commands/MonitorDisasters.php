<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class MonitorDisasters extends Command
{
    protected $signature = 'disaster:monitor {--demo= : Trigger a specific warning (rain-red, rain-orange, rain-yellow, volcano, earthquake, clear)}';
    protected $description = 'Omni-Disaster Tracker: Weather, USGS Earthquakes, PHIVOLCS Kanlaon';

    public function handle()
    {
        $demo = $this->option('demo');
        $latitude = 10.1866;
        $longitude = 122.8587;
        
        $warningMsg = null;
        $duration = 120; // 2 hours

        if ($demo) {
            $this->info("Running in DEMO mode: {$demo}");
            switch ($demo) {
                case 'rain-red': $warningMsg = "🔴 PAGASA RED RAINFALL WARNING: Severe flooding expected in low-lying areas of Binalbagan."; break;
                case 'rain-orange': $warningMsg = "🟠 PAGASA ORANGE RAINFALL WARNING: Flooding is threatening Binalbagan."; break;
                case 'rain-yellow': $warningMsg = "🟡 PAGASA YELLOW RAINFALL WARNING: Flooding is possible in Binalbagan."; break;
                case 'volcano': $warningMsg = "🌋 VOLCANIC ALERT: PHIVOLCS has raised the alert status for Kanlaon Volcano. Prepare for possible ashfall and evacuation."; break;
                case 'earthquake': $warningMsg = "⚠️ EARTHQUAKE DETECTED: A strong earthquake has struck near Negros Occidental. Expect aftershocks. Stay away from damaged structures."; break;
                case 'clear': Cache::forget('active_broadcast'); $this->info("Cleared alerts."); return Command::SUCCESS;
            }
        } else {
            // 1. Check USGS Earthquakes (M4.5+ in the last day)
            $this->info("Checking USGS Earthquakes...");
            try {
                $usgs = Http::timeout(5)->get("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson");
                if ($usgs->successful()) {
                    $quakes = $usgs->json()['features'] ?? [];
                    foreach ($quakes as $q) {
                        $coords = $q['geometry']['coordinates'] ?? [0,0];
                        $lon = $coords[0]; $lat = $coords[1];
                        // Bounding box for Negros roughly Lat 9-11, Lon 122-124
                        if ($lat > 9.0 && $lat < 11.5 && $lon > 122.0 && $lon < 124.0) {
                            $mag = $q['properties']['mag'];
                            $warningMsg = "⚠️ EARTHQUAKE DETECTED: Magnitude {$mag} earthquake detected near Negros. Expect aftershocks. Stay away from damaged structures.";
                            break;
                        }
                    }
                }
            } catch (\Exception $e) {
                $this->warn("USGS API check failed: " . $e->getMessage());
            }

            // 2. Check PHIVOLCS Kanlaon (Scraping the RSS/HTML) if no earthquake warning
            if (!$warningMsg) {
                $this->info("Checking PHIVOLCS Kanlaon status...");
                try {
                    $phivolcs = Http::withoutVerifying()->timeout(5)->get('https://www.phivolcs.dost.gov.ph/');
                    if ($phivolcs->successful()) {
                        $body = $phivolcs->body();
                        // Simple heuristic: If it says Kanlaon Alert Level 2 or 3 on homepage
                        if (preg_match('/Kanlaon Volcano Bulletin.*Alert Level [2345]/sU', $body)) {
                            $warningMsg = "🌋 VOLCANIC ALERT: PHIVOLCS has raised the alert status for Kanlaon Volcano. Prepare for possible ashfall and evacuation.";
                        }
                    }
                } catch (\Exception $e) {
                    $this->warn("Phivolcs check failed: " . $e->getMessage());
                }
            }

            // 3. Check PAGASA Tropical Cyclone (Hourly)
            if (!$warningMsg) {
                $this->info("Checking PAGASA Tropical Cyclones...");
                try {
                    $rssUrl = 'http://publicalert.pagasa.dost.gov.ph/feeds/';
                    $response = Http::timeout(5)->get($rssUrl);
                    if ($response->successful()) {
                        $xml = @simplexml_load_string($response->body());
                        if ($xml) {
                            $capUrl = null;
                            foreach ($xml->entry ?? [] as $entry) {
                                $title = (string) $entry->title;
                                if (stripos($title, 'TCB') !== false || stripos($title, 'Tropical Cyclone') !== false) {
                                    foreach ($entry->link ?? [] as $link) {
                                        if ((string) $link['type'] === 'application/cap+xml') {
                                            $capUrl = (string) $link['href'];
                                            break 2;
                                        }
                                    }
                                }
                            }

                            if ($capUrl) {
                                $capRes = Http::timeout(5)->get($capUrl);
                                if ($capRes->successful()) {
                                    $cap = @simplexml_load_string($capRes->body());
                                    if ($cap && isset($cap->info)) {
                                        $desc = (string) $cap->info->description;
                                        $headline = (string) $cap->info->headline;
                                        
                                        $name = 'CYCLONE';
                                        if (preg_match('/(Tropical Depression|Tropical Storm|Severe Tropical Storm|Typhoon|Super Typhoon)\s+([A-Z]+)/i', $headline, $m) || preg_match('/(Tropical Depression|Tropical Storm|Severe Tropical Storm|Typhoon|Super Typhoon)\s+([A-Z]+)/i', $desc, $m)) {
                                            $name = strtoupper($m[2]);
                                        }
                                        
                                        $location = 'PAR';
                                        if (preg_match('/was estimated based on all available data at ([^.]+)/i', $desc, $m) || preg_match('/located at ([^.]+)/i', $desc, $m)) {
                                            $location = trim($m[1]);
                                        }
                                        
                                        $wind = 'Unknown';
                                        if (preg_match('/winds of ([0-9]+\s*km\/h)/i', $desc, $m)) {
                                            $wind = $m[1];
                                        }
                                        
                                        $gust = 'Unknown';
                                        if (preg_match('/gustiness of up to ([0-9]+\s*km\/h)/i', $desc, $m)) {
                                            $gust = $m[1];
                                        }

                                        $warningMsg = "🌀 TROPICAL CYCLONE UPDATE: {$name} is located at {$location}. Winds: {$wind}, Gusts: up to {$gust}.";
                                        $duration = 60; // Hourly notifications for cyclones
                                    }
                                }
                            }
                        }
                    }
                } catch (\Exception $e) {
                    $this->warn("PAGASA Cyclone check failed: " . $e->getMessage());
                }
            }

            // 4. Check Open-Meteo Rain if no higher priority warning
            if (!$warningMsg) {
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
                        
                        $this->info("Current precipitation rate: {$precipitation} mm/hr, Prob: {$prob}%");
                        
                        if ($precipitation > 30.0) {
                            $warningMsg = "🔴 PAGASA RED RAINFALL WARNING: {$precipitation} mm/hr detected. Severe flooding expected in low-lying areas of Binalbagan.";
                        } elseif ($precipitation > 15.0) {
                            $warningMsg = "🟠 PAGASA ORANGE RAINFALL WARNING: {$precipitation} mm/hr detected. Flooding is threatening Binalbagan.";
                        } elseif ($precipitation > 7.5) {
                            $warningMsg = "🟡 PAGASA YELLOW RAINFALL WARNING: {$precipitation} mm/hr detected. Flooding is possible in Binalbagan.";
                        } elseif ($prob > 80) {
                            $warningMsg = "🌧️ HEAVY RAIN ADVISORY: {$prob}% chance of heavy rain in Binalbagan. Please bring an umbrella and stay safe.";
                        } elseif ($prob > 50) {
                            $warningMsg = "☔ SCATTERED RAIN: {$prob}% chance of thunderstorms in Binalbagan today.";
                        }
                        
                        if ($warningMsg) {
                            $duration = 30; // 30 minutes cache for rain advisories
                        }
                    }
                } catch (\Exception $e) {
                    $this->warn("Open-Meteo check failed: " . $e->getMessage());
                }
            }
        }

        if ($warningMsg) {
            $currentBroadcast = Cache::get('active_broadcast');
            $currentMsg = is_array($currentBroadcast) ? ($currentBroadcast['message'] ?? '') : ($currentBroadcast ?? '');
            
            if ($warningMsg !== $currentMsg) {
                $this->warn("NEW THREAT DETECTED. Sending Background Push Notification: " . $warningMsg);
                
                // Trigger Firebase Push Notifications in the background!
                try {
                    $tokens = \App\Models\User::whereNotNull('fcm_token')->pluck('fcm_token')->toArray();
                    
                    if (!empty($tokens)) {
                        $factory = (new \Kreait\Firebase\Factory)->withServiceAccount(base_path('firebase_credentials.json'));
                        $messaging = $factory->createMessaging();
                        $title = '🚨 DISASTER ALERT';
                        if (str_contains($warningMsg, 'RAIN') || str_contains($warningMsg, 'ADVISORY')) {
                            $title = '🌧️ Rain Advisory';
                        }
                        $notification = \Kreait\Firebase\Messaging\Notification::create($title, $warningMsg);
                        
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
                            ->withAndroidConfig($config);
                        
                        $messaging->sendMulticast($cloudMessage, $tokens);
                        $this->info("Push notifications sent successfully to " . count($tokens) . " devices.");
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Background Firebase Push Failed: ' . $e->getMessage());
                    $this->warn("FCM Failed: " . $e->getMessage());
                }
            } else {
                $this->info("Threat is already active. Skipping duplicate push notification.");
            }

            $broadcast = ['id' => uniqid('monitor_'), 'message' => $warningMsg];
            Cache::put('active_broadcast', $broadcast, now()->addMinutes($duration));
        } else {
            $this->info("No active weather or seismic threats. System Normal.");
            $currentBroadcast = Cache::get('active_broadcast');
            $msg = is_array($currentBroadcast) ? ($currentBroadcast['message'] ?? '') : ($currentBroadcast ?? '');
            if ($msg && (str_contains($msg, 'PAGASA') || str_contains($msg, 'EARTHQUAKE') || str_contains($msg, 'VOLCANIC'))) {
                Cache::forget('active_broadcast');
            }
        }
        
        return Command::SUCCESS;
    }
}
