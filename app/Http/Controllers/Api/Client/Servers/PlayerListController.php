<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Models\Permission;
use Pterodactyl\Services\ServerQuery\MinecraftQueryService;

class PlayerListController extends ClientApiController
{
    private const CACHE_TTL_SECONDS = 15;

    public function __construct(private MinecraftQueryService $queryService)
    {
        parent::__construct();
    }

    /**
     * Query the game server for connected players.
     * Results are cached for 15 seconds to reduce load on game servers.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $server = $request->attributes->get('server');

        $this->authorize(Permission::ACTION_WEBSOCKET_CONNECT, $server);

        $allocation = $server->allocation;
        if (!$allocation) {
            return response()->json(['error' => 'No allocation found for this server.'], 404);
        }

        $ip   = $allocation->alias ?? $allocation->ip;
        $port = $allocation->port;
        $cacheKey = "mc_query:{$server->uuid}:{$ip}:{$port}";

        try {
            $result = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($ip, $port) {
                return $this->queryService->query($ip, $port);
            });

            return response()->json([
                'online'  => $result['online'],
                'max'     => $result['max'],
                'players' => $result['players'],
                'version' => $result['version'],
                'motd'    => $result['motd'],
            ]);
        } catch (Exception $e) {
            return response()->json([
                'error' => 'Server is offline or not responding.',
            ], 503);
        }
    }
}
