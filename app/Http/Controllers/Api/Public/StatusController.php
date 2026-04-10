<?php

namespace Pterodactyl\Http\Controllers\Api\Public;

use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Models\Server;
use Pterodactyl\Services\ServerQuery\MinecraftQueryService;

class StatusController extends Controller
{
    private const CACHE_TTL = 30; // seconds

    public function __construct(private MinecraftQueryService $queryService)
    {
    }

    /**
     * Return public status of a single server by its short UUID.
     * Only servers with public_status_enabled=true are accessible.
     * No IPs or internal details are exposed.
     */
    public function show(string $uuidShort): JsonResponse
    {
        $server = Server::query()
            ->where('uuidShort', $uuidShort)
            ->where('public_status_enabled', true)
            ->with(['allocation', 'egg'])
            ->first();

        if (!$server) {
            return response()->json(['error' => 'Server not found.'], 404);
        }

        $data = Cache::remember("public:server_status:{$uuidShort}", self::CACHE_TTL, function () use ($server) {
            return [
                'name' => $server->name,
                'uuid_short' => $server->uuidShort,
                'game' => $server->egg->name ?? 'Unknown',
                'status' => $this->queryServerStatus($server),
            ];
        });

        return response()->json(['data' => $data]);
    }

    /**
     * Try to query the game server for live status.
     */
    private function queryServerStatus(Server $server): array
    {
        $allocation = $server->allocation;
        if (!$allocation) {
            return ['online' => false, 'players' => 0, 'max_players' => 0];
        }

        $ip = $allocation->alias ?? $allocation->ip;
        $port = $allocation->port;
        $cacheKey = "public:query:{$ip}:{$port}";

        try {
            return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($ip, $port) {
                $result = $this->queryService->query($ip, $port, 2);

                return [
                    'online' => true,
                    'players' => $result['online'],
                    'max_players' => $result['max'],
                    'player_list' => $result['players'],
                    'version' => $result['version'],
                ];
            });
        } catch (\Exception) {
            return ['online' => false, 'players' => 0, 'max_players' => 0];
        }
    }
}
