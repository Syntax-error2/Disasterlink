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
        $now = \Carbon\Carbon::now('Asia/Manila');
        // We only want to send this during the 8 PM hour (20:00 - 20:59)
        if ($now->hour !== 20) {
            $this->info("It's not 8 PM yet. Current hour: {$now->hour}");
            return Command::SUCCESS;
        }

        $cacheKey = 'daily_weather_sent_' . $now->format('Y-m-d');
        if (\Illuminate\Support\Facades\Cache::has($cacheKey)) {
            $this->info("Daily digest already sent for today.");
            return Command::SUCCESS;
        }

        $lgus = \App\Models\Lgu::all();
        $factory = (new Factory)->withServiceAccount(base_path('firebase_credentials.json'));
        $messaging = $factory->createMessaging();

        foreach ($lgus as $lgu) {
            $latitude = $lgu->latitude;
            $longitude = $lgu->longitude;
            $this->info("Fetching daily weather digest for {$lgu->name}...");

            try {
                $response = Http::timeout(10)->get("https://api.open-meteo.com/v1/forecast", [
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'current' => ['temperature_2m', 'precipitation_probability', 'weather_code'],
                    'daily' => ['temperature_2m_max', 'apparent_temperature_max', 'precipitation_sum'],
                    'timezone' => 'Asia/Manila',
                    'forecast_days' => 2
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    
                    $tonightRain = $data['current']['precipitation_probability'] ?? 0;
                    $tomorrowMaxTemp = $data['daily']['temperature_2m_max'][1] ?? null;
                    $tomorrowRainSum = $data['daily']['precipitation_sum'][1] ?? 0;
                    
                    $heatIndex = $data['daily']['apparent_temperature_max'][1] ?? ($tomorrowMaxTemp ? round($tomorrowMaxTemp + 3.0) : null); 
                    if ($heatIndex) {
                        $heatIndex = round($heatIndex);
                    }

                    $tonightText = $tonightRain > 30 ? "Expect scattered rain tonight ({$tonightRain}% chance)." : "Clear skies expected tonight.";
                    $tomorrowText = $tomorrowRainSum > 5.0 ? "Rain expected tomorrow." : "Generally dry tomorrow.";
                    $heatText = $heatIndex ? "PAGASA Heat Index: {$heatIndex}°C." : "";

                    $messageText = "🌙 {$tonightText} {$tomorrowText} {$heatText}";

                    $tokens = \App\Models\User::where('lgu_id', $lgu->id)->whereNotNull('fcm_token')->pluck('fcm_token')->toArray();
                    
                    if (!empty($tokens)) {
                        $notification = Notification::create("🌤️ Daily Weather Digest - {$lgu->name}", $messageText);
                        
                        $config = AndroidConfig::fromArray([
                            'priority' => 'normal',
                            'notification' => [
                                'channel_id' => 'general_announcements',
                                'sound' => 'default',
                            ],
                        ]);

                        $cloudMessage = CloudMessage::new()
                            ->withNotification($notification)
                            ->withAndroidConfig($config);
                        
                        $messaging->sendMulticast($cloudMessage, $tokens);
                        $this->info("Daily Digest pushed to " . count($tokens) . " devices in {$lgu->name}.");
                    } else {
                        $this->info("No FCM tokens found for {$lgu->name}.");
                    }
                } else {
                    $this->error("Failed to fetch Open-Meteo data for {$lgu->name}.");
                }
            } catch (\Exception $e) {
                $this->error("Error sending Daily Digest for {$lgu->name}: " . $e->getMessage());
            }
        }

        \Illuminate\Support\Facades\Cache::put($cacheKey, true, now()->addDays(1));

        return Command::SUCCESS;
    }
}
