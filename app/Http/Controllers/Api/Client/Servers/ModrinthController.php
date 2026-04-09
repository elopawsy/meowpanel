<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Models\Permission;

class ModrinthController extends ClientApiController
{
    private const MODRINTH_API = 'https://api.modrinth.com/v2';
    private const CACHE_TTL = 300; // 5 minutes

    /**
     * Get versions for a specific project, filtered by loader and game version.
     */
    public function versions(Request $request, string $projectId): JsonResponse
    {
        $server = $request->attributes->get('server');
        $this->authorize(Permission::ACTION_MOD_DOWNLOAD, $server);

        $loaders = $request->query('loaders');
        $gameVersions = $request->query('game_versions');

        $cacheKey = "modrinth:versions:{$projectId}:{$loaders}:{$gameVersions}";

        $data = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($projectId, $loaders, $gameVersions) {
            $query = [];
            if ($loaders) {
                $query['loaders'] = $loaders;
            }
            if ($gameVersions) {
                $query['game_versions'] = $gameVersions;
            }

            $response = Http::timeout(10)
                ->withHeaders(['User-Agent' => 'meowpanel/' . config('app.version')])
                ->get(self::MODRINTH_API . "/project/{$projectId}/version", $query);

            if (!$response->successful()) {
                return null;
            }

            return $response->json();
        });

        if ($data === null) {
            return response()->json(['error' => 'Failed to fetch versions from Modrinth.'], 502);
        }

        return response()->json(['data' => $data]);
    }

    /**
     * Install a mod file from Modrinth to the server's mods directory.
     * Downloads from Modrinth CDN and writes to the server via Wings file API.
     */
    public function install(Request $request): JsonResponse
    {
        $server = $request->attributes->get('server');
        $this->authorize(Permission::ACTION_MOD_DOWNLOAD, $server);

        $validated = $request->validate([
            'url' => 'required|url|starts_with:https://cdn.modrinth.com/',
            'filename' => 'required|string|max:255|regex:/^[a-zA-Z0-9._\\-]+\\.jar$/',
            'directory' => 'sometimes|string|in:mods,plugins',
        ]);

        $url = $validated['url'];
        $filename = $validated['filename'];
        $directory = $validated['directory'] ?? 'mods';

        try {
            // Download the file from Modrinth CDN
            $response = Http::timeout(30)
                ->withHeaders(['User-Agent' => 'meowpanel/' . config('app.version')])
                ->get($url);

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to download file from Modrinth.'], 502);
            }

            $fileContent = $response->body();
            $fileSize = strlen($fileContent);

            // Max 500MB
            if ($fileSize > 500 * 1024 * 1024) {
                return response()->json(['error' => 'File too large.'], 413);
            }

            // Write file to the server via Wings API
            $node = $server->node;
            $writeUrl = sprintf(
                '%s/api/servers/%s/files/write?file=/%s/%s',
                $node->getConnectionAddress(),
                $server->uuid,
                $directory,
                $filename
            );

            $writeResponse = Http::timeout(30)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $node->getDecryptedKey(),
                    'Content-Type' => 'application/octet-stream',
                ])
                ->withBody($fileContent, 'application/octet-stream')
                ->post($writeUrl);

            if (!$writeResponse->successful()) {
                Log::warning("Modrinth install: Wings write failed for {$filename}", [
                    'status' => $writeResponse->status(),
                    'server' => $server->uuidShort,
                ]);
                return response()->json(['error' => 'Failed to write file to server.'], 502);
            }

            return response()->json([
                'success' => true,
                'filename' => $filename,
                'size' => $fileSize,
                'directory' => $directory,
            ]);
        } catch (Exception $e) {
            Log::error("Modrinth install error: {$e->getMessage()}", [
                'server' => $server->uuidShort,
            ]);
            return response()->json(['error' => 'Installation failed.'], 500);
        }
    }

    /**
     * List installed mods in the mods/ or plugins/ directory.
     */
    public function installed(Request $request): JsonResponse
    {
        $server = $request->attributes->get('server');
        $this->authorize(Permission::ACTION_MOD_DOWNLOAD, $server);

        $directory = $request->query('directory', 'mods');
        if (!in_array($directory, ['mods', 'plugins'])) {
            $directory = 'mods';
        }

        try {
            $node = $server->node;
            $listUrl = sprintf(
                '%s/api/servers/%s/files/list-directory?directory=/%s',
                $node->getConnectionAddress(),
                $server->uuid,
                $directory
            );

            $response = Http::timeout(10)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $node->getDecryptedKey(),
                ])
                ->get($listUrl);

            if (!$response->successful()) {
                return response()->json(['data' => []]);
            }

            $files = collect($response->json())
                ->filter(fn ($file) => str_ends_with($file['name'] ?? '', '.jar'))
                ->map(fn ($file) => [
                    'name' => $file['name'],
                    'size' => $file['size'] ?? 0,
                    'modified_at' => $file['modified_at'] ?? null,
                ])
                ->values()
                ->all();

            return response()->json(['data' => $files]);
        } catch (Exception $e) {
            return response()->json(['data' => []]);
        }
    }

    /**
     * Delete an installed mod file.
     */
    public function uninstall(Request $request): JsonResponse
    {
        $server = $request->attributes->get('server');
        $this->authorize(Permission::ACTION_MOD_DOWNLOAD, $server);

        $validated = $request->validate([
            'filename' => 'required|string|max:255|regex:/^[a-zA-Z0-9._\\-]+\\.jar$/',
            'directory' => 'sometimes|string|in:mods,plugins',
        ]);

        $filename = $validated['filename'];
        $directory = $validated['directory'] ?? 'mods';

        try {
            $node = $server->node;
            $deleteUrl = sprintf(
                '%s/api/servers/%s/files/delete',
                $node->getConnectionAddress(),
                $server->uuid
            );

            $response = Http::timeout(10)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $node->getDecryptedKey(),
                    'Content-Type' => 'application/json',
                ])
                ->post($deleteUrl, [
                    'root' => '/',
                    'files' => ["{$directory}/{$filename}"],
                ]);

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to delete file.'], 502);
            }

            return response()->json(['success' => true]);
        } catch (Exception $e) {
            return response()->json(['error' => 'Delete failed.'], 500);
        }
    }
}
