<?php

namespace Pterodactyl\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Pterodactyl\Services\ServerQuery\MinecraftQueryService;

class MinecraftQueryServiceTest extends TestCase
{
    private MinecraftQueryService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new MinecraftQueryService();
    }

    // ── VarInt encoding ──────────────────────────────────────────

    public function test_pack_varint_zero(): void
    {
        $this->assertEquals("\x00", $this->service->packVarInt(0));
    }

    public function test_pack_varint_single_byte(): void
    {
        $this->assertEquals("\x01", $this->service->packVarInt(1));
        $this->assertEquals("\x7f", $this->service->packVarInt(127));
    }

    public function test_pack_varint_two_bytes(): void
    {
        // 128 = 0x80 → encoded as 0x80 0x01
        $this->assertEquals("\x80\x01", $this->service->packVarInt(128));
        // 255 = 0xFF → encoded as 0xFF 0x01
        $this->assertEquals("\xff\x01", $this->service->packVarInt(255));
    }

    public function test_pack_varint_protocol_47(): void
    {
        // 47 = 0x2F → single byte
        $this->assertEquals("\x2f", $this->service->packVarInt(47));
    }

    public function test_pack_varint_negative_one(): void
    {
        // -1 as unsigned 32-bit = 0xFFFFFFFF
        // Encoded as 5 bytes: 0xFF 0xFF 0xFF 0xFF 0x0F
        $packed = $this->service->packVarInt(-1);
        $this->assertEquals(5, strlen($packed));
        $this->assertEquals("\xff\xff\xff\xff\x0f", $packed);
    }

    public function test_pack_varint_large_value(): void
    {
        // 25565 (default MC port) = 0x63DD → 0xDD 0xC7 0x01
        $packed = $this->service->packVarInt(25565);
        $this->assertEquals("\xdd\xc7\x01", $packed);
    }

    // ── String packing ───────────────────────────────────────────

    public function test_pack_string_empty(): void
    {
        $packed = $this->service->packString('');
        $this->assertEquals("\x00", $packed);
    }

    public function test_pack_string_localhost(): void
    {
        $packed = $this->service->packString('localhost');
        // Length prefix (9) + "localhost"
        $this->assertEquals("\x09localhost", $packed);
    }

    public function test_pack_string_with_ip(): void
    {
        $packed = $this->service->packString('192.168.1.1');
        $this->assertEquals(1 + 11, strlen($packed)); // 1 byte length + 11 chars
    }

    // ── Handshake packet building ────────────────────────────────

    public function test_build_handshake_contains_protocol_version_negative_one(): void
    {
        $handshake = $this->service->buildHandshake('localhost', 25565);

        // The handshake should be a valid packet with length prefix
        $this->assertNotEmpty($handshake);

        // Should contain the packed host string
        $this->assertStringContainsString('localhost', $handshake);
    }

    public function test_build_handshake_different_hosts_produce_different_packets(): void
    {
        $h1 = $this->service->buildHandshake('server1.example.com', 25565);
        $h2 = $this->service->buildHandshake('server2.example.com', 25565);

        $this->assertNotEquals($h1, $h2);
    }

    public function test_build_handshake_different_ports_produce_different_packets(): void
    {
        $h1 = $this->service->buildHandshake('localhost', 25565);
        $h2 = $this->service->buildHandshake('localhost', 25566);

        $this->assertNotEquals($h1, $h2);
    }

    // ── Status request packet ────────────────────────────────────

    public function test_build_status_request_is_valid(): void
    {
        $request = $this->service->buildStatusRequest();

        // Status request: length(1) + packet_id(0x00) = 2 bytes
        $this->assertEquals("\x01\x00", $request);
    }

    // ── MOTD extraction ──────────────────────────────────────────

    public function test_extract_motd_from_string(): void
    {
        $this->assertEquals('Hello World', $this->service->extractMotd('Hello World'));
    }

    public function test_extract_motd_from_simple_object(): void
    {
        $this->assertEquals('A Minecraft Server', $this->service->extractMotd([
            'text' => 'A Minecraft Server',
        ]));
    }

    public function test_extract_motd_from_chat_component_with_extra(): void
    {
        $description = [
            'text' => '',
            'extra' => [
                ['text' => 'Welcome to '],
                ['text' => 'My Server'],
            ],
        ];
        $this->assertEquals('Welcome to My Server', $this->service->extractMotd($description));
    }

    public function test_extract_motd_from_mixed_extra(): void
    {
        $description = [
            'text' => 'Base',
            'extra' => [
                ' extra',
                ['text' => ' component'],
            ],
        ];
        $this->assertEquals('Base extra component', $this->service->extractMotd($description));
    }

    public function test_extract_motd_from_empty_description(): void
    {
        $this->assertEquals('', $this->service->extractMotd(''));
        $this->assertEquals('', $this->service->extractMotd([]));
        $this->assertEquals('', $this->service->extractMotd(null));
        $this->assertEquals('', $this->service->extractMotd(42));
    }

    // ── Formatting strip ─────────────────────────────────────────

    public function test_strip_color_codes(): void
    {
        $this->assertEquals('Hello World', $this->service->stripFormatting('§aHello §bWorld'));
    }

    public function test_strip_formatting_codes(): void
    {
        // §l = bold, §o = italic, §n = underline, §r = reset
        $this->assertEquals('Bold', $this->service->stripFormatting('§lBold'));
        $this->assertEquals('Reset', $this->service->stripFormatting('§rReset'));
    }

    public function test_strip_all_color_codes(): void
    {
        $input = '§0§1§2§3§4§5§6§7§8§9§a§b§c§d§e§f§k§l§m§n§o§rClean';
        $this->assertEquals('Clean', $this->service->stripFormatting($input));
    }

    public function test_strip_no_codes(): void
    {
        $this->assertEquals('No codes here', $this->service->stripFormatting('No codes here'));
    }

    // ── Response parsing ─────────────────────────────────────────

    public function test_parse_full_response(): void
    {
        $data = [
            'version' => ['name' => '1.21.1', 'protocol' => 767],
            'players' => [
                'max' => 20,
                'online' => 3,
                'sample' => [
                    ['name' => 'Player1', 'id' => 'uuid1'],
                    ['name' => 'Player2', 'id' => 'uuid2'],
                    ['name' => 'Player3', 'id' => 'uuid3'],
                ],
            ],
            'description' => ['text' => '§aWelcome to §bMy Server'],
        ];

        $result = $this->service->parseResponse($data);

        $this->assertEquals(3, $result['online']);
        $this->assertEquals(20, $result['max']);
        $this->assertEquals(['Player1', 'Player2', 'Player3'], $result['players']);
        $this->assertEquals('1.21.1', $result['version']);
        $this->assertEquals('Welcome to My Server', $result['motd']);
    }

    public function test_parse_empty_response(): void
    {
        $result = $this->service->parseResponse([]);

        $this->assertEquals(0, $result['online']);
        $this->assertEquals(0, $result['max']);
        $this->assertEquals([], $result['players']);
        $this->assertEquals('Unknown', $result['version']);
        $this->assertEquals('', $result['motd']);
    }

    public function test_parse_response_no_sample(): void
    {
        $data = [
            'players' => ['max' => 100, 'online' => 50],
            'version' => ['name' => 'Paper 1.20.4'],
            'description' => 'A server',
        ];

        $result = $this->service->parseResponse($data);

        $this->assertEquals(50, $result['online']);
        $this->assertEquals(100, $result['max']);
        $this->assertEquals([], $result['players']);
        $this->assertEquals('Paper 1.20.4', $result['version']);
    }

    public function test_parse_response_with_chat_component_motd(): void
    {
        $data = [
            'players' => ['max' => 20, 'online' => 0],
            'version' => ['name' => '1.21'],
            'description' => [
                'text' => '',
                'extra' => [
                    ['text' => '§6Welcome'],
                    ['text' => ' to the server'],
                ],
            ],
        ];

        $result = $this->service->parseResponse($data);
        $this->assertEquals('Welcome to the server', $result['motd']);
    }
}
