<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('server_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('egg_id');
            $table->string('docker_image');
            $table->text('startup');
            $table->json('environment');
            $table->unsignedInteger('memory')->default(1024);
            $table->unsignedInteger('disk')->default(5120);
            $table->unsignedInteger('cpu')->default(100);
            $table->unsignedInteger('created_by');
            $table->timestamps();

            $table->foreign('egg_id')->references('id')->on('eggs')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('server_templates');
    }
};
