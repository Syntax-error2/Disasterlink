<?php

namespace App\Http\Controllers;

use App\Models\DeploymentTeam;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TeamController extends Controller
{
    public function index()
    {
        $lguId = auth()->user()->lgu_id;
        $teams = DeploymentTeam::where('lgu_id', $lguId)
            ->with(['responders' => function ($query) {
                $query->select('id', 'name', 'phone', 'team_id');
            }])
            ->orderBy('name')
            ->get();
            
        return response()->json($teams);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'nullable|string|max:255',
        ]);

        $team = DeploymentTeam::create([
            'lgu_id' => auth()->user()->lgu_id,
            'name' => $request->name,
            'category' => $request->category,
            'status' => 'Active',
        ]);

        return response()->json($team, 201);
    }

    public function update(Request $request, $id)
    {
        $team = DeploymentTeam::where('lgu_id', auth()->user()->lgu_id)->findOrFail($id);
        
        $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'nullable|string|max:255',
            'status' => 'required|string|in:Active,Inactive',
        ]);

        $team->update($request->only(['name', 'category', 'status']));

        return response()->json($team);
    }

    public function destroy($id)
    {
        $team = DeploymentTeam::where('lgu_id', auth()->user()->lgu_id)->findOrFail($id);
        $team->delete();
        
        return response()->json(['message' => 'Team deleted successfully']);
    }
}
