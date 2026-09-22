<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;
use Kreait\Firebase\Messaging\AndroidConfig;
use Illuminate\Support\Facades\Log;

class SendPushNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $tokens;
    protected $title;
    protected $body;
    protected $channelId;
    protected $dataPayload;

    /**
     * Create a new job instance.
     *
     * @param array $tokens Array of FCM tokens.
     * @param string $title Notification title.
     * @param string $body Notification body.
     * @param string $channelId Android notification channel ID (e.g. 'emergency_alerts', 'general_announcements')
     * @param array $dataPayload Additional data payload to send with the notification.
     */
    public function __construct(array $tokens, string $title, string $body, string $channelId = 'emergency_alerts', array $dataPayload = [])
    {
        $this->tokens = $tokens;
        $this->title = $title;
        $this->body = $body;
        $this->channelId = $channelId;
        $this->dataPayload = $dataPayload;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Don't process if no tokens
        if (empty($this->tokens)) {
            return;
        }

        try {
            $factory = (new Factory)->withServiceAccount(base_path('firebase_credentials.json'));
            $messaging = $factory->createMessaging();
            
            // Clean emojis from title to prevent Android parsing errors
            $cleanTitle = str_replace(['🚨', '🌧️', '🌀'], '', $this->title);
            $cleanTitle = trim($cleanTitle);

            $notification = Notification::create($cleanTitle, $this->body);
            
            $config = AndroidConfig::fromArray([
                'priority' => 'high',
                'notification' => [
                    'channel_id' => $this->channelId,
                    'sound' => 'default',
                    'default_vibrate_timings' => true,
                    'default_light_settings' => true,
                ],
            ]);

            // Always merge title, body, and channel_id into data payload for the mobile app to consume
            $data = array_merge([
                'title' => $cleanTitle,
                'body' => $this->body,
                'channel_id' => $this->channelId
            ], $this->dataPayload);

            $cloudMessage = CloudMessage::new()
                ->withNotification($notification)
                ->withAndroidConfig($config)
                ->withData($data);
            
            // Chunk tokens to max 500 (Firebase Multicast limit)
            $tokenChunks = array_chunk($this->tokens, 500);
            
            foreach ($tokenChunks as $chunk) {
                $report = $messaging->sendMulticast($cloudMessage, $chunk);
                Log::info('FCM Push Sent (' . count($chunk) . ' recipients). Success: ' . $report->successes()->count() . ', Failures: ' . $report->failures()->count());
                
                if ($report->failures()->count() > 0) {
                    foreach ($report->failures() as $failure) {
                        Log::error('Firebase Token Failure: ' . $failure->error()->getMessage());
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error('FCM Push Job Failed: ' . $e->getMessage());
        }
    }
}
