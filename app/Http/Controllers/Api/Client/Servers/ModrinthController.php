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
     * Map egg feature names to Modrinth loader slugs.
     */
    private const FEATURE_TO_LOADER = [
        'mod/forge' => 'forge',
        'mod/fabric' => 'fabric',
        'mod/neoforge' => 'neoforge',
        'mod/quilt' => 'quilt',
        'plugin/paper' => 'paper',
        'plugin/spigot' => 'spigot',
        'plugin/purpur' => 'purpur',
        'plugin/bukkit' => 'bukkit',
        'plugin/sponge' => 'sponge',
        'plugin/bungeecord' => 'bungeecord',
        'plugin/velocity' => 'velocity',
        'plugin/waterfall' => 'waterfall',
        'plugin/folia' => 'folia',
    ];

    /**
     * Egg names to Modrinth loader slugs (fallback when features don't specify).
     */
    private const EGG_NAME_TO_LOADER = [
        'neoforge' => 'neoforge',
        'forge' => 'forge',
        'fabric' => 'fabric',
        'quilt' => 'quilt',
        'paper' => 'paper',
        'spigot' => 'spigot',
        'purpur' => 'purpur',
        'bukkit' => 'bukkit',
        'folia' => 'folia',
        'sponge' => 'sponge',
        'bungeecord' => 'bungeecord',
        'velocity' => 'velocity',
        'waterfall' => 'waterfall',
    ];

    /**
     * Auto-detect the server's Minecraft version and mod loader from egg variables and features.
     */
    public function detect(Request $request): JsonResponse
    {
        $server = $request->attributes->get('server');
        $this->authorize(Permission::ACTION_MOD_DOWNLOAD, $server);

        $server->load(['egg', 'variables']);

        // Detect game version from egg variables
        $gameVersion = null;
        foreach ($server->variables as $variable) {
            if (in_array($variable->env_variable, ['MC_VERSION', 'MINECRAFT_VERSION'])) {
                $val = $variable->server_value ?: $variable->default_value;
                if ($val && $val !== 'latest') {
                    $gameVersion = $val;
                }
                break;
            }
        }

        // Detect loader from egg features
        $loader = null;
        $loaderType = 'mod'; // 'mod' or 'plugin'
        $features = $server->egg->features ?? [];

        foreach ($features as $feature) {
            if (isset(self::FEATURE_TO_LOADER[$feature])) {
                $loader = self::FEATURE_TO_LOADER[$feature];
                $loaderType = str_starts_with($feature, 'plugin/') ? 'plugin' : 'mod';
                break;
            }
        }

        // Fallback: match egg name
        if (!$loader && $server->egg) {
            $eggNameLower = strtolower($server->egg->name);
            foreach (self::EGG_NAME_TO_LOADER as $keyword => $loaderSlug) {
                if (str_contains($eggNameLower, $keyword)) {
                    $loader = $loaderSlug;
                    $loaderType = in_array($loaderSlug, ['paper', 'spigot', 'purpur', 'bukkit', 'folia', 'sponge', 'bungeecord', 'velocity', 'waterfall'])
                        ? 'plugin'
                        : 'mod';
                    break;
                }
            }
        }

        return response()->json([
            'game_version' => $gameVersion,
            'loader' => $loader,
            'loader_type' => $loaderType,
            'directory' => $loaderType === 'plugin' ? 'plugins' : 'mods',
            'egg_name' => $server->egg->name ?? 'Unknown',
        ]);
    }

    /**
     * Identify installed mods by their SHA1 hashes via the Modrinth version_files API.
     * Also checks for available updates.
     */
    public function identify(Request $request): JsonResponse
    {
        $server = $request->attributes->get('server');
        $this->authorize(Permission::ACTION_MOD_DOWNLOAD, $server);

        $directory = $request->query('directory', 'mods');
        if (!in_array($directory, ['mods', 'plugins'])) {
            $directory = 'mods';
        }

        $loaders = $request->query('loaders'); // JSON array string
        $gameVersions = $request->query('game_versions'); // JSON array string

        try {
            $node = $server->node;

            // 1. List .jar files
            $listUrl = sprintf(
                '%s/api/servers/%s/files/list-directory?directory=/%s',
                $node->getConnectionAddress(),
                $server->uuid,
                $directory
            );

            $listResponse = Http::timeout(10)
                ->withHeaders(['Authorization' => 'Bearer ' . $node->getDecryptedKey()])
                ->get($listUrl);

            if (!$listResponse->successful()) {
                return response()->json(['data' => []]);
            }

            $jarFiles = collect($listResponse->json())
                ->filter(fn ($f) => str_ends_with($f['name'] ?? '', '.jar'))
                ->values();

            if ($jarFiles->isEmpty()) {
                return response()->json(['data' => []]);
            }

            // 2. Compute SHA1 hashes via Wings
            $hashes = [];
            foreach ($jarFiles as $file) {
                $shaUrl = sprintf(
                    '%s/api/servers/%s/files/sha256?file=/%s/%s',
                    $node->getConnectionAddress(),
                    $server->uuid,
                    $directory,
                    $file['name']
                );

                // Wings doesn't have a hash endpoint — use pull content + hash locally
                $contentUrl = sprintf(
                    '%s/api/servers/%s/files/contents?file=/%s/%s',
                    $node->getConnectionAddress(),
                    $server->uuid,
                    $directory,
                    $file['name']
                );

                // Only hash small-ish files (< 100MB) to avoid memory issues
                if (($file['size'] ?? 0) > 100 * 1024 * 1024) {
                    continue;
                }

                try {
                    $contentResponse = Http::timeout(15)
                        ->withHeaders(['Authorization' => 'Bearer ' . $node->getDecryptedKey()])
                        ->get($contentUrl);

                    if ($contentResponse->successful()) {
                        $sha1 = sha1($contentResponse->body());
                        $hashes[$sha1] = $file['name'];
                    }
                } catch (Exception) {
                    // Skip files that can't be read
                }
            }

            // 3. Batch lookup hashes on Modrinth
            $modrinthData = [];
            if (!empty($hashes)) {
                $cacheKey = 'modrinth:hashes:' . md5(implode(',', array_keys($hashes)));

                $modrinthData = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($hashes) {
                    $response = Http::timeout(15)
                        ->withHeaders(['User-Agent' => 'meowpanel/' . config('app.version')])
                        ->post(self::MODRINTH_API . '/version_files', [
                            'hashes' => array_keys($hashes),
                            'algorithm' => 'sha1',
                        ]);

                    return $response->successful() ? $response->json() : [];
                });
            }

            // 4. Build response with Modrinth metadata + update check
            $result = [];
            foreach ($jarFiles as $file) {
                $fileName = $file['name'];
                $sha1 = array_search($fileName, $hashes);
                $modrinthVersion = $sha1 ? ($modrinthData[$sha1] ?? null) : null;

                $entry = [
                    'name' => $fileName,
                    'size' => $file['size'] ?? 0,
                    'modified_at' => $file['modified_at'] ?? null,
                    'modrinth' => null,
                    'update_available' => null,
                ];

                if ($modrinthVersion) {
                    $entry['modrinth'] = [
                        'project_id' => $modrinthVersion['project_id'] ?? null,
                        'version_id' => $modrinthVersion['id'] ?? null,
                        'version_number' => $modrinthVersion['version_number'] ?? null,
                        'name' => $modrinthVersion['name'] ?? null,
                    ];

                    // 5. Check for updates
                    if (isset($modrinthVersion['project_id'])) {
                        $entry['update_available'] = $this->checkUpdate(
                            $modrinthVersion['project_id'],
                            $modrinthVersion['id'] ?? '',
                            $loaders ? json_decode($loaders, true) : null,
                            $gameVersions ? json_decode($gameVersions, true) : null,
                        );
                    }
                }

                $result[] = $entry;
            }

            return response()->json(['data' => $result]);
        } catch (Exception $e) {
            Log::error("Modrinth identify error: {$e->getMessage()}");
            return response()->json(['data' => []]);
        }
    }

    /**
     * Check if a newer version exists for a project.
     */
    private function checkUpdate(string $projectId, string $currentVersionId, ?array $loaders, ?array $gameVersions): ?array
    {
        $cacheKey = "modrinth:update:{$projectId}:{$currentVersionId}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($projectId, $currentVersionId, $loaders, $gameVersions) {
            $query = [];
            if ($loaders) {
                $query['loaders'] = json_encode($loaders);
            }
            if ($gameVersions) {
                $query['game_versions'] = json_encode($gameVersions);
            }

            $response = Http::timeout(10)
                ->withHeaders(['User-Agent' => 'meowpanel/' . config('app.version')])
                ->get(self::MODRINTH_API . "/project/{$projectId}/version", $query);

            if (!$response->successful()) {
                return null;
            }

            $versions = $response->json();
            if (empty($versions)) {
                return null;
            }

            $latest = $versions[0];
            if (($latest['id'] ?? '') === $currentVersionId) {
                return null; // Already on latest
            }

            return [
                'version_id' => $latest['id'],
                'version_number' => $latest['version_number'] ?? '',
                'name' => $latest['name'] ?? '',
                'file_url' => $latest['files'][0]['url'] ?? null,
                'file_name' => $latest['files'][0]['filename'] ?? null,
            ];
        });
    }

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
