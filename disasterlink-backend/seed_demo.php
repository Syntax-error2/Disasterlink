<?php
$lgu = App\Models\Lgu::first();
if ($lgu) {
    $user = App\Models\User::firstOrCreate(
        ['email' => 'alpha@test.com'],
        [
            'name' => 'Alpha Responder 1',
            'password' => bcrypt('password123'),
            'role' => 'Responder',
            'phone' => '09123456780',
            'lgu_id' => $lgu->id,
            'assigned_barangay' => 'Santo Rosario',
            'is_active' => true
        ]
    );

    $team = App\Models\DeploymentTeam::firstOrCreate(
        ['name' => 'Alpha Strike Team'],
        [
            'lgu_id' => $lgu->id,
            'category' => 'Medical Emergency Rescue',
            'status' => 'Active',
            'base_latitude' => $lgu->latitude ?? 10.1866,
            'base_longitude' => $lgu->longitude ?? 122.8587,
        ]
    );

    if ($user && $team) {
        // Many to many relationship is usually defined as members() on DeploymentTeam
        if (method_exists($team, 'members')) {
            $team->members()->syncWithoutDetaching([$user->id]);
        }
        echo 'Successfully seeded Alpha Responder and Alpha Strike Team.';
    }
} else {
    echo 'No LGU found to attach records to.';
}
