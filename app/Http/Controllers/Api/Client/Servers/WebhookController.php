<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Models\Permission;
use Pterodactyl\Models\WebhookConfiguration;

class WebhookController extends ClientApiController
{
    /**
     * Discord webhook URL pattern. Only Discord webhook URLs are accepted
     * to prevent SSRF (server-side request forgery) attacks.
     */
    private const DISCORD_WEBHOOK_REGEX = '/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//';

    /**
     * List webhooks for a server.
     */
    public function index(Request $request): JsonResponse
    {
        $server = $request->attributes->get('server');
        $this->authorize(Permission::ACTION_CONTROL_CONSOLE, $server);

        $webhooks = WebhookConfiguration::query()
            ->where('server_id', $server->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $webhooks]);
    }

    /**
     * Create a new webhook for a server.
     */
    public function store(Request $request): JsonResponse
    {
        $server = $request->attributes->get('server');
        $this->authorize(Permission::ACTION_CONTROL_CONSOLE, $server);

        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'url' => ['required', 'url', 'max:2048', 'regex:' . self::DISCORD_WEBHOOK_REGEX],
            'events' => 'required|array|min:1',
            'events.*' => 'string|in:' . implode(',', WebhookConfiguration::ALL_EVENTS),
        ], [
            'url.regex' => 'Only Discord webhook URLs are allowed (https://discord.com/api/webhooks/...).',
        ]);

        $webhook = WebhookConfiguration::create([
            ...$validated,
            'server_id' => $server->id,
            'enabled' => true,
        ]);

        return response()->json(['data' => $webhook], 201);
    }

    /**
     * Update a webhook.
     */
    public function update(Request $request, int $webhookId): JsonResponse
    {
        $server = $request->attributes->get('server');
        $this->authorize(Permission::ACTION_CONTROL_CONSOLE, $server);

        $webhook = WebhookConfiguration::where('server_id', $server->id)
            ->findOrFail($webhookId);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:191',
            'url' => ['sometimes', 'url', 'max:2048', 'regex:' . self::DISCORD_WEBHOOK_REGEX],
            'events' => 'sometimes|array|min:1',
            'events.*' => 'string|in:' . implode(',', WebhookConfiguration::ALL_EVENTS),
            'enabled' => 'sometimes|boolean',
        ], [
            'url.regex' => 'Only Discord webhook URLs are allowed (https://discord.com/api/webhooks/...).',
        ]);

        $webhook->update($validated);

        return response()->json(['data' => $webhook->fresh()]);
    }

    /**
     * Delete a webhook.
     */
    public function destroy(Request $request, int $webhookId): JsonResponse
    {
        $server = $request->attributes->get('server');
        $this->authorize(Permission::ACTION_CONTROL_CONSOLE, $server);

        WebhookConfiguration::where('server_id', $server->id)
            ->findOrFail($webhookId)
            ->delete();

        return response()->json([], 204);
    }

    /**
     * Send a test ping to the webhook URL.
     */
    public function test(Request $request, int $webhookId): JsonResponse
    {
        $server = $request->attributes->get('server');
        $this->authorize(Permission::ACTION_CONTROL_CONSOLE, $server);

        $webhook = WebhookConfiguration::where('server_id', $server->id)
            ->findOrFail($webhookId);

        $service = app(\Pterodactyl\Services\Webhooks\DiscordWebhookService::class);
        $success = $service->send(
            $webhook,
            WebhookConfiguration::EVENT_SERVER_STARTED,
            $server,
            ['Note' => 'This is a test notification'],
        );

        return response()->json(['success' => $success]);
    }
}
