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
        Schema::create('deployment_teams', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('lgu_id')->nullable();
            $table->string('name');
            $table->string('category')->nullable();
            $table->string('status')->default('Active'); // Active, Inactive
            $table->timestamps();
            
            $table->foreign('lgu_id')->references('id')->on('lgus')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deployment_teams');
    }
};
