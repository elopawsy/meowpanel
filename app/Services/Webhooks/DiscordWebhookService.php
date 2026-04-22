<?php

namespace Pterodactyl\Services\Webhooks;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\WebhookConfiguration;

class DiscordWebhookService
{
    /**
     * Color constants for Discord embed sidebar.
     */
    private const COLORS = [
        'success' => 0x57F287, // Green
        'warning' => 0xFEE75C, // Yellow
        'error'   => 0xED4245, // Red
        'info'    => 0x5865F2, // Blurple
    ];

    /**
     * Dispatch a webhook event to all matching configurations.
     */
    public function dispatch(string $event, Server $server, array $extraFields = []): void
    {
        $webhooks = WebhookConfiguration::query()
            ->where('enabled', true)
            ->where(function ($query) use ($server) {
                $query->whereNull('server_id')
                    ->orWhere('server_id', $server->id);
            })
            ->get();

        foreach ($webhooks as $webhook) {
            if ($webhook->subscribedTo($event)) {
                $this->send($webhook, $event, $server, $extraFields);
            }
        }
    }

    /**
     * Send a Discord webhook embed.
     * The URL is validated against Discord webhook domains as a defense-in-depth
     * measure against SSRF, even though the controller also validates.
     */
    public function send(WebhookConfiguration $webhook, string $event, Server $server, array $extraFields = []): bool
    {
        if (!preg_match(WebhookConfiguration::DISCORD_WEBHOOK_REGEX, $webhook->url)) {
            Log::warning("Webhook [{$webhook->name}] blocked: URL is not a Discord webhook.");
            return false;
        }

        $embed = $this->buildEmbed($event, $server, $extraFields);

        try {
            $response = Http::timeout(5)->post($webhook->url, [
                'embeds' => [$embed],
            ]);

            if (!$response->successful()) {
                Log::warning("Webhook delivery failed for [{$webhook->name}]: HTTP {$response->status()}");
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::warning("Webhook delivery exception for [{$webhook->name}]: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Build a Discord embed payload for the given event.
     */
    public function buildEmbed(string $event, object $server, array $extraFields = []): array
    {
        $config = $this->getEventConfig($event);

        $fields = [
            ['name' => 'Server', 'value' => $server->name, 'inline' => true],
            ['name' => 'UUID', 'value' => '`' . $server->uuidShort . '`', 'inline' => true],
            ['name' => 'Node', 'value' => $server->node->name ?? 'Unknown', 'inline' => true],
        ];

        foreach ($extraFields as $name => $value) {
            $fields[] = ['name' => $name, 'value' => (string) $value, 'inline' => true];
        }

        return [
            'title' => $config['title'],
            'description' => $config['description'],
            'color' => $config['color'],
            'fields' => $fields,
            'footer' => [
                'text' => config('app.name', 'Pterodactyl'),
            ],
            'timestamp' => now()->toIso8601String(),
        ];
    }

    /**
     * Get display configuration for a given event type.
     */
    public function getEventConfig(string $event): array
    {
        return match ($event) {
            WebhookConfiguration::EVENT_SERVER_STARTED => [
                'title' => 'Server Started',
                'description' => 'The server is now running.',
                'color' => self::COLORS['success'],
            ],
            WebhookConfiguration::EVENT_SERVER_STOPPED => [
                'title' => 'Server Stopped',
                'description' => 'The server has been stopped.',
                'color' => self::COLORS['warning'],
            ],
            WebhookConfiguration::EVENT_SERVER_CRASHED => [
                'title' => 'Server Crashed',
                'description' => 'The server process exited unexpectedly.',
                'color' => self::COLORS['error'],
            ],
            WebhookConfiguration::EVENT_SERVER_INSTALLED => [
                'title' => 'Server Installed',
                'description' => 'The server has finished installing.',
                'color' => self::COLORS['info'],
            ],
            WebhookConfiguration::EVENT_SERVER_BACKUP_COMPLETED => [
                'title' => 'Backup Completed',
                'description' => 'A server backup completed successfully.',
                'color' => self::COLORS['success'],
            ],
            WebhookConfiguration::EVENT_SERVER_BACKUP_FAILED => [
                'title' => 'Backup Failed',
                'description' => 'A server backup has failed.',
                'color' => self::COLORS['error'],
            ],
            default => [
                'title' => 'Server Event',
                'description' => "Event: $event",
                'color' => self::COLORS['info'],
            ],
        };
    }
}
