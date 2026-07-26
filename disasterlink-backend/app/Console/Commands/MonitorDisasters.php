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
            $usgs = Http::get("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson");
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
                $weather = Http::get("https://api.open-meteo.com/v1/forecast", [
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
            }
        }

        if ($warningMsg) {
            $this->warn("Broadcasting: " . $warningMsg);
            Cache::put('active_broadcast', $warningMsg, now()->addMinutes($duration));
        } else {
            $this->info("No active weather or seismic threats. System Normal.");
            $currentBroadcast = Cache::get('active_broadcast');
            if ($currentBroadcast && (str_contains($currentBroadcast, 'PAGASA') || str_contains($currentBroadcast, 'EARTHQUAKE') || str_contains($currentBroadcast, 'VOLCANIC'))) {
                Cache::forget('active_broadcast');
            }
        }
        
        return Command::SUCCESS;
    }
}
