<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Models\Permission;
use Pterodactyl\Services\ServerQuery\RconService;

class PlayerDataController extends ClientApiController
{
    public function __construct(private RconService $rconService)
    {
        parent::__construct();
    }

    /**
     * Get detailed stats for a specific player via RCON.
     */
    public function __invoke(Request $request, string $playerName): JsonResponse
    {
        $server = $request->attributes->get('server');
        $this->authorize(Permission::ACTION_WEBSOCKET_CONNECT, $server);

        // Validate player name (MC usernames: 3-16 chars, alphanumeric + underscore)
        if (!preg_match('/^[a-zA-Z0-9_]{3,16}$/', $playerName)) {
            return response()->json(['error' => 'Invalid player name.'], 400);
        }

        // Read RCON config from server.properties via Wings
        $rconConfig = $this->getRconConfig($server);

        if (!$rconConfig || !$rconConfig['enabled']) {
            return response()->json([
                'error' => 'RCON is not enabled on this server.',
                'rcon_enabled' => false,
            ], 422);
        }

        // Cache player data for 10 seconds to avoid spamming RCON
        $cacheKey = "rcon:player:{$server->uuidShort}:{$playerName}";

        $data = Cache::remember($cacheKey, 10, function () use ($rconConfig, $playerName, $server) {
            try {
                $allocation = $server->allocation;
                $host = $allocation->ip;

                $this->rconService->connect($host, $rconConfig['port'], $rconConfig['password'], 3);
                $data = $this->rconService->getPlayerData($playerName);
                $this->rconService->disconnect();

                return $data;
            } catch (Exception) {
                return null;
            }
        });

        if ($data === null) {
            return response()->json([
                'error' => 'Could not retrieve player data.',
                'rcon_enabled' => true,
            ], 503);
        }

        return response()->json(['data' => $data, 'rcon_enabled' => true]);
    }

    /**
     * Read RCON settings from server.properties via Wings file API.
     */
    private function getRconConfig($server): ?array
    {
        $cacheKey = "rcon:config:{$server->uuidShort}";

        return Cache::remember($cacheKey, 60, function () use ($server) {
            try {
                $node = $server->node;
                $url = sprintf(
                    '%s/api/servers/%s/files/contents?file=/server.properties',
                    $node->getConnectionAddress(),
                    $server->uuid
                );

                $response = Http::timeout(5)
                    ->withHeaders(['Authorization' => 'Bearer ' . $node->getDecryptedKey()])
                    ->get($url);

                if (!$response->successful()) {
                    return null;
                }

                $config = [
                    'enabled' => false,
                    'port' => 25575,
                    'password' => '',
                ];

                foreach (explode("\n", $response->body()) as $line) {
                    $line = trim($line);
                    if (str_starts_with($line, 'enable-rcon=')) {
                        $config['enabled'] = trim(substr($line, 12)) === 'true';
                    } elseif (str_starts_with($line, 'rcon.port=')) {
                        $config['port'] = (int) trim(substr($line, 10));
                    } elseif (str_starts_with($line, 'rcon.password=')) {
                        $config['password'] = trim(substr($line, 14));
                    }
                }

                return $config;
            } catch (Exception) {
                return null;
            }
        });
    }
}
