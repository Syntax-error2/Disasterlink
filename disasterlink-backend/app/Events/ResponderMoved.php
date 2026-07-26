<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ResponderMoved implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $responder;

    public function __construct($responder)
    {
        $this->responder = $responder;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('responders'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'responder.moved';
    }
}
