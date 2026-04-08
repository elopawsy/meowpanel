<?php

namespace Pterodactyl\Services\ServerQuery;

use Exception;

class MinecraftQueryService
{
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

        // Send handshake + status request
        fwrite($socket, $this->buildHandshake($host, $port));
        fwrite($socket, $this->buildStatusRequest());

        // Read response length
        $length = $this->readVarInt($socket);
        if ($length < 1) {
            fclose($socket);
            throw new Exception('Empty response from server.');
        }

        // Read packet ID (should be 0x00)
        $this->readVarInt($socket);

        // Read JSON string length
        $jsonLength = $this->readVarInt($socket);

        // Read JSON data
        $json = '';
        while (strlen($json) < $jsonLength) {
            $chunk = fread($socket, $jsonLength - strlen($json));
            if ($chunk === false || $chunk === '') {
                break;
            }
            $json .= $chunk;
        }

        fclose($socket);

        $data = json_decode($json, true);
        if (!$data) {
            throw new Exception('Invalid JSON response from server.');
        }

        return [
            'online'  => $data['players']['online'] ?? 0,
            'max'     => $data['players']['max'] ?? 0,
            'players' => array_map(
                fn ($p) => $p['name'],
                $data['players']['sample'] ?? []
            ),
            'version' => $data['version']['name'] ?? 'Unknown',
            'motd'    => $this->stripFormatting($this->extractMotd($data['description'] ?? '')),
        ];
    }

    private function buildHandshake(string $host, int $port): string
    {
        $payload = $this->packVarInt(0x00);  // Packet ID
        $payload .= $this->packVarInt(47);   // Protocol version
        $payload .= $this->packString($host);
        $payload .= pack('n', $port);        // Port as unsigned short
        $payload .= $this->packVarInt(1);    // Next state: status

        return $this->packVarInt(strlen($payload)) . $payload;
    }

    private function buildStatusRequest(): string
    {
        $payload = $this->packVarInt(0x00); // Packet ID
        return $this->packVarInt(strlen($payload)) . $payload;
    }

    private function readVarInt($socket): int
    {
        $value = 0;
        $shift = 0;
        do {
            $byte = fread($socket, 1);
            if ($byte === false || $byte === '') {
                break;
            }
            $byte = ord($byte);
            $value |= ($byte & 0x7F) << $shift;
            $shift += 7;
        } while ($byte & 0x80);

        return $value;
    }

    private function packVarInt(int $value): string
    {
        $bytes = '';
        do {
            $byte = $value & 0x7F;
            $value >>= 7;
            if ($value !== 0) {
                $byte |= 0x80;
            }
            $bytes .= chr($byte);
        } while ($value !== 0);

        return $bytes;
    }

    private function packString(string $str): string
    {
        return $this->packVarInt(strlen($str)) . $str;
    }

    private function extractMotd(mixed $description): string
    {
        if (is_string($description)) {
            return $description;
        }
        if (is_array($description)) {
            return $description['text'] ?? '';
        }
        return '';
    }

    private function stripFormatting(string $text): string
    {
        return preg_replace('/§[0-9a-fk-or]/i', '', $text);
    }
}
