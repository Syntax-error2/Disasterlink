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
        Schema::table('evacuation_centers', function (Blueprint $table) {
            $table->integer('food_level')->default(100);
            $table->integer('water_level')->default(100);
            $table->integer('medicine_level')->default(100);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evacuation_centers', function (Blueprint $table) {
            //
        });
    }
};
