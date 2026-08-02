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

            // 3. Check Open-Meteo Rain if no higher priority warning
            if (!$warningMsg) {
                $this->info("Checking Open-Meteo Weather...");
                try {
                    $weather = Http::timeout(5)->get("https://api.open-meteo.com/v1/forecast", [
                        'latitude' => $latitude,
                        'longitude' => $longitude,
                        'current' => 'precipitation',
                    ]);
                    
                    if ($weather->successful()) {
                        $precipitation = $weather->json()['current']['precipitation'] ?? 0;
                        $this->info("Current precipitation rate: {$precipitation} mm/hr");
                        
                        if ($precipitation > 30.0) {
                            $warningMsg = "🔴 PAGASA RED RAINFALL WARNING: Severe flooding expected in low-lying areas of Binalbagan.";
                        } elseif ($precipitation > 15.0) {
                            $warningMsg = "🟠 PAGASA ORANGE RAINFALL WARNING: Flooding is threatening Binalbagan.";
                        } elseif ($precipitation > 7.5) {
                            $warningMsg = "🟡 PAGASA YELLOW RAINFALL WARNING: Flooding is possible in Binalbagan.";
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
                        $notification = \Kreait\Firebase\Messaging\Notification::create('🚨 DISASTER ALERT', $warningMsg);
                        
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
