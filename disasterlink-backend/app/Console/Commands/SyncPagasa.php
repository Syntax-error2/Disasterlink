<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SyncPagasa extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'telemetry:sync-pagasa';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fetch and parse the official PAGASA CAP RSS feed to automate active cyclone tracking.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting PAGASA Telemetry Sync...');
        
        $rssUrl = 'http://publicalert.pagasa.dost.gov.ph/feeds/';
        $telemetryPath = public_path('telemetry/pagasa.json');

        try {
            $response = Http::timeout(15)->get($rssUrl);
            
            if (!$response->successful()) {
                $this->error('Failed to fetch PAGASA RSS feed.');
                return;
            }

            $xml = simplexml_load_string($response->body());
            
            if (!$xml || !isset($xml->entry)) {
                $this->info('No active entries found in PAGASA feed.');
                $this->clearActiveCyclone($telemetryPath);
                return;
            }

            $activeCyclone = false;
            $capUrl = null;

            // Scan all active entries in the government feed for a Tropical Cyclone Bulletin (TCB)
            foreach ($xml->entry as $entry) {
                $title = (string)$entry->title;
                if (stripos($title, 'TCB') !== false || stripos($title, 'Tropical Cyclone') !== false) {
                    $activeCyclone = true;
                    // Extract the .cap XML link
                    foreach ($entry->link as $link) {
                        if ((string)$link['type'] === 'application/cap+xml') {
                            $capUrl = (string)$link['href'];
                            break;
                        }
                    }
                    break; // Just grab the most recent/highest priority one found
                }
            }

            if ($activeCyclone && $capUrl) {
                $this->info("Active Cyclone Detected! Fetching CAP data: {$capUrl}");
                $this->processCapFile($capUrl, $telemetryPath);
            } else {
                $this->info('No Tropical Cyclone Bulletins active.');
                $this->clearActiveCyclone($telemetryPath);
            }

        } catch (\Exception $e) {
            $this->error('Error syncing PAGASA: ' . $e->getMessage());
            Log::error('PAGASA Sync Error: ' . $e->getMessage());
        }
    }

    private function processCapFile($capUrl, $telemetryPath)
    {
        try {
            $response = Http::timeout(10)->get($capUrl);
            if (!$response->successful()) return;

            $xml = simplexml_load_string($response->body());
            if (!$xml) return;

            // CAP format parsing: <alert><info><headline>, <description>, etc.
            // Note: PAGASA CAP feeds can be complex. We extract what we can safely.
            $info = $xml->info;
            $headline = (string)$info->headline;
            $description = (string)$info->description;
            
            // Fallbacks in case regex fails
            $name = "Active Cyclone";
            $category = "Tropical Cyclone";
            
            // Try to regex extract the name (e.g. "Tropical Depression LUIS")
            if (preg_match('/(Tropical Depression|Tropical Storm|Severe Tropical Storm|Typhoon|Super Typhoon)\s+([A-Z]+)/i', $headline, $matches)) {
                $category = $matches[1];
                $name = strtoupper($matches[2]);
            } else if (preg_match('/(Tropical Depression|Tropical Storm|Severe Tropical Storm|Typhoon|Super Typhoon)\s+([A-Z]+)/i', $description, $matches)) {
                $category = $matches[1];
                $name = strtoupper($matches[2]);
            }

            // Construct standard object for our frontend
            $effective = (string)$info->effective;
            $data = [
                'active' => true,
                'name' => $name,
                'category' => $category,
                'former_name' => 'N/A', // Not always provided cleanly in CAP
                'location' => 'Philippine Area of Responsibility (See PAGASA)',
                'wind_gust' => 'See Official Bulletin',
                'movement' => 'See Official Bulletin',
                'issued_at' => !empty($effective) ? date('h:i A d M Y', strtotime($effective)) : now()->format('h:i A d M Y')
            ];

            file_put_contents($telemetryPath, json_encode($data, JSON_PRETTY_PRINT));
            $this->info("Successfully updated pagasa.json for {$category} {$name}");

        } catch (\Exception $e) {
            $this->error('Failed parsing CAP: ' . $e->getMessage());
        }
    }

    private function clearActiveCyclone($telemetryPath)
    {
        $data = ['active' => false];
        file_put_contents($telemetryPath, json_encode($data, JSON_PRETTY_PRINT));
        $this->info('Cleared pagasa.json to active: false');
    }
}
