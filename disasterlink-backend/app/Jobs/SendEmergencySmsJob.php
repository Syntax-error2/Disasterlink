<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendEmergencySmsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $message;
    public $recipients;

    /**
     * Create a new job instance.
     */
    public function __construct($message, $recipients)
    {
        $this->message = $message;
        $this->recipients = $recipients;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Log::info("=========================================");
        Log::info("🚨 EMERGENCY SMS BROADCAST DISPATCHED");
        Log::info("Message: " . $this->message);
        Log::info("Total Recipients: " . count($this->recipients));
        Log::info("-----------------------------------------");
        
        foreach ($this->recipients as $phone) {
            // In production, this is where the Twilio API request happens
            // e.g., $twilio->messages->create($phone, ['from' => $twilloNumber, 'body' => $this->message]);
            Log::info("SMS sent to: " . $phone);
        }
        
        Log::info("=========================================");
    }
}
