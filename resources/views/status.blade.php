<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $serverName }} — Status</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            background: #0a0a0a;
            color: #e4e4e7;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem 1rem;
        }
        .card {
            width: 100%;
            max-width: 480px;
        }
        .header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
        }
        .status-dot {
            width: 14px; height: 14px;
            border-radius: 50%;
            flex-shrink: 0;
            transition: all 0.3s;
        }
        .status-dot.online {
            background: #22c55e;
            box-shadow: 0 0 12px rgba(34,197,94,0.5);
            animation: pulse 2s ease-in-out infinite;
        }
        .status-dot.offline { background: #52525b; }
        @keyframes pulse {
            0%, 100% { box-shadow: 0 0 8px rgba(34,197,94,0.4); }
            50% { box-shadow: 0 0 16px rgba(34,197,94,0.6); }
        }
        .server-name {
            font-size: 1.25rem;
            font-weight: 700;
        }
        .status-label {
            font-size: 0.75rem;
            color: #71717a;
        }
        .info-box {
            background: linear-gradient(to bottom, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 0.75rem;
            padding: 1.25rem;
            margin-bottom: 0.75rem;
        }
        .stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
        }
        .stat-label {
            font-size: 0.6875rem;
            color: #71717a;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .players-title {
            font-size: 0.75rem;
            font-weight: 600;
            color: #a1a1aa;
            margin-bottom: 0.5rem;
        }
        .players-list {
            display: flex;
            flex-wrap: wrap;
            gap: 0.375rem;
        }
        .player-tag {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            padding: 0.25rem 0.625rem;
            border-radius: 0.5rem;
            font-size: 0.75rem;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            color: #d4d4d8;
        }
        .player-tag .dot {
            width: 6px; height: 6px;
            border-radius: 50%;
            background: #4ade80;
        }
        .empty-players {
            color: #52525b;
            font-size: 0.8125rem;
            padding: 0.5rem 0;
        }
        .footer {
            text-align: center;
            color: #27272a;
            font-size: 0.6875rem;
            margin-top: 1.5rem;
        }
        .loading {
            text-align: center;
            color: #71717a;
            padding: 2rem 0;
        }
        .game-badge {
            display: inline-block;
            padding: 0.125rem 0.5rem;
            border-radius: 0.375rem;
            font-size: 0.6875rem;
            background: rgba(88, 101, 242, 0.15);
            border: 1px solid rgba(88, 101, 242, 0.25);
            color: #818cf8;
            margin-top: 0.25rem;
        }
    </style>
</head>
<body>
    <div class="card" id="card">
        <div class="loading">Loading...</div>
    </div>

    <script>
        const UUID = @json($uuidShort);
        const API_URL = '/api/public/status/' + UUID;
        const REFRESH_INTERVAL = 30000;

        function render(server) {
            const s = server.status || {};
            const isOnline = !!s.online;
            const players = s.players || 0;
            const maxPlayers = s.max_players || 0;
            const playerNames = s.player_list || [];
            const version = s.version || '';

            document.getElementById('card').innerHTML = `
                <div class="header">
                    <div class="status-dot ${isOnline ? 'online' : 'offline'}"></div>
                    <div>
                        <div class="server-name">${esc(server.name)}</div>
                        <div class="status-label">${isOnline ? 'Online' : 'Offline'}${version ? ' &middot; ' + esc(version) : ''}</div>
                    </div>
                </div>

                ${server.game ? `<div class="game-badge">${esc(server.game)}</div>` : ''}

                <div class="info-box" style="margin-top: 1rem;">
                    <div class="stats">
                        <div>
                            <div class="stat-value">${players}<span style="color:#71717a;font-size:0.875rem;font-weight:400">/${maxPlayers}</span></div>
                            <div class="stat-label">Players</div>
                        </div>
                        <div>
                            <div class="stat-value" style="color:${isOnline ? '#22c55e' : '#ef4444'}">${isOnline ? 'Up' : 'Down'}</div>
                            <div class="stat-label">Status</div>
                        </div>
                    </div>
                </div>

                <div class="info-box">
                    <div class="players-title">Connected Players</div>
                    ${playerNames.length > 0 ? `
                        <div class="players-list">
                            ${playerNames.map(p => `<span class="player-tag"><span class="dot"></span>${esc(p)}</span>`).join('')}
                        </div>
                    ` : `
                        <div class="empty-players">${isOnline ? 'No players online.' : 'Server is offline.'}</div>
                    `}
                </div>

                <div class="footer">Auto-refreshes every 30s</div>
            `;
        }

        function esc(str) {
            const d = document.createElement('div');
            d.textContent = str || '';
            return d.innerHTML;
        }

        async function fetchStatus() {
            try {
                const res = await fetch(API_URL);
                if (!res.ok) {
                    document.getElementById('card').innerHTML =
                        '<div class="loading">Server not found.</div>';
                    return;
                }
                const json = await res.json();
                render(json.data);
            } catch {
                document.getElementById('card').innerHTML =
                    '<div class="loading">Failed to load status.</div>';
            }
        }

        fetchStatus();
        setInterval(fetchStatus, REFRESH_INTERVAL);
    </script>
</body>
</html>
