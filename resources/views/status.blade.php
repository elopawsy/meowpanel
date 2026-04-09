<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Server Status — {{ config('app.name', 'Meowpanel') }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            background: #0a0a0a;
            color: #e4e4e7;
            min-height: 100vh;
            padding: 2rem 1rem;
        }
        .container { max-width: 800px; margin: 0 auto; }
        h1 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.25rem;
        }
        .subtitle {
            color: #71717a;
            font-size: 0.875rem;
            margin-bottom: 1.5rem;
        }
        .server-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .server-card {
            background: linear-gradient(to bottom, rgba(255,255,255,0.03), rgba(255,255,255,0.02));
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 0.75rem;
            padding: 1rem 1.25rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            transition: border-color 0.15s;
        }
        .server-card:hover { border-color: rgba(255,255,255,0.12); }
        .status-dot {
            width: 10px; height: 10px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .status-dot.online { background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.4); }
        .status-dot.offline { background: #52525b; }
        .server-info { flex: 1; min-width: 0; }
        .server-name { font-weight: 600; font-size: 0.9375rem; }
        .server-meta {
            color: #71717a;
            font-size: 0.75rem;
            margin-top: 0.125rem;
        }
        .players-list {
            display: flex;
            flex-wrap: wrap;
            gap: 0.25rem;
            margin-top: 0.375rem;
        }
        .player-tag {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.125rem 0.5rem;
            border-radius: 0.375rem;
            font-size: 0.6875rem;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.07);
            color: #a1a1aa;
        }
        .player-tag .dot {
            width: 5px; height: 5px;
            border-radius: 50%;
            background: #4ade80;
        }
        .player-count {
            text-align: right;
            flex-shrink: 0;
        }
        .player-count .count {
            font-size: 1.125rem;
            font-weight: 700;
            color: #e4e4e7;
        }
        .player-count .label {
            font-size: 0.6875rem;
            color: #71717a;
        }
        .loading { text-align: center; color: #71717a; padding: 3rem; }
        .footer {
            text-align: center;
            color: #3f3f46;
            font-size: 0.75rem;
            margin-top: 2rem;
        }
        .refresh-info {
            color: #3f3f46;
            font-size: 0.6875rem;
            text-align: right;
            margin-bottom: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Server Status</h1>
        <p class="subtitle">{{ config('app.name', 'Meowpanel') }}</p>
        <p class="refresh-info" id="refresh-info"></p>

        <div class="server-list" id="server-list">
            <div class="loading">Loading servers...</div>
        </div>

        <p class="footer">Powered by Meowpanel</p>
    </div>

    <script>
        const API_URL = '/api/public/status';
        const REFRESH_INTERVAL = 30000;

        function renderServers(data) {
            const list = document.getElementById('server-list');
            if (!data.length) {
                list.innerHTML = '<div class="loading">No servers configured.</div>';
                return;
            }

            list.innerHTML = data.map(server => {
                const isOnline = server.status && server.status.online;
                const players = server.status ? server.status.players : 0;
                const maxPlayers = server.status ? server.status.max_players : 0;
                const playerNames = (server.status && server.status.player_list) || [];
                const version = (server.status && server.status.version) || '';

                return `
                    <div class="server-card">
                        <div class="status-dot ${isOnline ? 'online' : 'offline'}"></div>
                        <div class="server-info">
                            <div class="server-name">${escapeHtml(server.name)}</div>
                            <div class="server-meta">
                                ${escapeHtml(server.game)}
                                ${version ? ' &middot; ' + escapeHtml(version) : ''}
                                ${server.address ? ' &middot; ' + escapeHtml(server.address) : ''}
                            </div>
                            ${playerNames.length > 0 ? `
                                <div class="players-list">
                                    ${playerNames.map(p => `<span class="player-tag"><span class="dot"></span>${escapeHtml(p)}</span>`).join('')}
                                </div>
                            ` : ''}
                        </div>
                        <div class="player-count">
                            <div class="count">${players}/${maxPlayers}</div>
                            <div class="label">${isOnline ? 'online' : 'offline'}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str || '';
            return div.innerHTML;
        }

        async function fetchStatus() {
            try {
                const res = await fetch(API_URL);
                const json = await res.json();
                renderServers(json.data);
                document.getElementById('refresh-info').textContent =
                    'Auto-refreshes every 30s';
            } catch (e) {
                document.getElementById('server-list').innerHTML =
                    '<div class="loading">Failed to load status.</div>';
            }
        }

        fetchStatus();
        setInterval(fetchStatus, REFRESH_INTERVAL);
    </script>
</body>
</html>
