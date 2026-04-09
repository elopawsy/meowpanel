<?php

namespace Pterodactyl\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Pterodactyl\Http\Controllers\Api\Client\Servers\ModrinthController;

class ModrinthControllerTest extends TestCase
{
    public function test_controller_exists(): void
    {
        $this->assertTrue(class_exists(ModrinthController::class));
    }

    public function test_controller_has_required_methods(): void
    {
        $methods = ['versions', 'install', 'installed', 'uninstall'];
        foreach ($methods as $method) {
            $this->assertTrue(
                method_exists(ModrinthController::class, $method),
                "Missing method: $method"
            );
        }
    }

    public function test_modrinth_api_routes_registered(): void
    {
        $content = file_get_contents(base_path('routes/api-client.php'));
        $this->assertStringContainsString('/modrinth', $content);
        $this->assertStringContainsString('ModrinthController', $content);
        $this->assertStringContainsString('versions', $content);
        $this->assertStringContainsString('install', $content);
        $this->assertStringContainsString('installed', $content);
        $this->assertStringContainsString('uninstall', $content);
    }

    public function test_egg_feature_config_exists(): void
    {
        $this->assertFileExists(base_path('config/egg_features/modrinth.php'));
    }

    public function test_route_is_visible_in_frontend(): void
    {
        $content = file_get_contents(base_path('resources/scripts/routers/routes.ts'));
        // Should NOT be marked as isSubRoute (hidden)
        $this->assertStringNotContainsString("isSubRoute: true, // Hidden until modrinth", $content);
        // Should have Puzzle icon
        $this->assertStringContainsString('Puzzle', $content);
        // Should have modrinth egg feature
        $this->assertStringContainsString("eggFeature: 'modrinth'", $content);
    }

    public function test_install_validates_url_domain(): void
    {
        // The controller validates URL starts with https://cdn.modrinth.com/
        $content = file_get_contents(base_path('app/Http/Controllers/Api/Client/Servers/ModrinthController.php'));
        $this->assertStringContainsString('starts_with:https://cdn.modrinth.com/', $content);
    }

    public function test_install_validates_filename_is_jar(): void
    {
        $content = file_get_contents(base_path('app/Http/Controllers/Api/Client/Servers/ModrinthController.php'));
        $this->assertStringContainsString('.jar', $content);
    }

    public function test_frontend_api_client_exists(): void
    {
        $this->assertFileExists(base_path('resources/scripts/api/server/modrinth.ts'));
    }

    public function test_installed_mods_component_exists(): void
    {
        $this->assertFileExists(
            base_path('resources/scripts/components/server/modrinth/InstalledMods.tsx')
        );
    }
}
