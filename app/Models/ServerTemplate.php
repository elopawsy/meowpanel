<?php

namespace Pterodactyl\Models;

class ServerTemplate extends Model
{
    public const RESOURCE_NAME = 'server_template';

    protected $table = 'server_templates';

    protected $fillable = [
        'name',
        'description',
        'egg_id',
        'docker_image',
        'startup',
        'environment',
        'memory',
        'disk',
        'cpu',
        'created_by',
    ];

    protected $casts = [
        'environment' => 'array',
        'egg_id' => 'integer',
        'memory' => 'integer',
        'disk' => 'integer',
        'cpu' => 'integer',
        'created_by' => 'integer',
    ];

    public static array $validationRules = [
        'name' => 'required|string|max:191',
        'description' => 'nullable|string|max:2000',
        'egg_id' => 'required|integer|exists:eggs,id',
        'docker_image' => 'required|string|max:500',
        'startup' => 'required|string|max:2000',
        'environment' => 'required|array',
        'memory' => 'required|integer|min:64',
        'disk' => 'required|integer|min:256',
        'cpu' => 'required|integer|min:0',
        'created_by' => 'required|integer|exists:users,id',
    ];

    public function getRouteKeyName(): string
    {
        return 'id';
    }

    public function egg()
    {
        return $this->belongsTo(Egg::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Environment variable names that should never be captured in templates.
     */
    private const SENSITIVE_ENV_PATTERNS = [
        'PASSWORD', 'SECRET', 'TOKEN', 'KEY', 'RCON', 'AUTH',
    ];

    /**
     * Create a template from an existing server.
     * Sensitive environment variables (passwords, tokens, etc.) are excluded.
     */
    public static function fromServer(Server $server, string $name, ?string $description = null): self
    {
        $environment = $server->variables
            ->pluck('server_value', 'env_variable')
            ->filter(function ($value, $key) {
                foreach (self::SENSITIVE_ENV_PATTERNS as $pattern) {
                    if (stripos($key, $pattern) !== false) {
                        return false;
                    }
                }
                return true;
            })
            ->all();

        return static::create([
            'name' => $name,
            'description' => $description,
            'egg_id' => $server->egg_id,
            'docker_image' => $server->image,
            'startup' => $server->startup,
            'environment' => $environment,
            'memory' => $server->memory,
            'disk' => $server->disk,
            'cpu' => $server->cpu,
            'created_by' => $server->owner_id,
        ]);
    }
}
