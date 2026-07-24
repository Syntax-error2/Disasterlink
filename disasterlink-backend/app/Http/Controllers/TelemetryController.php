<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class TelemetryController extends Controller
{
    public function index()
    {
        $weather = null;
        try {
            $weather = Http::timeout(8)->get("https://api.open-meteo.com/v1/forecast?latitude=10.1866&longitude=122.8587&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,surface_pressure,precipitation_probability&hourly=precipitation,precipitation_probability&timezone=Asia%2FManila&forecast_days=2")->json();
        } catch (\Exception $e) {}

        $gdacs = null;
        try {
            $gdacs = Http::timeout(3)->get("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH")->json();
        } catch (\Exception $e) {}

        $usgs = null;
        try {
            $usgs = Http::timeout(3)->get("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson")->json();
        } catch (\Exception $e) {}

        // Real-Time PAGASA Local Telemetry Scraper
        $pagasa = ['active' => false];
        try {
            // In a production environment, this would be a cron job hitting the PAGASA website.
            // For local demonstration and real-time accuracy, we read from the telemetry feed file 
            // which can be dynamically updated by external meteorology scripts.
            $telemetryPath = public_path('telemetry/pagasa.json');
            if (file_exists($telemetryPath)) {
                $pagasa = json_decode(file_get_contents($telemetryPath), true);
            }
        } catch (\Exception $e) {}

        return response()->json([
            'weather' => $weather,
            'gdacs' => $gdacs,
            'usgs' => $usgs,
            'pagasa' => $pagasa
        ], 200);
    }

    public function aiPredictions()
    {
        // Mock AI prediction based on historical data + current telemetry
        // We'll return a "High Risk" polygon array for the GIS map.
        $predictions = [
            [
                'id' => 'PRED-1',
                'type' => 'Flood',
                'risk_level' => 'Critical (85% Probability)',
                'time_to_impact' => '2 Hours',
                'barangay' => 'Sto. Rosario (Low Elevation Zone)',
                'polygon' => [
                    [10.1915, 122.8610],
                    [10.1915, 122.8645],
                    [10.1885, 122.8645],
                    [10.1885, 122.8610],
                ]
            ]
        ];

        return response()->json($predictions, 200);
    }
}
