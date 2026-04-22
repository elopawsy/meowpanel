<?php

namespace Pterodactyl\Listeners\Server;

use Pterodactyl\Events\Server\Installed;
use Pterodactyl\Models\WebhookConfiguration;
use Pterodactyl\Services\Webhooks\DiscordWebhookService;

class WebhookDispatchListener
{
    public function __construct(private DiscordWebhookService $webhookService)
    {
    }

    public function handleInstalled(Installed $event): void
    {
        $this->webhookService->dispatch(
            WebhookConfiguration::EVENT_SERVER_INSTALLED,
            $event->server,
        );
    }
}
