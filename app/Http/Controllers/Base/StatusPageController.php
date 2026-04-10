<?php

namespace Pterodactyl\Http\Controllers\Base;

use Illuminate\Routing\Controller;
use Illuminate\View\View;
use Pterodactyl\Models\Server;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class StatusPageController extends Controller
{
    public function show(string $uuidShort): View
    {
        $server = Server::where('uuidShort', $uuidShort)
            ->where('public_status_enabled', true)
            ->first();

        if (!$server) {
            throw new NotFoundHttpException('Server not found.');
        }

        return view('status', [
            'uuidShort' => $uuidShort,
            'serverName' => $server->name,
        ]);
    }
}
