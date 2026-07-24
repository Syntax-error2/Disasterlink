<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->index('lgu_id');
        });

        Schema::table('incident_reports', function (Blueprint $table) {
            $table->index('lgu_id');
        });

        Schema::table('evacuation_centers', function (Blueprint $table) {
            $table->index('lgu_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['lgu_id']);
        });

        Schema::table('incident_reports', function (Blueprint $table) {
            $table->dropIndex(['lgu_id']);
        });

        Schema::table('evacuation_centers', function (Blueprint $table) {
            $table->dropIndex(['lgu_id']);
        });
    }
};
