<?php

namespace Pterodactyl\Tests\Unit;

use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionMethod;

class StatusControllerTest extends TestCase
{
    public function test_status_controller_exists(): void
    {
        $this->assertTrue(
            class_exists(\Pterodactyl\Http\Controllers\Api\Public\StatusController::class)
        );
    }

    public function test_status_controller_has_show_method(): void
    {
        $this->assertTrue(
            method_exists(\Pterodactyl\Http\Controllers\Api\Public\StatusController::class, 'show')
        );
    }

    public function test_status_controller_has_no_index_method(): void
    {
        $this->assertFalse(
            method_exists(\Pterodactyl\Http\Controllers\Api\Public\StatusController::class, 'index'),
            'Global status listing should not exist — only per-server status is allowed'
        );
    }

    public function test_status_page_controller_has_show_method(): void
    {
        $this->assertTrue(
            method_exists(\Pterodactyl\Http\Controllers\Base\StatusPageController::class, 'show')
        );
    }

    public function test_blade_view_exists(): void
    {
        $this->assertFileExists(base_path('resources/views/status.blade.php'));
    }

    public function test_api_response_does_not_expose_ip(): void
    {
        $content = file_get_contents(base_path('app/Http/Controllers/Api/Public/StatusController.php'));
        $this->assertStringNotContainsString("'address'", $content);
        $this->assertStringNotContainsString("'ip'", $content);
    }

    public function test_status_controller_requires_opt_in(): void
    {
        $content = file_get_contents(base_path('app/Http/Controllers/Api/Public/StatusController.php'));
        $this->assertStringContainsString('public_status_enabled', $content,
            'StatusController must check public_status_enabled opt-in flag'
        );
    }

    public function test_status_page_controller_requires_opt_in(): void
    {
        $content = file_get_contents(base_path('app/Http/Controllers/Base/StatusPageController.php'));
        $this->assertStringContainsString('public_status_enabled', $content,
            'StatusPageController must check public_status_enabled opt-in flag'
        );
    }

    public function test_migration_for_opt_in_flag_exists(): void
    {
        $files = glob(base_path('database/migrations/*add_public_status_enabled_to_servers*'));
        $this->assertNotEmpty($files, 'Migration for public_status_enabled column not found');
    }

    public function test_server_model_casts_opt_in_flag(): void
    {
        $model = new \Pterodactyl\Models\Server();
        $casts = $model->getCasts();
        $this->assertArrayHasKey('public_status_enabled', $casts);
        $this->assertEquals('boolean', $casts['public_status_enabled']);
    }

    public function test_server_model_defaults_opt_in_to_false(): void
    {
        $model = new \Pterodactyl\Models\Server();
        $this->assertFalse($model->public_status_enabled);
    }

    public function test_query_server_status_is_private(): void
    {
        $reflection = new ReflectionClass(\Pterodactyl\Http\Controllers\Api\Public\StatusController::class);
        $method = $reflection->getMethod('queryServerStatus');
        $this->assertTrue($method->isPrivate(), 'queryServerStatus should be private');
    }

    public function test_public_route_requires_uuid_short(): void
    {
        $content = file_get_contents(base_path('routes/api-public.php'));
        $this->assertStringContainsString('{uuidShort}', $content);
        $this->assertStringNotContainsString("'/status'", $content, 'No global /status route should exist');
    }

    public function test_base_route_requires_uuid_short(): void
    {
        $content = file_get_contents(base_path('routes/base.php'));
        $this->assertStringContainsString('/status/{uuidShort}', $content);
    }
}
