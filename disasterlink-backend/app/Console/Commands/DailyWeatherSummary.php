<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;
use Kreait\Firebase\Messaging\AndroidConfig;

class DailyWeatherSummary extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'disasterlink:daily-weather-summary';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send daily evening weather and heat index digest via FCM';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info("Fetching daily weather digest for Binalbagan...");

        // Coordinates for Binalbagan
        $latitude = 10.1911;
        $longitude = 122.8601;

        try {
            // We fetch the current weather and daily max for tomorrow
            $response = Http::timeout(10)->get("https://api.open-meteo.com/v1/forecast", [
                'latitude' => $latitude,
                'longitude' => $longitude,
                'current' => ['temperature_2m', 'precipitation_probability', 'weather_code'],
                'daily' => ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum'],
                'timezone' => 'Asia/Manila',
                'forecast_days' => 2
            ]);

            if ($response->successful()) {
                $data = $response->json();
                
                $tonightRain = $data['current']['precipitation_probability'] ?? 0;
                $tomorrowMaxTemp = $data['daily']['temperature_2m_max'][1] ?? null;
                $tomorrowRainSum = $data['daily']['precipitation_sum'][1] ?? 0;
                
                // We calculate a basic heat index estimation (feels like) based on typical PH humidity
                $heatIndex = $tomorrowMaxTemp ? round($tomorrowMaxTemp + 3.0) : null; 

                $tonightText = $tonightRain > 30 ? "Expect scattered rain tonight ({$tonightRain}% chance)." : "Clear skies expected tonight.";
                $tomorrowText = $tomorrowRainSum > 5.0 ? "Rain expected tomorrow." : "Generally dry tomorrow.";
                $heatText = $heatIndex ? "Expected Heat Index: {$heatIndex}°C." : "";

                $messageText = "🌙 {$tonightText} {$tomorrowText} {$heatText}";

                $tokens = \App\Models\User::whereNotNull('fcm_token')->pluck('fcm_token')->toArray();
                
                if (!empty($tokens)) {
                    $factory = (new Factory)->withServiceAccount(base_path('firebase_credentials.json'));
                    $messaging = $factory->createMessaging();
                    $notification = Notification::create('🌤️ Daily Weather Digest', $messageText);
                    
                    $config = AndroidConfig::fromArray([
                        'priority' => 'normal',
                        'notification' => [
                            'channel_id' => 'general_announcements', // Different channel so it doesn't sound like an emergency!
                            'sound' => 'default',
                        ],
                    ]);

                    $cloudMessage = CloudMessage::new()
                        ->withNotification($notification)
                        ->withAndroidConfig($config);
                    
                    $messaging->sendMulticast($cloudMessage, $tokens);
                    $this->info("Daily Digest pushed to " . count($tokens) . " devices: " . $messageText);
                } else {
                    $this->info("No FCM tokens found.");
                }
            } else {
                $this->error("Failed to fetch Open-Meteo data.");
            }
        } catch (\Exception $e) {
            $this->error("Error sending Daily Digest: " . $e->getMessage());
        }

        return Command::SUCCESS;
    }
}
