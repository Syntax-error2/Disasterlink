<?php

namespace App\Http\Controllers;

use App\Models\IncidentReport;
use Illuminate\Http\Request;

class IncidentReportController extends Controller
{
    public function index()
    {
        try {
            $incidents = IncidentReport::orderBy('created_at', 'desc')->get();
            return response()->json($incidents, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $imagePath = null;
            if ($request->hasFile('image')) {
                $path = $request->file('image')->store('incidents', 'public');
                $imagePath = url('storage/' . $path);
            }
            
            $imageData = $request->input('image_data');
            if ($imageData && strpos($imageData, 'data:image') === 0) {
                // Decode base64 and save to storage/incidents/ to bypass MySQL max_allowed_packet
                $base64Data = substr($imageData, strpos($imageData, ',') + 1);
                $decodedData = base64_decode($base64Data);
                $filename = 'incidents/' . uniqid() . '.jpg';
                \Illuminate\Support\Facades\Storage::disk('public')->put($filename, $decodedData);
                $imagePath = url('storage/' . $filename);
                $imageData = null; // Do not insert the massive string into the DB!
            }

            $barangay = $request->input('reporting_barangay', 'Unknown');
            $isSOS = $request->input('incident_type') === 'SOS Emergency';
            
            $recentIncident = IncidentReport::where('reporting_barangay', $barangay)
                ->where('created_at', '>=', now()->subMinutes(15))
                ->orderBy('created_at', 'desc')
                ->first();

            if ($recentIncident) {
                if ($isSOS && $recentIncident->incident_type !== 'SOS Emergency') {
                    $recentIncident->update([
                        'severity_level' => 'Critical',
                        'incident_type' => 'SOS Emergency',
                        'latitude' => $request->input('latitude') ?: $recentIncident->latitude,
                        'longitude' => $request->input('longitude') ?: $recentIncident->longitude,
                        'details' => $recentIncident->details . " [ESCALATED BY SOS PING from " . $request->input('exact_location', 'Unknown') . "]",
                    ]);
                    return response()->json(['message' => 'SOS Merged!', 'id' => $recentIncident->id], 200);
                } else if (!$isSOS && $recentIncident->incident_type === 'SOS Emergency') {
                    $recentIncident->update([
                        'exact_location' => $request->input('exact_location', $recentIncident->exact_location),
                        'details' => $recentIncident->details . "\n" . $request->input('details', 'No narrative provided.'),
                        'image_data' => $imageData ?: $recentIncident->image_data,
                        'image_path' => $imagePath ?: $recentIncident->image_path,
                    ]);
                    return response()->json(['message' => 'Report Merged!', 'id' => $recentIncident->id], 200);
                }
            }

            $incident = IncidentReport::create([
                'reporting_barangay' => $barangay,
                'incident_type'      => $request->input('incident_type', 'Fire'),
                'severity_level'     => $request->input('severity_level', 'High'),
                'exact_location'     => $request->input('exact_location', 'GPS Ping'),
                'latitude'           => $request->input('latitude'),
                'longitude'          => $request->input('longitude'),
                'details'            => $request->input('details', 'No narrative provided.'),
                'image_data'         => $imageData,
                'image_path'         => $imagePath,
                'status'             => $request->input('status', 'Pending Review'),
            ]);
            
            return response()->json(['message' => 'Incident created!', 'id' => $incident->id], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $incident = IncidentReport::findOrFail($id);
        $incident->update($request->all());
        return response()->json($incident, 200);
    }

    public function verify($id)
    {
        try {
            $incident = IncidentReport::findOrFail($id);
            $incident->increment('verifications');
            
            // If it hits 3 verifications, upgrade severity/status
            if ($incident->verifications >= 3 && $incident->status !== 'Resolved' && !str_starts_with($incident->status, 'Dispatched:')) {
                $incident->update([
                    'severity_level' => 'Critical',
                    'status' => 'Verified / Critical'
                ]);
            }
            
            return response()->json($incident, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
