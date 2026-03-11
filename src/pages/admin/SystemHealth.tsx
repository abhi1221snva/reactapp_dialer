import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';
import { PageHeader } from '../../components/ui/PageHeader';

interface HealthCheck {
  healthy: boolean;
  latency_ms?: number;
  error?: string;
  failed_jobs?: number;
  pending?: number;
  used_pct?: number;
  free_gb?: number;
}

interface HealthData {
  health: string;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    queue: HealthCheck;
    disk: HealthCheck;
  };
  checked_at: string;
}

interface QueueStat {
  pending: number;
  reserved: number;
  delayed: number;
  failed: number;
  total: number;
  error?: string;
}

interface QueueStats {
  [queue: string]: QueueStat;
}

const SystemHealth: React.FC = () => {
  const [health, setHealth]     = useState<HealthData | null>(null);
  const [queues, setQueues]     = useState<QueueStats | null>(null);
  const [errTrend, setErrTrend] = useState<{ hour: string; value: number }[]>([]);
  const [loading, setLoading]   = useState(false);
  const [tab, setTab]           = useState<'health' | 'queues' | 'errors'>('health');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [h, q, e] = await Promise.allSettled([
        api.get('/system/health'),
        api.get('/system/queue-stats'),
        api.get('/system/error-trends'),
      ]);

      if (h.status === 'fulfilled') setHealth(h.value.data.data ?? h.value.data);
      if (q.status === 'fulfilled') setQueues(q.value.data.data);
      if (e.status === 'fulfilled') {
        setErrTrend(e.value.data.data?.errors_trend ?? []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchAll]);

  const statusColor = (healthy: boolean) =>
    healthy ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';

  const statusDot = (healthy: boolean) =>
    healthy ? '🟢' : '🔴';

  return (
    <div className="p-6">
      <PageHeader
        title="System Health"
        subtitle="Real-time infrastructure monitoring"
        actions={
          <button
            onClick={fetchAll}
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      />

      {/* Overall Status */}
      {health && (
        <div
          className={`rounded-lg p-4 mb-6 font-semibold text-lg ${
            health.health === 'healthy' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {health.health === 'healthy' ? '🟢 System Healthy' : '🔴 System Degraded'} —{' '}
          {new Date(health.checked_at).toLocaleTimeString()}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['health', 'queues', 'errors'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded text-sm font-medium capitalize ${
              tab === t
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            {t === 'health' ? 'Health Checks' : t === 'queues' ? 'Queue Monitor' : 'Error Trends'}
          </button>
        ))}
      </div>

      {/* Health Checks Tab */}
      {tab === 'health' && health && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.entries(health.checks) as [string, HealthCheck][]).map(([name, check]) => (
            <div
              key={name}
              className={`rounded-lg border p-4 ${
                check.healthy ? 'border-green-200' : 'border-red-300 bg-red-50'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-900 capitalize">{name}</span>
                <span
                  className={`text-sm px-2 py-1 rounded-full font-medium ${statusColor(check.healthy)}`}
                >
                  {statusDot(check.healthy)} {check.healthy ? 'Healthy' : 'Unhealthy'}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                {check.latency_ms !== undefined && (
                  <div>Latency: <strong>{check.latency_ms}ms</strong></div>
                )}
                {check.failed_jobs !== undefined && (
                  <div>
                    Failed Jobs:{' '}
                    <strong className={check.failed_jobs > 0 ? 'text-red-600' : ''}>
                      {check.failed_jobs}
                    </strong>
                  </div>
                )}
                {check.pending !== undefined && (
                  <div>Pending: <strong>{check.pending}</strong></div>
                )}
                {check.used_pct !== undefined && (
                  <div>
                    Disk Used: <strong>{check.used_pct}%</strong> ({check.free_gb}GB free)
                  </div>
                )}
                {check.error && (
                  <div className="text-red-600">Error: {check.error}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'health' && !health && !loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">⏳</div>
          <div>Loading health data...</div>
        </div>
      )}

      {/* Queue Monitor Tab */}
      {tab === 'queues' && queues && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Queue', 'Pending', 'Reserved', 'Delayed', 'Failed', 'Total'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(Object.entries(queues) as [string, QueueStat][]).map(([name, stats]) => (
                <tr key={name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium">{name}</td>
                  {stats.error ? (
                    <td colSpan={5} className="px-4 py-3 text-red-500 text-sm">
                      {stats.error}
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3">{stats.pending}</td>
                      <td className="px-4 py-3">{stats.reserved}</td>
                      <td className="px-4 py-3">{stats.delayed}</td>
                      <td
                        className={`px-4 py-3 font-medium ${
                          stats.failed > 0 ? 'text-red-600' : 'text-gray-500'
                        }`}
                      >
                        {stats.failed}
                      </td>
                      <td className="px-4 py-3 font-semibold">{stats.total}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Error Trends Tab */}
      {tab === 'errors' && errTrend.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Errors Per Hour (Last 24h)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
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
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">✅</div>
          <div>No error trend data available</div>
        </div>
      )}
    </div>
  );
};

export default SystemHealth;
