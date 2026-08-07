<?php

namespace App\Http\Controllers;

use App\Models\IncidentReport;
use Illuminate\Http\Request;
use App\Events\IncidentEvent;

class IncidentReportController extends Controller
{
    public function sync()
    {
            $this->clearIncidentCaches();
        return $this->index();
    }

    public function index()
    {
        try {
            $lguId = auth()->check() ? auth()->user()->lgu_id : 'guest';
            $incidents = \Illuminate\Support\Facades\Cache::remember('incidents_lgu_' . $lguId, 600, function () {
                // Select specific columns to dramatically reduce JSON payload size and speed up rendering
                return IncidentReport::with('user:id,name,phone')->select(['id', 'user_id', 'reporting_barangay', 'incident_type', 'severity_level', 'exact_location', 'latitude', 'longitude', 'status', 'created_at', 'verifications', 'image_path'])->orderBy('created_at', 'desc')->take(500)->get()->toArray();
            });
            return response()->json($incidents, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function safeBroadcast($event)
    {
        try {
            event($event);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Broadcast failed: ' . $e->getMessage());
        }
    }

    private function clearIncidentCaches()
    {
        \Illuminate\Support\Facades\Cache::forget('incidents_lgu_guest');
        \Illuminate\Support\Facades\Cache::forget('incidents_lgu_'); // For citizens (lgu_id = null)
        
        $lgus = \App\Models\Lgu::pluck('id');
        foreach ($lgus as $lgu) {
            \Illuminate\Support\Facades\Cache::forget('incidents_lgu_' . $lgu);
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
                $base64Parts = explode(',', $imageData);
                if (count($base64Parts) === 2) {
                    $mimePart = explode(';', $base64Parts[0])[0];
                    $mime = str_replace('data:', '', $mimePart);
                    
                    // Validate basic MIME type
                    if (in_array($mime, ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'])) {
                        $decodedData = base64_decode($base64Parts[1]);
                        
                        // Strict validation using finfo
                        $finfo = finfo_open(FILEINFO_MIME_TYPE);
                        $actualMime = finfo_buffer($finfo, $decodedData);
                        finfo_close($finfo);
                        
                        if (in_array($actualMime, ['image/jpeg', 'image/png', 'image/webp'])) {
                            $extension = explode('/', $actualMime)[1];
                            if ($extension === 'jpeg') $extension = 'jpg';
                            
                            $filename = 'incidents/' . uniqid() . '.' . $extension;
                            \Illuminate\Support\Facades\Storage::disk('public')->put($filename, $decodedData);
                            $imagePath = url('storage/' . $filename);
                            $imageData = null; // Do not insert the massive string into the DB!
                        } else {
                            return response()->json(['error' => 'Invalid image file signature'], 400);
                        }
                    } else {
                        return response()->json(['error' => 'Unsupported image format'], 400);
                    }
                }
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
                    $this->safeBroadcast(new IncidentEvent('updated', $recentIncident));
            $this->clearIncidentCaches();
                    return response()->json(['message' => 'SOS Merged!', 'id' => $recentIncident->id], 200);
                } else if (!$isSOS && $recentIncident->incident_type === 'SOS Emergency') {
                    $recentIncident->update([
                        'exact_location' => $request->input('exact_location', $recentIncident->exact_location),
                        'details' => $recentIncident->details . "\n" . $request->input('details', 'No narrative provided.'),
                        'image_data' => $imageData ?: $recentIncident->image_data,
                        'image_path' => $imagePath ?: $recentIncident->image_path,
                    ]);
                    $this->safeBroadcast(new IncidentEvent('updated', $recentIncident));
            $this->clearIncidentCaches();
                    return response()->json(['message' => 'Report Merged!', 'id' => $recentIncident->id], 200);
                }
            }

            $incident = IncidentReport::create([
                'user_id'            => auth()->check() ? auth()->id() : null,
                'lgu_id'             => auth()->check() ? auth()->user()->lgu_id : null,
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
            
            $this->safeBroadcast(new IncidentEvent('created', $incident));
            $this->clearIncidentCaches();
            
            return response()->json(['message' => 'Incident created!', 'id' => $incident->id], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $incident = IncidentReport::findOrFail($id);
        
        $validatedData = $request->only([
            'incident_type', 
            'severity_level', 
            'exact_location', 
            'latitude', 
            'longitude', 
            'details', 
            'status'
        ]);
        
        $incident->update($validatedData);
        $this->safeBroadcast(new IncidentEvent('updated', $incident));
            $this->clearIncidentCaches();
        return response()->json($incident, 200);
    }

    public function verify(Request $request, $id)
    {
        try {
            $incident = IncidentReport::findOrFail($id);
            $user = auth()->user();
            
            $incident->increment('verifications');
            
            // Check if user is a representative/responder
            if ($user && in_array($user->role, ['responder', 'admin', 'barangay_captain'])) {
                $escalation = $request->input('escalation_target', 'mdrrmo');
                
                $statusStr = $escalation === 'kap' ? 'Verified / Escalated to Kap' : 'Verified / Critical';
                
                $incident->update([
                    'severity_level' => 'Critical',
                    'status' => $statusStr
                ]);
            } else {
                // Standard Citizen Verification Rule
                if ($incident->verifications >= 3 && $incident->status !== 'Resolved' && !str_starts_with($incident->status, 'Dispatched:')) {
                    $incident->update([
                        'severity_level' => 'Critical',
                        'status' => 'Verified / Critical'
                    ]);
                }
            }
            
            $this->safeBroadcast(new IncidentEvent('updated', $incident));
            $this->clearIncidentCaches();
            return response()->json($incident, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $incident = IncidentReport::findOrFail($id);
            $incident->delete();
            $this->safeBroadcast(new IncidentEvent('deleted', ['id' => $id]));
            $this->clearIncidentCaches();
            return response()->json(['message' => 'Incident deleted successfully'], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
