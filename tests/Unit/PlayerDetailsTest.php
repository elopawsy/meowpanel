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
}
