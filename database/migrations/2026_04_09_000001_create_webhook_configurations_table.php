<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webhook_configurations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('url');
            $table->json('events');
            $table->boolean('enabled')->default(true);
            $table->unsignedInteger('server_id')->nullable();
            $table->timestamps();

            $table->foreign('server_id')
                ->references('id')
                ->on('servers')
                ->cascadeOnDelete();

            $table->index(['enabled', 'server_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_configurations');
    }
};
