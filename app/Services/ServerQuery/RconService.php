<?php

namespace Pterodactyl\Services\ServerQuery;

use Exception;

class RconService
{
    private const PACKET_LOGIN = 3;
    private const PACKET_COMMAND = 2;
    private const PACKET_RESPONSE = 0;

    private $socket = null;
    private int $requestId = 0;

    /**
     * Connect and authenticate to a Minecraft RCON server.
     *
     * @throws Exception
     */
    public function connect(string $host, int $port, string $password, int $timeout = 3): void
    {
        $this->socket = @fsockopen($host, $port, $errno, $errstr, $timeout);
        if (!$this->socket) {
            throw new Exception("RCON connection failed ({$errno}): {$errstr}");
        }

        stream_set_timeout($this->socket, $timeout);

        // Authenticate
        $response = $this->sendPacket(self::PACKET_LOGIN, $password);
        if ($response === false || $response['id'] === -1) {
            $this->disconnect();
            throw new Exception('RCON authentication failed.');
        }
    }

    /**
     * Send a command and return the response string.
     *
     * @throws Exception
     */
    public function command(string $command): string
    {
        if (!$this->socket) {
            throw new Exception('Not connected to RCON.');
        }

        $response = $this->sendPacket(self::PACKET_COMMAND, $command);
        if ($response === false) {
            throw new Exception('RCON command failed.');
        }

        return $response['body'];
    }

    public function disconnect(): void
    {
        if ($this->socket) {
            fclose($this->socket);
            $this->socket = null;
        }
    }

    public function __destruct()
    {
        $this->disconnect();
    }

    /**
     * Send a packet and read the response.
     */
    private function sendPacket(int $type, string $body): array|false
    {
        $id = ++$this->requestId;

        // Build packet: id (4) + type (4) + body + \0\0
        $payload = pack('V', $id) . pack('V', $type) . $body . "\x00\x00";
        $packet = pack('V', strlen($payload)) . $payload;

        if (fwrite($this->socket, $packet) === false) {
            return false;
        }

        return $this->readPacket();
    }

    /**
     * Read a response packet.
     */
    private function readPacket(): array|false
    {
        // Read length (4 bytes)
        $lengthRaw = fread($this->socket, 4);
        if ($lengthRaw === false || strlen($lengthRaw) < 4) {
            return false;
        }
        $length = unpack('V', $lengthRaw)[1];

        if ($length < 10 || $length > 4096) {
            return false;
        }

        // Read rest of packet
        $data = '';
        while (strlen($data) < $length) {
            $chunk = fread($this->socket, $length - strlen($data));
            if ($chunk === false || $chunk === '') {
                return false;
            }
            $data .= $chunk;
        }

        $id = unpack('V', substr($data, 0, 4))[1];
        // Handle signed int for auth failure (-1)
        if ($id === 0xFFFFFFFF) {
            $id = -1;
        }
        $type = unpack('V', substr($data, 4, 4))[1];
        $body = substr($data, 8, -2); // Strip trailing \0\0

        return ['id' => $id, 'type' => $type, 'body' => $body];
    }

    /**
     * Query player data via /data get entity.
     * Returns parsed stats or null if player not found.
     */
    public function getPlayerData(string $playerName): ?array
    {
        // Validate player name to prevent RCON command injection.
        // Minecraft usernames: 3-16 chars, alphanumeric + underscore only.
        if (!preg_match('/^[a-zA-Z0-9_]{3,16}$/', $playerName)) {
            return null;
        }

        try {
            $response = $this->command("data get entity {$playerName}");
        } catch (Exception) {
            return null;
        }

        // Response looks like: "Player has the following entity data: {Health:20.0f,Pos:[d;1.0,64.0,1.0],...}"
        if (!str_contains($response, 'entity data:')) {
            return null;
        }

        $result = [
            'health' => null,
            'max_health' => 20.0,
            'food_level' => null,
            'xp_level' => null,
            'game_mode' => null,
            'position' => null,
            'dimension' => null,
        ];

        // Parse Health
        if (preg_match('/Health:\s*([\d.]+)f/', $response, $m)) {
            $result['health'] = (float) $m[1];
        }

        // Parse FoodLevel
        if (preg_match('/foodLevel:\s*(\d+)/', $response, $m)) {
            $result['food_level'] = (int) $m[1];
        }

        // Parse XpLevel
        if (preg_match('/XpLevel:\s*(\d+)/', $response, $m)) {
            $result['xp_level'] = (int) $m[1];
        }

        // Parse playerGameType (0=survival, 1=creative, 2=adventure, 3=spectator)
        if (preg_match('/playerGameType:\s*(\d+)/', $response, $m)) {
            $gameTypes = [0 => 'Survival', 1 => 'Creative', 2 => 'Adventure', 3 => 'Spectator'];
            $result['game_mode'] = $gameTypes[(int) $m[1]] ?? 'Unknown';
        }

        // Parse Pos (list of doubles)
        if (preg_match('/Pos:\s*\[.*?([-\d.]+)d,\s*([-\d.]+)d,\s*([-\d.]+)d/', $response, $m)) {
            $result['position'] = [
                'x' => round((float) $m[1]),
                'y' => round((float) $m[2]),
                'z' => round((float) $m[3]),
            ];
        }

        // Parse Dimension
        if (preg_match('/Dimension:\s*"([^"]+)"/', $response, $m)) {
            $dim = $m[1];
            $result['dimension'] = match ($dim) {
                'minecraft:overworld' => 'Overworld',
                'minecraft:the_nether' => 'Nether',
                'minecraft:the_end' => 'The End',
                default => $dim,
            };
        }

        return $result;
    }
}
