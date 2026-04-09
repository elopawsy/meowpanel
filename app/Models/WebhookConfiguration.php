<?php

namespace Pterodactyl\Models;

class WebhookConfiguration extends Model
{
    public const RESOURCE_NAME = 'webhook_configuration';

    public const EVENT_SERVER_STARTED = 'server.started';
    public const EVENT_SERVER_STOPPED = 'server.stopped';
    public const EVENT_SERVER_CRASHED = 'server.crashed';
    public const EVENT_SERVER_INSTALLED = 'server.installed';
    public const EVENT_SERVER_BACKUP_COMPLETED = 'server.backup.completed';
    public const EVENT_SERVER_BACKUP_FAILED = 'server.backup.failed';

    public const ALL_EVENTS = [
        self::EVENT_SERVER_STARTED,
        self::EVENT_SERVER_STOPPED,
        self::EVENT_SERVER_CRASHED,
        self::EVENT_SERVER_INSTALLED,
        self::EVENT_SERVER_BACKUP_COMPLETED,
        self::EVENT_SERVER_BACKUP_FAILED,
    ];

    protected $table = 'webhook_configurations';

    protected $fillable = [
        'name',
        'url',
        'events',
        'enabled',
        'server_id',
    ];

    protected $casts = [
        'events' => 'array',
        'enabled' => 'boolean',
        'server_id' => 'integer',
    ];

    public static array $validationRules = [
        'name' => 'required|string|max:191',
        'url' => 'required|url|max:2048',
        'events' => 'required|array|min:1',
        'events.*' => 'string',
        'enabled' => 'boolean',
        'server_id' => 'nullable|integer|exists:servers,id',
    ];

    public function getRouteKeyName(): string
    {
        return 'id';
    }

    public function server()
    {
        return $this->belongsTo(Server::class);
    }

    /**
     * Check if this webhook is subscribed to the given event.
     */
    public function subscribedTo(string $event): bool
    {
        return $this->enabled && in_array($event, $this->events ?? [], true);
    }
}
