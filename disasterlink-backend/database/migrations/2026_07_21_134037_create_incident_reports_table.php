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
        Schema::create('incident_reports', function (Blueprint $table) {
            $table->id();
            $table->string('reporting_barangay')->default('Unknown');
            $table->string('incident_type')->default('Fire');
            $table->string('severity_level')->default('High');
            $table->string('exact_location')->default('GPS Ping');
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->text('details')->nullable();
            $table->longText('image_data')->nullable();
            $table->string('image_path')->nullable();
            $table->string('status')->default('Pending Review');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incident_reports');
    }
};
