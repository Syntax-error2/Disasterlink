<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use App\Models\Lgu;
use App\Models\User;
use App\Jobs\SendPushNotificationJob;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

class DailyWeatherSummary extends Command
{
    protected $signature = 'disasterlink:daily-weather-summary';
    protected $description = 'Send daily evening weather and heat index digest via FCM';

    public function handle()
    {
        $now = Carbon::now('Asia/Manila');
        $cacheKey = 'daily_weather_sent_' . $now->format('Y-m-d');
        if (Cache::has($cacheKey)) {
            $this->info("Daily digest already sent for today.");
            return Command::SUCCESS;
        }

        try {
            $lgus = Lgu::all();
        } catch (\Exception $e) {
            $this->error("Database connection failed. Cannot fetch LGUs.");
            return Command::FAILURE;
        }

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
                    $title = "Daily Weather Digest - {$lgu->name}";

                    $tokens = User::where('lgu_id', $lgu->id)->whereNotNull('fcm_token')->pluck('fcm_token')->toArray();
                    
                    if (!empty($tokens)) {
                        dispatch(new SendPushNotificationJob($tokens, $title, $messageText, 'general_announcements'));
                        $this->info("Dispatched Daily Digest for {$lgu->name}.");
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

        Cache::put($cacheKey, true, now()->addDays(1));

        return Command::SUCCESS;
    }
}
