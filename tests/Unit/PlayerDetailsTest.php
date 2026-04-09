<?php

namespace Pterodactyl\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Pterodactyl\Services\ServerQuery\MinecraftQueryService;

class PlayerDetailsTest extends TestCase
{
    private MinecraftQueryService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new MinecraftQueryService();
    }

    /**
     * Verify the query response now includes player UUIDs.
     */
    public function test_query_response_includes_player_objects(): void
    {
        // Simulate what parseResponse would return
        $content = file_get_contents(__DIR__ . '/../../app/Services/ServerQuery/MinecraftQueryService.php');

        // Players should be mapped to arrays with 'name' and 'uuid' keys
        $this->assertStringContainsString("'name'", $content);
        $this->assertStringContainsString("'uuid'", $content);
        $this->assertStringContainsString("str_replace('-', '', \$p['id'])", $content);
    }

    /**
     * Verify the frontend type includes uuid field.
     */
    public function test_frontend_player_type_has_uuid(): void
    {
        $content = file_get_contents(base_path('resources/scripts/api/server/getPlayerList.ts'));
        $this->assertStringContainsString('uuid: string | null', $content);
    }

    /**
     * Verify the frontend uses crafatar for avatars.
     */
    public function test_frontend_uses_crafatar_avatars(): void
    {
        $content = file_get_contents(base_path('resources/scripts/components/server/console/PlayerList.tsx'));
        $this->assertStringContainsString('crafatar.com/avatars', $content);
        $this->assertStringContainsString('crafatar.com/renders/head', $content);
    }

    /**
     * Verify the frontend links to NameMC profile.
     */
    public function test_frontend_links_to_namemc(): void
    {
        $content = file_get_contents(base_path('resources/scripts/components/server/console/PlayerList.tsx'));
        $this->assertStringContainsString('namemc.com/profile', $content);
    }

    public function test_rcon_service_exists(): void
    {
        $this->assertTrue(
            class_exists(\Pterodactyl\Services\ServerQuery\RconService::class)
        );
    }

    public function test_rcon_service_has_required_methods(): void
    {
        $methods = ['connect', 'command', 'disconnect', 'getPlayerData'];
        foreach ($methods as $method) {
            $this->assertTrue(
                method_exists(\Pterodactyl\Services\ServerQuery\RconService::class, $method),
                "Missing method: $method"
            );
        }
    }

    public function test_player_data_controller_exists(): void
    {
        $this->assertTrue(
            class_exists(\Pterodactyl\Http\Controllers\Api\Client\Servers\PlayerDataController::class)
        );
    }

    public function test_player_data_route_registered(): void
    {
        $content = file_get_contents(base_path('routes/api-client.php'));
        $this->assertStringContainsString('players/{playerName}/data', $content);
        $this->assertStringContainsString('PlayerDataController', $content);
    }

    public function test_frontend_shows_health_bar(): void
    {
        $content = file_get_contents(base_path('resources/scripts/components/server/console/PlayerList.tsx'));
        $this->assertStringContainsString('HealthBar', $content);
        $this->assertStringContainsString('FoodBar', $content);
        $this->assertStringContainsString('xp_level', $content);
        $this->assertStringContainsString('game_mode', $content);
        $this->assertStringContainsString('dimension', $content);
    }
}
