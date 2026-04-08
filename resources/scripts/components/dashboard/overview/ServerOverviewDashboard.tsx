import { ChartLine, Server } from '@gravity-ui/icons';
import { useStoreState } from 'easy-peasy';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';

import getServers from '@/api/getServers';
import { PaginatedResult } from '@/api/http';
import { Server as ServerType } from '@/api/server/getServer';
import getServerResourceUsage, { ServerPowerState, ServerStats } from '@/api/server/getServerResourceUsage';
import PageContentBlock from '@/components/elements/PageContentBlock';
import { MainPageHeader } from '../../elements/MainPageHeader';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HISTORY_MAX = 30;
const POLL_INTERVAL_MS = 10_000;

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatUptime(ms: number): string {
    if (ms === 0) return '—';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

const STATUS_CONFIG: Record<ServerPowerState, { label: string; dot: string; bg: string }> = {
    running:    { label: 'Running',   dot: 'bg-green-400',  bg: 'bg-green-400/10 border-green-400/20 text-green-300' },
    starting:   { label: 'Starting',  dot: 'bg-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20 text-yellow-300' },
    stopping:   { label: 'Stopping',  dot: 'bg-orange-400', bg: 'bg-orange-400/10 border-orange-400/20 text-orange-300' },
    offline:    { label: 'Offline',   dot: 'bg-zinc-500',   bg: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400' },
    installing: { label: 'Installing',dot: 'bg-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20 text-blue-300' },
};

// ─── Sparkline ────────────────────────────────────────────────────────────────

const Sparkline = ({ data, color, className = '' }: { data: number[]; color: string; className?: string }) => {
    if (data.length < 2) return <div className={`w-20 h-8 ${className}`} />;
    const max = Math.max(...data, 1);
    const W = 80, H = 28;
    const pts = data
        .map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * H}`)
        .join(' ');
    return (
        <svg width={W} height={H} className={`overflow-visible shrink-0 ${className}`}>
            <polyline points={pts} fill='none' stroke={color} strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        </svg>
    );
};

// ─── Progress bar ─────────────────────────────────────────────────────────────

const Bar = ({ value, max, color }: { value: number; max: number; color: string }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className='w-full h-1 rounded-full bg-[#ffffff12] overflow-hidden'>
            <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
        </div>
    );
};

// ─── Single server row ────────────────────────────────────────────────────────

interface ServerRowData {
    server: ServerType;
    stats: ServerStats | null;
    cpuHistory: number[];
    ramHistory: number[];
    loading: boolean;
    error: boolean;
}

const OverviewRow = ({ data }: { data: ServerRowData }) => {
    const { server, stats, cpuHistory, ramHistory, loading, error } = data;
    const status = stats?.status ?? 'offline';
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.offline;
    const ramLimit = server.limits.memory * 1024 * 1024; // MB → bytes

    return (
        <Link
            to={`/server/${server.id}`}
            className='group flex items-center gap-4 px-4 py-3 rounded-xl border border-[#ffffff0d] bg-[#ffffff04] hover:bg-[#ffffff08] hover:border-[#ffffff18] transition-all duration-150'
        >
            {/* Status dot */}
            <div className='shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[#ffffff08]'>
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} ${status === 'starting' ? 'animate-pulse' : ''}`} />
            </div>

            {/* Name + status */}
            <div className='flex flex-col min-w-0 w-44 shrink-0'>
                <span className='text-sm font-medium text-white truncate'>{server.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md border w-fit mt-0.5 font-medium ${cfg.bg}`}>
                    {cfg.label}
                </span>
            </div>

            {/* CPU */}
            <div className='flex flex-col gap-1 w-28 shrink-0'>
                <div className='flex items-center justify-between'>
                    <span className='text-[10px] text-zinc-500 uppercase tracking-wider'>CPU</span>
                    <span className='text-xs text-zinc-300 font-mono'>
                        {loading ? '…' : error ? '—' : `${stats?.cpuUsagePercent.toFixed(1) ?? 0}%`}
                    </span>
                </div>
                <Bar
                    value={stats?.cpuUsagePercent ?? 0}
                    max={Math.max(server.limits.cpu, 100)}
                    color={
                        (stats?.cpuUsagePercent ?? 0) > 90 ? 'bg-red-400' :
                        (stats?.cpuUsagePercent ?? 0) > 70 ? 'bg-yellow-400' :
                        'bg-green-400'
                    }
                />
            </div>

            {/* CPU sparkline */}
            <Sparkline
                data={cpuHistory}
                color={
                    (stats?.cpuUsagePercent ?? 0) > 90 ? '#f87171' :
                    (stats?.cpuUsagePercent ?? 0) > 70 ? '#facc15' :
                    '#4ade80'
                }
            />

            {/* RAM */}
            <div className='flex flex-col gap-1 w-36 shrink-0'>
                <div className='flex items-center justify-between'>
                    <span className='text-[10px] text-zinc-500 uppercase tracking-wider'>RAM</span>
                    <span className='text-xs text-zinc-300 font-mono'>
                        {loading ? '…' : error ? '—' : (
                            ramLimit > 0
                                ? `${formatBytes(stats?.memoryUsageInBytes ?? 0)} / ${formatBytes(ramLimit)}`
                                : formatBytes(stats?.memoryUsageInBytes ?? 0)
                        )}
                    </span>
                </div>
                <Bar
                    value={stats?.memoryUsageInBytes ?? 0}
                    max={ramLimit || 1}
                    color={
                        ramLimit > 0 && (stats?.memoryUsageInBytes ?? 0) / ramLimit > 0.9 ? 'bg-red-400' :
                        ramLimit > 0 && (stats?.memoryUsageInBytes ?? 0) / ramLimit > 0.7 ? 'bg-yellow-400' :
                        'bg-blue-400'
                    }
                />
            </div>

            {/* RAM sparkline */}
            <Sparkline data={ramHistory} color='#60a5fa' />

            {/* Disk */}
            <div className='hidden xl:flex flex-col gap-1 w-28 shrink-0'>
                <div className='flex items-center justify-between'>
                    <span className='text-[10px] text-zinc-500 uppercase tracking-wider'>Disk</span>
                    <span className='text-xs text-zinc-300 font-mono'>
                        {loading ? '…' : error ? '—' : formatBytes(stats?.diskUsageInBytes ?? 0)}
                    </span>
                </div>
                <Bar
                    value={stats?.diskUsageInBytes ?? 0}
                    max={server.limits.disk * 1024 * 1024 || 1}
                    color='bg-purple-400'
                />
            </div>

            {/* Uptime */}
            <div className='hidden lg:block ml-auto shrink-0 text-xs text-zinc-500 font-mono w-16 text-right'>
                {loading ? '…' : error ? '—' : formatUptime(stats?.uptime ?? 0)}
            </div>
        </Link>
    );
};

// ─── Summary bar ──────────────────────────────────────────────────────────────

const SummaryBar = ({ rows }: { rows: ServerRowData[] }) => {
    const loaded = rows.filter((r) => r.stats);
    const running = loaded.filter((r) => r.stats?.status === 'running').length;
    const offline = loaded.filter((r) => r.stats?.status === 'offline').length;
    const other = loaded.length - running - offline;
    const avgCpu = loaded.length
        ? loaded.reduce((acc, r) => acc + (r.stats?.cpuUsagePercent ?? 0), 0) / loaded.length
        : 0;

    return (
        <div className='flex flex-wrap gap-3 mb-4'>
            {[
                { label: 'Total', value: rows.length, color: 'text-zinc-300' },
                { label: 'Running', value: running, color: 'text-green-400' },
                { label: 'Offline', value: offline, color: 'text-zinc-500' },
                { label: 'Other', value: other, color: 'text-yellow-400' },
                { label: 'Avg CPU', value: `${avgCpu.toFixed(1)}%`, color: 'text-blue-300' },
            ].map(({ label, value, color }) => (
                <div key={label} className='flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#ffffff06] border border-[#ffffff0d]'>
                    <span className='text-[10px] text-zinc-500 uppercase tracking-wider'>{label}</span>
                    <span className={`text-sm font-semibold font-mono ${color}`}>{value}</span>
                </div>
            ))}
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

const ServerOverviewDashboard = () => {
    const rootAdmin = useStoreState((state) => state.user.data!.rootAdmin);
    const [rows, setRows] = useState<Map<string, ServerRowData>>(new Map());
    const historyRef = useRef<Map<string, { cpu: number[]; ram: number[] }>>(new Map());
    const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch all servers (admin-all for admins, otherwise own servers)
    const { data: serversPage } = useSWR<PaginatedResult<ServerType>>(
        ['overview-servers', rootAdmin],
        () => getServers({ type: rootAdmin ? 'admin-all' : 'owner', page: 1 }),
        { revalidateOnFocus: false },
    );

    // Also fetch page 2+ if needed
    const [allServers, setAllServers] = useState<ServerType[]>([]);

    useEffect(() => {
        if (!serversPage) return;
        const fetchAll = async () => {
            let all = [...serversPage.items];
            const total = serversPage.pagination.totalPages;
            for (let p = 2; p <= Math.min(total, 10); p++) {
                try {
                    const page = await getServers({ type: rootAdmin ? 'admin-all' : 'owner', page: p });
                    all = [...all, ...page.items];
                } catch { break; }
            }
            setAllServers(all);
        };
        fetchAll();
    }, [serversPage]);

    // Initialize rows when servers list changes
    useEffect(() => {
        if (!allServers.length) return;
        setRows((prev) => {
            const next = new Map(prev);
            for (const server of allServers) {
                if (!next.has(server.uuid)) {
                    next.set(server.uuid, { server, stats: null, cpuHistory: [], ramHistory: [], loading: true, error: false });
                }
            }
            return next;
        });
    }, [allServers]);

    // Polling loop
    const pollAll = async (servers: ServerType[]) => {
        for (let i = 0; i < servers.length; i++) {
            const server = servers[i];
            // Stagger requests by 100ms each to avoid hammering
            await new Promise((r) => setTimeout(r, 100));
            getServerResourceUsage(server.uuid)
                .then((stats) => {
                    const hist = historyRef.current.get(server.uuid) ?? { cpu: [], ram: [] };
                    hist.cpu = [...hist.cpu, stats.cpuUsagePercent].slice(-HISTORY_MAX);
                    hist.ram = [...hist.ram, stats.memoryUsageInBytes].slice(-HISTORY_MAX);
                    historyRef.current.set(server.uuid, hist);

                    setRows((prev) => {
                        const next = new Map(prev);
                        next.set(server.uuid, {
                            server,
                            stats,
                            cpuHistory: [...hist.cpu],
                            ramHistory: hist.ram.map((v) => v / (1024 * 1024)), // MB for display
                            loading: false,
                            error: false,
                        });
                        return next;
                    });
                })
                .catch(() => {
                    setRows((prev) => {
                        const next = new Map(prev);
                        const existing = next.get(server.uuid);
                        if (existing) next.set(server.uuid, { ...existing, loading: false, error: true });
                        return next;
                    });
                });
        }
    };

    useEffect(() => {
        if (!allServers.length) return;

        pollAll(allServers);

        const interval = setInterval(() => pollAll(allServers), POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [allServers]);

    const rowList = Array.from(rows.values()).sort((a, b) => {
        // Sort: running first, then starting, then others, then offline
        const order = { running: 0, starting: 1, stopping: 2, installing: 3, offline: 4 };
        const aOrder = order[a.stats?.status ?? 'offline'] ?? 4;
        const bOrder = order[b.stats?.status ?? 'offline'] ?? 4;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.server.name.localeCompare(b.server.name);
    });

    return (
        <PageContentBlock title='Server Overview'>
            <div className='w-full flex flex-col px-2 sm:px-0'>
                <div className='mb-4'>
                    <MainPageHeader
                        title='Server Overview'
                        titleChildren={
                            <div className='flex items-center gap-2 text-xs text-zinc-500'>
                                <span className='w-2 h-2 rounded-full bg-green-400 animate-pulse' />
                                Live · updates every 10s
                            </div>
                        }
                    />
                </div>

                {rowList.length > 0 && <SummaryBar rows={rowList} />}

                {/* Header */}
                {rowList.length > 0 && (
                    <div className='hidden md:flex items-center gap-4 px-4 mb-1'>
                        <div className='w-8 shrink-0' />
                        <span className='text-[10px] text-zinc-600 uppercase tracking-wider w-44 shrink-0'>Server</span>
                        <span className='text-[10px] text-zinc-600 uppercase tracking-wider w-28 shrink-0'>CPU</span>
                        <div className='w-20 shrink-0' />
                        <span className='text-[10px] text-zinc-600 uppercase tracking-wider w-36 shrink-0'>RAM</span>
                        <div className='w-20 shrink-0' />
                        <span className='hidden xl:block text-[10px] text-zinc-600 uppercase tracking-wider w-28 shrink-0'>Disk</span>
                        <span className='hidden lg:block text-[10px] text-zinc-600 uppercase tracking-wider ml-auto w-16 text-right'>Uptime</span>
                    </div>
                )}

                <div className='flex flex-col gap-1.5'>
                    {rowList.length === 0 ? (
                        <div className='flex flex-col items-center justify-center py-16 text-center'>
                            <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-[#ffffff0a] flex items-center justify-center'>
                                <Server width={24} height={24} color='#71717a' />
                            </div>
                            <p className='text-sm text-zinc-500 animate-pulse'>Loading servers…</p>
                        </div>
                    ) : (
                        rowList.map((row) => <OverviewRow key={row.server.uuid} data={row} />)
                    )}
                </div>
            </div>
        </PageContentBlock>
    );
};

export default ServerOverviewDashboard;
