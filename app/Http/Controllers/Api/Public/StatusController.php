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
     * Return public status of all servers (no authentication required).
     * Responses are cached to avoid excessive database/query load.
     */
    public function index(): JsonResponse
    {
        $data = Cache::remember('public:server_status', self::CACHE_TTL, function () {
            return Server::query()
                ->with(['allocation', 'node', 'egg'])
                ->get()
                ->map(function (Server $server) {
                    $allocation = $server->allocation;
                    $status = $this->queryServerStatus($server);

                    return [
                        'name' => $server->name,
                        'uuid_short' => $server->uuidShort,
                        'node' => $server->node->name ?? 'Unknown',
                        'game' => $server->egg->name ?? 'Unknown',
                        'address' => $allocation
                            ? ($allocation->alias ?? $allocation->ip) . ':' . $allocation->port
                            : null,
                        'status' => $status,
                    ];
                })
                ->values()
                ->all();
        });

        return response()->json([
            'data' => $data,
            'cached_at' => Cache::get('public:server_status_time', now()->toIso8601String()),
        ]);
    }

    /**
     * Try to query the game server for live status. Returns a simple status array.
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
