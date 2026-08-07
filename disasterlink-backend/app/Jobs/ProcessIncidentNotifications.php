<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

use App\Models\IncidentReport;
use App\Models\User;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;
use Kreait\Firebase\Messaging\AndroidConfig;
use Illuminate\Support\Facades\Log;

class ProcessIncidentNotifications implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $incident;

    /**
     * Create a new job instance.
     */
    public function __construct(IncidentReport $incident)
    {
        $this->incident = $incident;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            // Find Kap, Rep, and Responder in the reporting barangay
            $tokens = User::whereNotNull('fcm_token')
                ->whereIn('role', ['barangay_captain', 'responder', 'representative'])
                ->where(function ($query) {
                    $query->where('assigned_barangay', 'LIKE', '%' . $this->incident->reporting_barangay . '%')
                          ->orWhere('barangay', 'LIKE', '%' . $this->incident->reporting_barangay . '%');
                })
                ->pluck('fcm_token')
                ->toArray();

            if (!empty($tokens)) {
                $factory = (new Factory)->withServiceAccount(base_path('firebase_credentials.json'));
                $messaging = $factory->createMessaging();
                
                $title = '🚨 NEW INCIDENT: ' . $this->incident->incident_type;
                $body = 'Location: ' . $this->incident->exact_location;

                $notification = Notification::create($title, $body);
                
                $config = AndroidConfig::fromArray([
                    'priority' => 'high',
                    'notification' => [
                        'channel_id' => 'emergency_alerts',
                        'sound' => 'default',
                        'default_vibrate_timings' => true,
                        'default_light_settings' => true,
                    ],
                ]);

                $cloudMessage = CloudMessage::new()
                    ->withNotification($notification)
                    ->withAndroidConfig($config);
                
                $messaging->sendMulticast($cloudMessage, $tokens);
                Log::info('FCM Incident Push Sent to ' . count($tokens) . ' responders.');
            }
        } catch (\Exception $e) {
            Log::error('FCM Incident Push Failed: ' . $e->getMessage());
        }
    }
}
