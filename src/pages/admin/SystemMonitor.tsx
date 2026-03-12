import { useEffect, useRef, useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Server, Cpu, MemoryStick, HardDrive, DatabaseZap, Layers,
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock, Activity,
} from 'lucide-react'
import api from '../../api/axios'
import { PageHeader } from '../../components/ui/PageHeader'
import { cn } from '../../utils/cn'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ServerInfo {
  hostname: string; os: string; cpu_model: string; cpu_cores: number
  ram_total_mb: number; ram_free_mb: number; ram_used_mb: number; ram_used_pct: number
  disk_total_gb: number; disk_used_gb: number; disk_free_gb: number; disk_used_pct: number
  php_version: string; mysql_version: string; app_version: string
  web_server: string; environment: string
}
interface QueueStatus { driver: string; workers: number; pending: number; failed: number }
interface RedisStatus { connected: boolean; used_memory_mb: number | null; peak_memory_mb: number | null; error?: string }
interface DatabaseStatus { version: string; connections: number | null; db_name: string | null; size_mb: number | null; error?: string }
interface PhpLimits { version: string; memory_limit: string; upload_max_filesize: string; post_max_size: string; max_execution_time: string }
interface ServerData { server: ServerInfo; queue: QueueStatus; redis: RedisStatus; database: DatabaseStatus; php: PhpLimits; fetched_at: string }

interface HealthCheck {
  healthy: boolean; latency_ms?: number; error?: string
  failed_jobs?: number; pending?: number; used_pct?: number; free_gb?: number
}
interface HealthData {
  health: string
  checks: { database: HealthCheck; redis: HealthCheck; queue: HealthCheck; disk: HealthCheck }
  checked_at: string
}
interface QueueStat { pending: number; reserved: number; delayed: number; failed: number; total: number; error?: string }

// ── Sub-components ─────────────────────────────────────────────────────────────

