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
        Schema::create('lgus', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('subdomain')->unique();
            $table->enum('subscription_status', ['active', 'suspended', 'trial'])->default('trial');
            $table->string('logo_url')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lgus');
    }
};
