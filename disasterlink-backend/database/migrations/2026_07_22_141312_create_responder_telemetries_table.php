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
        Schema::create('responder_telemetries', function (Blueprint $table) {
            $table->id();
            $table->string('unit_name')->unique();
            $table->decimal('lat', 10, 8);
            $table->decimal('lng', 11, 8);
            $table->string('status')->default('Available');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('responder_telemetries');
    }
};
