<?php

namespace Pterodactyl\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Pterodactyl\Models\ServerTemplate;

class ServerTemplateTest extends TestCase
{
    public function test_model_exists(): void
    {
        $this->assertTrue(class_exists(ServerTemplate::class));
    }

    public function test_fillable_fields(): void
    {
        $template = new ServerTemplate();
        $fillable = $template->getFillable();

        $this->assertContains('name', $fillable);
        $this->assertContains('egg_id', $fillable);
        $this->assertContains('docker_image', $fillable);
        $this->assertContains('startup', $fillable);
        $this->assertContains('environment', $fillable);
        $this->assertContains('memory', $fillable);
        $this->assertContains('disk', $fillable);
        $this->assertContains('cpu', $fillable);
        $this->assertContains('created_by', $fillable);
    }

    public function test_environment_cast_to_array(): void
    {
        $template = new ServerTemplate();
        $casts = $template->getCasts();

        $this->assertEquals('array', $casts['environment']);
    }

    public function test_validation_rules_exist(): void
    {
        $rules = ServerTemplate::$validationRules;

        $this->assertArrayHasKey('name', $rules);
        $this->assertArrayHasKey('egg_id', $rules);
        $this->assertArrayHasKey('docker_image', $rules);
        $this->assertArrayHasKey('startup', $rules);
        $this->assertArrayHasKey('environment', $rules);
        $this->assertArrayHasKey('memory', $rules);
        $this->assertArrayHasKey('disk', $rules);
        $this->assertArrayHasKey('cpu', $rules);
    }

    public function test_has_from_server_static_method(): void
    {
        $this->assertTrue(method_exists(ServerTemplate::class, 'fromServer'));
    }

    public function test_controller_exists(): void
    {
        $this->assertTrue(
            class_exists(\Pterodactyl\Http\Controllers\Api\Client\Servers\ServerTemplateController::class)
        );
    }

    public function test_migration_file_exists(): void
    {
        $files = glob(base_path('database/migrations/*create_server_templates_table.php'));
        $this->assertNotEmpty($files, 'Migration file for server_templates not found');
    }
}
