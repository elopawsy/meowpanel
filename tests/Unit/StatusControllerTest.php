<?php

namespace Pterodactyl\Tests\Unit;

use PHPUnit\Framework\TestCase;

class StatusControllerTest extends TestCase
{
    /**
     * Verify the public API route file exists and is loadable.
     */
    public function test_public_route_file_exists(): void
    {
        $this->assertFileExists(base_path('routes/api-public.php'));
    }

    /**
     * Verify the status controller class exists.
     */
    public function test_status_controller_exists(): void
    {
        $this->assertTrue(
            class_exists(\Pterodactyl\Http\Controllers\Api\Public\StatusController::class)
        );
    }

    /**
     * Verify the status page controller exists.
     */
    public function test_status_page_controller_exists(): void
    {
        $this->assertTrue(
            class_exists(\Pterodactyl\Http\Controllers\Base\StatusPageController::class)
        );
    }

    /**
     * Verify the Blade view exists.
     */
    public function test_status_blade_view_exists(): void
    {
        $this->assertFileExists(
            base_path('resources/views/status.blade.php')
        );
    }

    /**
     * Verify route service provider includes public API routes.
     */
    public function test_route_service_provider_has_public_api(): void
    {
        $content = file_get_contents(base_path('app/Providers/RouteServiceProvider.php'));
        $this->assertStringContainsString('api-public.php', $content);
        $this->assertStringContainsString('/api/public', $content);
    }

    /**
     * Verify the status page route is defined in base routes without auth.
     */
    public function test_status_route_is_public(): void
    {
        $content = file_get_contents(base_path('routes/base.php'));
        $this->assertStringContainsString('StatusPageController', $content);
        $this->assertStringContainsString("withoutMiddleware(['auth'", $content);
    }
}
