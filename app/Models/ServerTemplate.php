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
     * Create a template from an existing server.
     */
    public static function fromServer(Server $server, string $name, ?string $description = null): self
    {
        return static::create([
            'name' => $name,
            'description' => $description,
            'egg_id' => $server->egg_id,
            'docker_image' => $server->image,
            'startup' => $server->startup,
            'environment' => $server->variables->pluck('server_value', 'env_variable')->all(),
            'memory' => $server->memory,
            'disk' => $server->disk,
            'cpu' => $server->cpu,
            'created_by' => $server->owner_id,
        ]);
    }
}