function UsageBar({ pct, warn = 75, danger = 90 }: { pct: number; warn?: number; danger?: number }) {
  const color = pct >= danger ? 'bg-red-500' : pct >= warn ? 'bg-amber-400' : 'bg-emerald-500'
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={cn('h-2 rounded-full transition-all duration-500', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-800 truncate">{value ?? '—'}</p>
    </div>
  )
}

function Card({ title, icon: Icon, iconColor, children }: {
  title: string; icon: React.ElementType; iconColor: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', iconColor)}>
          <Icon size={15} className="text-white" />
        </div>
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

const POLL_MS = 30_000
type Tab = 'server' | 'health' | 'queues' | 'errors'

export function SystemMonitor() {
  const [tab, setTab]             = useState<Tab>('server')
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [queues, setQueues]       = useState<Record<string, QueueStat> | null>(null)
  const [errTrend, setErrTrend]   = useState<{ hour: string; value: number }[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState(POLL_MS / 1000)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchAll = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true)
    setError(null)
    try {
      const [srv, hlt, q, e] = await Promise.allSettled([
        api.get('/system/server-info'),
        api.get('/system/health'),
        api.get('/system/queue-stats'),
        api.get('/system/error-trends'),
      ])
      if (srv.status === 'fulfilled') setServerData(srv.value.data?.data ?? srv.value.data)
      if (hlt.status === 'fulfilled') setHealthData(hlt.value.data?.data ?? hlt.value.data)
      if (q.status   === 'fulfilled') setQueues(q.value.data.data)
      if (e.status   === 'fulfilled') setErrTrend(e.value.data.data?.errors_trend ?? [])
      setLastUpdated(new Date())
      setCountdown(POLL_MS / 1000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message ?? (err as { message?: string })?.message ?? 'Failed to load'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll(true)
    timerRef.current = setInterval(() => fetchAll(), POLL_MS)
    countRef.current = setInterval(() => setCountdown(c => (c <= 1 ? POLL_MS / 1000 : c - 1)), 1000)
    return () => {
      clearInterval(timerRef.current!)
      clearInterval(countRef.current!)
    }
  }, [fetchAll])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'server',  label: 'Server Info' },
    { key: 'health',  label: 'Health Checks' },
    { key: 'queues',  label: 'Queue Monitor' },
    { key: 'errors',  label: 'Error Trends' },
  ]

  if (loading && !serverData && !healthData) {
    return (
      <div className="p-6">
        <PageHeader title="System Monitor" subtitle="Loading..." />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
              <div className="space-y-2">
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <PageHeader
        title="System Monitor"
        subtitle="Server infrastructure &amp; application health — system administrator only"
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock size={12} /> Next refresh in {countdown}s
            </span>
            <button
              onClick={() => fetchAll(false)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        }
      />

      {lastUpdated && (
        <p className="text-xs text-slate-400 mb-4 -mt-2">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {/* Overall health banner */}
      {healthData && (
        <div className={cn(
          'rounded-xl px-4 py-3 mb-5 font-semibold text-sm',
          healthData.health === 'healthy' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        )}>
          {healthData.health === 'healthy' ? '🟢 System Healthy' : '🔴 System Degraded'} —{' '}
          {new Date(healthData.checked_at).toLocaleTimeString()}
        </div>
      )}

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <XCircle size={15} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === key
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Server Info Tab ────────────────────────────────────────────────── */}
      {tab === 'server' && serverData && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Card title="Server Info" icon={Server} iconColor="bg-slate-600">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Hostname"    value={serverData.server.hostname} />
              <Stat label="Environment" value={
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold',
                  serverData.server.environment === 'production'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                )}>
                  {serverData.server.environment}
                </span>
              } />
              <Stat label="OS"          value={serverData.server.os} />
              <Stat label="Web Server"  value={serverData.server.web_server} />
              <Stat label="PHP"         value={serverData.server.php_version} />
              <Stat label="MySQL"       value={serverData.server.mysql_version} />
              <Stat label="App Version" value={serverData.server.app_version} />
            </div>
          </Card>

          <Card title="CPU &amp; RAM" icon={Cpu} iconColor="bg-indigo-500">
            <div className="space-y-4">
              <div>
                <p className="text-[11px] text-slate-400 mb-0.5">CPU Model</p>
                <p className="text-xs font-medium text-slate-700 truncate">{serverData.server.cpu_model}</p>
                <p className="text-[11px] text-slate-400 mt-1">{serverData.server.cpu_cores} cores</p>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>RAM Usage</span>
                  <span className="font-semibold text-slate-700">{serverData.server.ram_used_pct}%</span>
                </div>
                <UsageBar pct={serverData.server.ram_used_pct} />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Used: {(serverData.server.ram_used_mb / 1024).toFixed(1)} GB</span>
                  <span>Total: {(serverData.server.ram_total_mb / 1024).toFixed(1)} GB</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Disk Usage" icon={HardDrive} iconColor="bg-violet-500">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Disk Usage</span>
                  <span className="font-semibold text-slate-700">{serverData.server.disk_used_pct}%</span>
                </div>
                <UsageBar pct={serverData.server.disk_used_pct} />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { label: 'Total', value: `${serverData.server.disk_total_gb} GB` },
                  { label: 'Used',  value: `${serverData.server.disk_used_gb} GB` },
                  { label: 'Free',  value: `${serverData.server.disk_free_gb} GB` },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center rounded-lg bg-slate-50 py-2">
                    <p className="text-xs font-bold text-slate-800">{value}</p>
                    <p className="text-[10px] text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Queue Status" icon={Layers} iconColor="bg-orange-500">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Driver"  value={<span className="capitalize">{serverData.queue.driver}</span>} />
              <Stat label="Workers" value={
                <span className={serverData.queue.workers > 0 ? 'text-emerald-600' : 'text-slate-400'}>
                  {serverData.queue.workers} running
                </span>
              } />
              <Stat label="Pending" value={
                <span className={serverData.queue.pending > 0 ? 'text-amber-600' : 'text-slate-700'}>
                  {serverData.queue.pending}
                </span>
              } />
              <Stat label="Failed" value={
                <span className={serverData.queue.failed > 0 ? 'text-red-600 font-bold' : 'text-slate-700'}>
                  {serverData.queue.failed}
                </span>
              } />
            </div>
            {serverData.queue.failed > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <AlertTriangle size={12} /> {serverData.queue.failed} failed job{serverData.queue.failed !== 1 ? 's' : ''} require attention
              </div>
            )}
          </Card>

          <Card title="Redis" icon={CheckCircle2} iconColor={serverData.redis.connected ? 'bg-emerald-500' : 'bg-red-500'}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {serverData.redis.connected
                  ? <CheckCircle2 size={16} className="text-emerald-500" />
                  : <XCircle      size={16} className="text-red-500" />}
                <span className={cn('text-sm font-semibold', serverData.redis.connected ? 'text-emerald-700' : 'text-red-700')}>
                  {serverData.redis.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {serverData.redis.connected ? (
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Used Memory"  value={serverData.redis.used_memory_mb  != null ? `${serverData.redis.used_memory_mb} MB`  : '—'} />
                  <Stat label="Peak Memory"  value={serverData.redis.peak_memory_mb  != null ? `${serverData.redis.peak_memory_mb} MB`  : '—'} />
                </div>
              ) : (
                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                  {serverData.redis.error ?? 'Connection failed'}
                </p>
              )}
            </div>
          </Card>

          <Card title="Database" icon={DatabaseZap} iconColor="bg-blue-500">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="MySQL Version" value={serverData.database.version} />
              <Stat label="Connections"   value={
                serverData.database.connections != null
                  ? <span className={serverData.database.connections > 80 ? 'text-amber-600' : undefined}>
                      {serverData.database.connections}
                    </span>
                  : '—'
              } />
              <Stat label="Database" value={serverData.database.db_name ?? '—'} />
              <Stat label="Size"     value={serverData.database.size_mb != null ? `${serverData.database.size_mb} MB` : '—'} />
            </div>
            {serverData.database.error && (
              <p className="mt-2 text-xs text-red-500">{serverData.database.error}</p>
            )}
          </Card>

          <Card title="PHP Config" icon={Activity} iconColor="bg-pink-500">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="PHP Version"         value={serverData.php.version} />
              <Stat label="Memory Limit"        value={serverData.php.memory_limit} />
              <Stat label="Upload Max Filesize" value={serverData.php.upload_max_filesize} />
              <Stat label="Post Max Size"       value={serverData.php.post_max_size} />
              <Stat label="Max Execution Time"  value={serverData.php.max_execution_time} />
            </div>
          </Card>

          <Card title="System Summary" icon={MemoryStick} iconColor="bg-teal-500">
            <div className="space-y-3">
              {[
                { label: 'RAM',  pct: serverData.server.ram_used_pct,  detail: `${(serverData.server.ram_used_mb / 1024).toFixed(1)} / ${(serverData.server.ram_total_mb / 1024).toFixed(1)} GB` },
                { label: 'Disk', pct: serverData.server.disk_used_pct, detail: `${serverData.server.disk_used_gb} / ${serverData.server.disk_total_gb} GB` },
              ].map(({ label, pct, detail }) => (
                <div key={label}>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>{label}</span>
                    <span className="font-medium">{pct}% — {detail}</span>
                  </div>
                  <UsageBar pct={pct} />
                </div>
              ))}
              <div className="mt-1 pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
                <Stat label="Queue Workers" value={
                  <span className={serverData.queue.workers > 0 ? 'text-emerald-600' : 'text-slate-400'}>
                    {serverData.queue.workers}
                  </span>
                } />
                <Stat label="Redis" value={
                  <span className={serverData.redis.connected ? 'text-emerald-600' : 'text-red-600'}>
                    {serverData.redis.connected ? 'Online' : 'Offline'}
                  </span>
                } />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Health Checks Tab ─────────────────────────────────────────────── */}
      {tab === 'health' && healthData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.entries(healthData.checks) as [string, HealthCheck][]).map(([name, check]) => (
            <div
              key={name}
              className={cn('rounded-xl border p-4', check.healthy ? 'border-green-200 bg-white' : 'border-red-300 bg-red-50')}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-slate-900 capitalize">{name}</span>
                <span className={cn('text-sm px-2 py-1 rounded-full font-medium', check.healthy ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-100')}>
                  {check.healthy ? '🟢 Healthy' : '🔴 Unhealthy'}
                </span>
              </div>
              <div className="text-sm text-slate-600 space-y-1">
                {check.latency_ms   !== undefined && <div>Latency: <strong>{check.latency_ms}ms</strong></div>}
                {check.failed_jobs  !== undefined && <div>Failed Jobs: <strong className={check.failed_jobs > 0 ? 'text-red-600' : ''}>{check.failed_jobs}</strong></div>}
                {check.pending      !== undefined && <div>Pending: <strong>{check.pending}</strong></div>}
                {check.used_pct     !== undefined && <div>Disk Used: <strong>{check.used_pct}%</strong> ({check.free_gb}GB free)</div>}
                {check.error && <div className="text-red-600">Error: {check.error}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === 'health' && !healthData && !loading && (
        <div className="bg-white rounded-xl shadow p-12 text-center text-slate-400">No health data available.</div>
      )}

      {/* ── Queue Monitor Tab ─────────────────────────────────────────────── */}
      {tab === 'queues' && queues && (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Queue', 'Pending', 'Reserved', 'Delayed', 'Failed', 'Total'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(Object.entries(queues) as [string, QueueStat][]).map(([name, stats]) => (
                <tr key={name} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-medium">{name}</td>
                  {stats.error ? (
                    <td colSpan={5} className="px-4 py-3 text-red-500">{stats.error}</td>
                  ) : (
                    <>
                      <td className="px-4 py-3">{stats.pending}</td>
                      <td className="px-4 py-3">{stats.reserved}</td>
                      <td className="px-4 py-3">{stats.delayed}</td>
                      <td className={cn('px-4 py-3 font-medium', stats.failed > 0 ? 'text-red-600' : 'text-slate-500')}>{stats.failed}</td>
                      <td className="px-4 py-3 font-semibold">{stats.total}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'queues' && !queues && !loading && (
        <div className="bg-white rounded-xl shadow p-12 text-center text-slate-400">No queue data available.</div>
      )}

      {/* ── Error Trends Tab ──────────────────────────────────────────────── */}
      {tab === 'errors' && errTrend.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Errors Per Hour (Last 24h)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={errTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#ef4444" name="Errors" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {tab === 'errors' && errTrend.length === 0 && !loading && (
        <div className="bg-white rounded-xl shadow p-12 text-center text-slate-400">
          <div className="text-4xl mb-3">✅</div>
          <div>No error trend data — system is clean.</div>
        </div>
      )}
    </div>
  )
}

export default SystemMonitor
