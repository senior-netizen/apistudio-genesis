import { useState, useEffect } from 'react';
import { Activity, Plus, Play, Trash2, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import { monitoringApi, type Monitor, type MonitorRun } from '../lib/api/monitoring';

interface MonitoringPageProps {
    workspaceId: string;
}

export function MonitoringPage({ workspaceId }: MonitoringPageProps) {
    const [monitors, setMonitors] = useState<Monitor[]>([]);
    const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
    const [runs, setRuns] = useState<MonitorRun[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMonitors();
    }, [workspaceId]);

    useEffect(() => {
        if (selectedMonitor) {
            loadRunHistory(selectedMonitor.id);
        }
    }, [selectedMonitor]);

    const loadMonitors = async () => {
        setLoading(true);
        try {
            const data = await monitoringApi.listMonitors(workspaceId);
            setMonitors(data);
        } catch (error) {
            console.error('Failed to load monitors:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadRunHistory = async (monitorId: string) => {
        try {
            const data = await monitoringApi.getRunHistory(monitorId);
            setRuns(data.runs || []);
        } catch (error) {
            console.error('Failed to load run history:', error);
        }
    };

    const createMonitor = () => {
        // In real app, this would open a modal/form
        alert('Monitor creation form would open here');
    };

    const toggleMonitor = async (id: string, enabled: boolean) => {
        try {
            await monitoringApi.updateMonitor(id, { enabled: !enabled });
            await loadMonitors();
        } catch (error) {
            alert('Failed to update monitor');
        }
    };

    const triggerRun = async (id: string) => {
        try {
            await monitoringApi.triggerRun(id);
            alert('Monitor run queued');
            setTimeout(() => loadRunHistory(id), 2000);
        } catch (error) {
            alert('Failed to trigger run');
        }
    };

    const deleteMonitor = async (id: string) => {
        if (!confirm('Delete this monitor?')) return;

        try {
            await monitoringApi.deleteMonitor(id);
            await loadMonitors();
            if (selectedMonitor?.id === id) {
                setSelectedMonitor(null);
            }
        } catch (error) {
            alert('Failed to delete monitor');
        }
    };

    return (
        <div className="flex h-full bg-white dark:bg-gray-900">
            {/* Sidebar - Monitors List */}
            <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Monitors
                        </h2>
                        <button
                            onClick={createMonitor}
                            className="p-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="p-4 text-center text-gray-500">Loading...</div>
                    ) : monitors.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            No monitors configured
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {monitors.map((monitor) => (
                                <div
                                    key={monitor.id}
                                    onClick={() => setSelectedMonitor(monitor)}
                                    className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedMonitor?.id === monitor.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Activity size={16} className="text-gray-400 flex-shrink-0" />
                                                <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                                    {monitor.name}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-xs text-gray-500 truncate">
                                                {monitor.request.method} {monitor.request.url}
                                            </div>
                                            <div className="mt-2 flex items-center gap-2">
                                                {monitor.enabled ? (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                                        Paused
                                                    </span>
                                                )}
                                                {monitor.stats && (
                                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                                        {monitor.stats.uptime.toFixed(1)}% uptime
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content - Monitor Details */}
            <div className="flex-1 flex flex-col">
                {selectedMonitor ? (
                    <>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                        {selectedMonitor.name}
                                    </h3>
                                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                        {selectedMonitor.request.method} {selectedMonitor.request.url}
                                    </div>
                                    <div className="mt-2 flex items-center gap-4 text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">
                                            Schedule: <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                                {selectedMonitor.schedule}
                                            </code>
                                        </span>
                                        <span className="text-gray-600 dark:text-gray-400">
                                            Regions: {selectedMonitor.regions.join(', ')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => triggerRun(selectedMonitor.id)}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm flex items-center gap-1.5"
                                    >
                                        <Play size={14} />
                                        Run Now
                                    </button>
                                    <button
                                        onClick={() => toggleMonitor(selectedMonitor.id, selectedMonitor.enabled)}
                                        className={`px-3 py-1.5 rounded-md text-sm ${selectedMonitor.enabled
                                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                            }`}
                                    >
                                        {selectedMonitor.enabled ? 'Pause' : 'Resume'}
                                    </button>
                                    <button
                                        onClick={() => deleteMonitor(selectedMonitor.id)}
                                        className="p-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Stats */}
                            {selectedMonitor.stats && (
                                <div className="mt-4 grid grid-cols-4 gap-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                            <TrendingUp size={16} />
                                            <span className="text-xs font-medium">Uptime</span>
                                        </div>
                                        <div className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-300">
                                            {selectedMonitor.stats.uptime.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                            <CheckCircle size={16} />
                                            <span className="text-xs font-medium">Success</span>
                                        </div>
                                        <div className="mt-1 text-2xl font-bold text-green-900 dark:text-green-300">
                                            {selectedMonitor.stats.successfulRuns}
                                        </div>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                                            <XCircle size={16} />
                                            <span className="text-xs font-medium">Failures</span>
                                        </div>
                                        <div className="mt-1 text-2xl font-bold text-red-900 dark:text-red-300">
                                            {selectedMonitor.stats.failedRuns}
                                        </div>
                                    </div>
                                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                                        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                                            <Clock size={16} />
                                            <span className="text-xs font-medium">Avg Time</span>
                                        </div>
                                        <div className="mt-1 text-2xl font-bold text-purple-900 dark:text-purple-300">
                                            {selectedMonitor.stats.avgResponseTime}ms
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Run History */}
                        <div className="flex-1 overflow-auto p-6">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                                Recent Runs
                            </h4>

                            {runs.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    No runs yet
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {runs.map((run) => (
                                        <div
                                            key={run.id}
                                            className={`flex items-center justify-between p-3 rounded-lg border ${run.status === 'success'
                                                    ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
                                                    : 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {run.status === 'success' ? (
                                                    <CheckCircle size={16} className="text-green-600" />
                                                ) : (
                                                    <XCircle size={16} className="text-red-600" />
                                                )}
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {run.status === 'success' ? 'Successful' : 'Failed'}
                                                        {run.statusCode && ` (${run.statusCode})`}
                                                    </div>
                                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                                        {new Date(run.executedAt).toLocaleString()} · {run.region}
                                                    </div>
                                                    {run.errorMessage && (
                                                        <div className="mt-1 text-xs text-red-600">{run.errorMessage}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-sm font-mono text-gray-600 dark:text-gray-400">
                                                {run.responseTime}ms
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        Select a monitor to view details
                    </div>
                )}
            </div>
        </div>
    );
}
