<?php

namespace Pterodactyl\Services\ServerQuery;

use Exception;

class MinecraftQueryService
{
    /**
     * Protocol version -1 signals "version-agnostic" status query.
     * Works with all Minecraft servers 1.7+ without version negotiation.
     */
    private const PROTOCOL_VERSION = -1;

    /**
     * Maximum number of bytes to read for a VarInt (5 bytes = 32 bits).
     */
    private const VARINT_MAX_BYTES = 5;

    /**
     * Query a Minecraft server using the Server List Ping protocol (1.7+).
     *
     * @throws Exception
     */
    public function query(string $host, int $port, int $timeout = 3): array
    {
        $socket = @fsockopen($host, $port, $errno, $errstr, $timeout);
        if (!$socket) {
            throw new Exception("Cannot connect to server ({$errno}): {$errstr}");
        }

        stream_set_timeout($socket, $timeout);

        try {
            // Send handshake + status request
            fwrite($socket, $this->buildHandshake($host, $port));
            fwrite($socket, $this->buildStatusRequest());

            // Read response length
            $length = $this->readVarInt($socket);
            if ($length < 1) {
                throw new Exception('Empty response from server.');
            }

            // Read packet ID (should be 0x00)
            $this->readVarInt($socket);

            // Read JSON string length
            $jsonLength = $this->readVarInt($socket);
            if ($jsonLength < 1 || $jsonLength > 1024 * 1024) {
                throw new Exception('Invalid JSON response length.');
            }

            // Read JSON data
            $json = '';
            while (strlen($json) < $jsonLength) {
                $chunk = fread($socket, $jsonLength - strlen($json));
                if ($chunk === false || $chunk === '') {
                    break;
                }
                $json .= $chunk;
            }
        } finally {
            fclose($socket);
        }

        $data = json_decode($json, true);
        if (!is_array($data)) {
            throw new Exception('Invalid JSON response from server.');
        }

        return $this->parseResponse($data);
    }

    /**
     * Parse the raw JSON response into a normalized array.
     */
    public function parseResponse(array $data): array
    {
        return [
            'online'  => $data['players']['online'] ?? 0,
            'max'     => $data['players']['max'] ?? 0,
            'players' => array_map(
                fn ($p) => $p['name'] ?? 'Unknown',
                $data['players']['sample'] ?? []
            ),
            'version' => $data['version']['name'] ?? 'Unknown',
            'motd'    => $this->stripFormatting($this->extractMotd($data['description'] ?? '')),
        ];
    }

    public function buildHandshake(string $host, int $port): string
    {
        $payload = $this->packVarInt(0x00);                  // Packet ID
        $payload .= $this->packVarInt(self::PROTOCOL_VERSION); // Protocol version (-1 = version-agnostic)
        $payload .= $this->packString($host);
        $payload .= pack('n', $port);                        // Port as unsigned short
        $payload .= $this->packVarInt(1);                    // Next state: status

        return $this->packVarInt(strlen($payload)) . $payload;
    }

    public function buildStatusRequest(): string
    {
        $payload = $this->packVarInt(0x00); // Packet ID
        return $this->packVarInt(strlen($payload)) . $payload;
    }

    public function readVarInt($socket): int
    {
        $value = 0;
        $shift = 0;
        $bytesRead = 0;

        do {
            $byte = fread($socket, 1);
            if ($byte === false || $byte === '') {
                break;
            }
            $byte = ord($byte);
            $value |= ($byte & 0x7F) << $shift;
            $shift += 7;
            $bytesRead++;

            if ($bytesRead > self::VARINT_MAX_BYTES) {
                throw new Exception('VarInt too long (> 5 bytes).');
            }
        } while ($byte & 0x80);

        return $value;
    }

    public function packVarInt(int $value): string
    {
        // Handle negative values (like -1) by masking to unsigned 32-bit
        $value = $value & 0xFFFFFFFF;

        $bytes = '';
        do {
            $byte = $value & 0x7F;
            $value >>= 7;
            // After shift, mask again to prevent sign extension in PHP
            $value &= 0x01FFFFFF;
            if ($value !== 0) {
                $byte |= 0x80;
            }
            $bytes .= chr($byte);
        } while ($value !== 0);

        return $bytes;
    }

    public function packString(string $str): string
    {
        return $this->packVarInt(strlen($str)) . $str;
    }

    /**
     * Extract MOTD text from the description field.
     * Handles both plain string and chat component format (1.7+ JSON).
     */
    public function extractMotd(mixed $description): string
    {
        if (is_string($description)) {
            return $description;
        }

        if (!is_array($description)) {
            return '';
        }

        $text = $description['text'] ?? '';

        // Chat component format is recursive: { "text": "...", "extra": [{"text": "...", "extra": [...]}, ...] }
        if (isset($description['extra']) && is_array($description['extra'])) {
            foreach ($description['extra'] as $component) {
                $text .= $this->extractMotd($component);
            }
        }

        return $text;
    }

    public function stripFormatting(string $text): string
    {
        return preg_replace('/§[0-9a-fk-or]/i', '', $text);
    }
}
