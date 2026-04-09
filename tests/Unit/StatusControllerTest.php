<?php

namespace Pterodactyl\Tests\Unit;

use PHPUnit\Framework\TestCase;

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
            'Global status listing should not exist'
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
        // The formatServer / show method should not include 'address' or IP fields
        $this->assertStringNotContainsString("'address'", $content);
        $this->assertStringNotContainsString("'ip'", $content);
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
