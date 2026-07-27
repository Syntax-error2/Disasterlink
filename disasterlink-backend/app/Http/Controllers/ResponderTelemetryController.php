<?php

namespace App\Http\Controllers;

use App\Models\ResponderTelemetry;
use Illuminate\Http\Request;
use App\Events\ResponderMoved;

class ResponderTelemetryController extends Controller
{
    public function index()
    {
        try {
            $telemetry = \Illuminate\Support\Facades\Cache::remember('responder_locations', 600, function () {
                return ResponderTelemetry::all()->toArray();
            });
            return response()->json($telemetry, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function ping(Request $request)
    {
        try {
            $unit_name = $request->input('unit_name');
            $lat = $request->input('lat');
            $lng = $request->input('lng');
            $status = $request->input('status', 'Available');

            $telemetry = ResponderTelemetry::updateOrCreate(
                ['unit_name' => $unit_name],
                ['lat' => $lat, 'lng' => $lng, 'status' => $status]
            );

            event(new ResponderMoved($telemetry));
            \Illuminate\Support\Facades\Cache::forget('responder_locations');

            return response()->json($telemetry, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
