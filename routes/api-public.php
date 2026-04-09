<?php

use Illuminate\Support\Facades\Route;
use Pterodactyl\Http\Controllers\Api\Public\StatusController;

/*
|--------------------------------------------------------------------------
| Public API (no authentication)
|--------------------------------------------------------------------------
|
| Endpoint: /api/public
| Rate limit: 60 requests per minute per IP
|
*/

Route::get('/status', [StatusController::class, 'index'])
    ->name('api.public.status');
