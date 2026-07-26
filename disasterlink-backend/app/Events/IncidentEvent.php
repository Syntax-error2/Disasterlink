<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class IncidentEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $type;
    public $incident;

    public function __construct(string $type, $incident)
    {
        $this->type = $type;
        $this->incident = $incident;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('incidents'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'incident.event';
    }
}
