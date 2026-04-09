<?php

namespace Pterodactyl\Tests\Unit;

use PHPUnit\Framework\TestCase;

class ConfigHardeningTest extends TestCase
{
    /**
     * Verify captcha config structure has all required keys.
     */
    public function test_captcha_config_has_required_keys(): void
    {
        $config = require __DIR__ . '/../../config/pterodactyl.php';

        $this->assertArrayHasKey('captcha', $config);
        $this->assertArrayHasKey('provider', $config['captcha']);
        $this->assertArrayHasKey('turnstile', $config['captcha']);
        $this->assertArrayHasKey('hcaptcha', $config['captcha']);
        $this->assertArrayHasKey('recaptcha', $config['captcha']);
        $this->assertArrayHasKey('forms', $config['captcha']);

        // Each provider must have site_key and secret_key
        foreach (['turnstile', 'hcaptcha', 'recaptcha'] as $provider) {
            $this->assertArrayHasKey('site_key', $config['captcha'][$provider], "$provider missing site_key");
            $this->assertArrayHasKey('secret_key', $config['captcha'][$provider], "$provider missing secret_key");
        }

        // Forms config must have all three form types
        foreach (['login', 'forgot_password', 'reset_password'] as $form) {
            $this->assertArrayHasKey($form, $config['captcha']['forms'], "Missing form config: $form");
        }
    }

    /**
     * Verify the provider value is one of the allowed options.
     */
    public function test_captcha_provider_is_valid(): void
    {
        $validProviders = ['none', 'turnstile', 'hcaptcha', 'recaptcha'];
        $config = require __DIR__ . '/../../config/pterodactyl.php';

        // Default (without env) should be 'none'
        $this->assertContains($config['captcha']['provider'], $validProviders);
    }

    /**
     * Verify database config structure is valid.
     */
    public function test_database_config_has_mysql_connection(): void
    {
        $config = require __DIR__ . '/../../config/database.php';

        $this->assertArrayHasKey('connections', $config);
        $this->assertArrayHasKey('mysql', $config['connections']);
        $this->assertArrayHasKey('charset', $config['connections']['mysql']);
        $this->assertEquals('utf8mb4', $config['connections']['mysql']['charset']);
    }

    /**
     * Verify Redis config has password field for all connections.
     */
    public function test_redis_connections_have_password_field(): void
    {
        $config = require __DIR__ . '/../../config/database.php';

        $this->assertArrayHasKey('redis', $config);
        foreach (['default', 'sessions'] as $connection) {
            $this->assertArrayHasKey($connection, $config['redis'], "Redis connection '$connection' missing");
            $this->assertArrayHasKey('password', $config['redis'][$connection], "Redis '$connection' has no password field");
        }
    }

    /**
     * Verify asset hash config key exists.
     */
    public function test_asset_hash_config_exists(): void
    {
        $config = require __DIR__ . '/../../config/pterodactyl.php';

        $this->assertArrayHasKey('assets', $config);
        $this->assertArrayHasKey('use_hash', $config['assets']);
    }

    /**
     * Verify .env.example has all required config vars for new users.
     */
    public function test_env_example_has_captcha_vars(): void
    {
        $envExample = file_get_contents(__DIR__ . '/../../.env.example');

        $requiredVars = [
            'CAPTCHA_PROVIDER',
            'TURNSTILE_SITE_KEY',
            'TURNSTILE_SECRET_KEY',
            'CAPTCHA_LOGIN',
            'CAPTCHA_FORGOT_PASSWORD',
            'CAPTCHA_RESET_PASSWORD',
            'PTERODACTYL_USE_ASSET_HASH',
        ];

        foreach ($requiredVars as $var) {
            $this->assertStringContainsString($var, $envExample, ".env.example missing $var");
        }
    }

    /**
     * Verify email notification config has required keys.
     */
    public function test_email_notification_config(): void
    {
        $config = require __DIR__ . '/../../config/pterodactyl.php';

        $this->assertArrayHasKey('email', $config);
        $this->assertArrayHasKey('send_install_notification', $config['email']);
        $this->assertArrayHasKey('send_reinstall_notification', $config['email']);
    }
}
