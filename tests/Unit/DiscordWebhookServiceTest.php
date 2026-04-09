<?php

namespace Pterodactyl\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Pterodactyl\Models\WebhookConfiguration;
use Pterodactyl\Services\Webhooks\DiscordWebhookService;

class DiscordWebhookServiceTest extends TestCase
{
    private DiscordWebhookService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new DiscordWebhookService();
    }

    // ── Event config ─────────────────────────────────────────────

    public function test_all_events_have_config(): void
    {
        foreach (WebhookConfiguration::ALL_EVENTS as $event) {
            $config = $this->service->getEventConfig($event);

            $this->assertArrayHasKey('title', $config, "Missing title for event: $event");
            $this->assertArrayHasKey('description', $config, "Missing description for event: $event");
            $this->assertArrayHasKey('color', $config, "Missing color for event: $event");

            $this->assertNotEmpty($config['title'], "Empty title for event: $event");
            $this->assertIsInt($config['color'], "Color not int for event: $event");
        }
    }

    public function test_unknown_event_returns_default_config(): void
    {
        $config = $this->service->getEventConfig('unknown.event');

        $this->assertStringContainsString('Event', $config['title']);
        $this->assertIsInt($config['color']);
    }

    public function test_server_started_config(): void
    {
        $config = $this->service->getEventConfig(WebhookConfiguration::EVENT_SERVER_STARTED);

        $this->assertEquals('Server Started', $config['title']);
        $this->assertEquals(0x57F287, $config['color']); // Green
    }

    public function test_server_crashed_config(): void
    {
        $config = $this->service->getEventConfig(WebhookConfiguration::EVENT_SERVER_CRASHED);

        $this->assertEquals('Server Crashed', $config['title']);
        $this->assertEquals(0xED4245, $config['color']); // Red
    }

    public function test_backup_completed_config(): void
    {
        $config = $this->service->getEventConfig(WebhookConfiguration::EVENT_SERVER_BACKUP_COMPLETED);

        $this->assertEquals('Backup Completed', $config['title']);
        $this->assertEquals(0x57F287, $config['color']); // Green
    }

    public function test_backup_failed_config(): void
    {
        $config = $this->service->getEventConfig(WebhookConfiguration::EVENT_SERVER_BACKUP_FAILED);

        $this->assertEquals('Backup Failed', $config['title']);
        $this->assertEquals(0xED4245, $config['color']); // Red
    }

    // ── Webhook model ────────────────────────────────────────────

    public function test_all_events_constant_is_complete(): void
    {
        $this->assertContains(WebhookConfiguration::EVENT_SERVER_STARTED, WebhookConfiguration::ALL_EVENTS);
        $this->assertContains(WebhookConfiguration::EVENT_SERVER_STOPPED, WebhookConfiguration::ALL_EVENTS);
        $this->assertContains(WebhookConfiguration::EVENT_SERVER_CRASHED, WebhookConfiguration::ALL_EVENTS);
        $this->assertContains(WebhookConfiguration::EVENT_SERVER_INSTALLED, WebhookConfiguration::ALL_EVENTS);
        $this->assertContains(WebhookConfiguration::EVENT_SERVER_BACKUP_COMPLETED, WebhookConfiguration::ALL_EVENTS);
        $this->assertContains(WebhookConfiguration::EVENT_SERVER_BACKUP_FAILED, WebhookConfiguration::ALL_EVENTS);
        $this->assertCount(6, WebhookConfiguration::ALL_EVENTS);
    }

    public function test_event_constants_are_dot_notation(): void
    {
        foreach (WebhookConfiguration::ALL_EVENTS as $event) {
            $this->assertMatchesRegularExpression('/^[a-z]+(\.[a-z]+)+$/', $event, "Event $event not dot-notation");
        }
    }

    public function test_validation_rules_exist(): void
    {
        $rules = WebhookConfiguration::$validationRules;

        $this->assertArrayHasKey('name', $rules);
        $this->assertArrayHasKey('url', $rules);
        $this->assertArrayHasKey('events', $rules);
        $this->assertArrayHasKey('enabled', $rules);
        $this->assertArrayHasKey('server_id', $rules);
    }

    public function test_fillable_fields(): void
    {
        $webhook = new WebhookConfiguration();
        $fillable = $webhook->getFillable();

        $this->assertContains('name', $fillable);
        $this->assertContains('url', $fillable);
        $this->assertContains('events', $fillable);
        $this->assertContains('enabled', $fillable);
        $this->assertContains('server_id', $fillable);
    }

    public function test_events_cast_to_array(): void
    {
        $webhook = new WebhookConfiguration();
        $casts = $webhook->getCasts();

        $this->assertEquals('array', $casts['events']);
        $this->assertEquals('boolean', $casts['enabled']);
    }

    // ── Embed building ───────────────────────────────────────────

    public function test_build_embed_has_required_keys(): void
    {
        $server = $this->createMockServer();
        $embed = $this->service->buildEmbed(WebhookConfiguration::EVENT_SERVER_STARTED, $server);

        $this->assertArrayHasKey('title', $embed);
        $this->assertArrayHasKey('description', $embed);
        $this->assertArrayHasKey('color', $embed);
        $this->assertArrayHasKey('fields', $embed);
        $this->assertArrayHasKey('footer', $embed);
        $this->assertArrayHasKey('timestamp', $embed);
    }

    public function test_build_embed_contains_server_info(): void
    {
        $server = $this->createMockServer();
        $embed = $this->service->buildEmbed(WebhookConfiguration::EVENT_SERVER_CRASHED, $server);

        $fieldValues = array_column($embed['fields'], 'value', 'name');

        $this->assertEquals('Test Server', $fieldValues['Server']);
        $this->assertEquals('`abc123`', $fieldValues['UUID']);
    }

    public function test_build_embed_with_extra_fields(): void
    {
        $server = $this->createMockServer();
        $embed = $this->service->buildEmbed(
            WebhookConfiguration::EVENT_SERVER_BACKUP_COMPLETED,
            $server,
            ['Size' => '256 MB', 'Duration' => '12s'],
        );

        $fieldValues = array_column($embed['fields'], 'value', 'name');

        $this->assertEquals('256 MB', $fieldValues['Size']);
        $this->assertEquals('12s', $fieldValues['Duration']);
    }

    public function test_build_embed_footer(): void
    {
        $server = $this->createMockServer();
        $embed = $this->service->buildEmbed(WebhookConfiguration::EVENT_SERVER_STARTED, $server);

        $this->assertEquals('Meowpanel', $embed['footer']['text']);
    }

    public function test_build_embed_timestamp_is_iso8601(): void
    {
        $server = $this->createMockServer();
        $embed = $this->service->buildEmbed(WebhookConfiguration::EVENT_SERVER_STARTED, $server);

        // ISO 8601 should parse back to a valid timestamp
        $this->assertNotFalse(strtotime($embed['timestamp']));
    }

    // ── Helper ───────────────────────────────────────────────────

    private function createMockServer(): object
    {
        $node = new \stdClass();
        $node->name = 'Node-01';

        $server = new \stdClass();
        $server->name = 'Test Server';
        $server->uuidShort = 'abc123';
        $server->node = $node;

        return $server;
    }
}
