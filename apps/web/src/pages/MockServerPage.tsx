import { useState, useEffect } from 'react';
import { Server, Plus, Trash2, Power, PowerOff, Copy } from 'lucide-react';
import { mocksApi } from '../lib/api/mocks';

interface MockServerPageProps {
    workspaceId: string;
}

export function MockServerPage({ workspaceId }: MockServerPageProps) {
    const [mockServers, setMockServers] = useState<any[]>([]);
    const [selectedServer, setSelectedServer] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadMockServers();
    }, [workspaceId]);

    const loadMockServers = async () => {
        setLoading(true);
        try {
            const data = await mocksApi.listMockServers(workspaceId);
            setMockServers(data);
        } catch (error) {
            console.error('Failed to load mock servers:', error);
        } finally {
            setLoading(false);
        }
    };

    const createMockServer = async () => {
        const name = prompt('Mock server name:');
        if (!name) return;

        setCreating(true);
        try {
            await mocksApi.createMockServer(workspaceId, { name });
            await loadMockServers();
        } catch (error) {
            alert('Failed to create mock server');
        } finally {
            setCreating(false);
        }
    };

    const toggleServer = async (id: string, enabled: boolean) => {
        try {
            await mocksApi.updateMockServer(id, { enabled: !enabled });
            await loadMockServers();
        } catch (error) {
            alert('Failed to update mock server');
        }
    };

    const deleteMockServer = async (id: string) => {
        if (!confirm('Delete this mock server?')) return;

        try {
            await mocksApi.deleteMockServer(id);
            await loadMockServers();
            if (selectedServer?.id === id) setSelectedServer(null);
        } catch (error) {
            alert('Failed to delete mock server');
        }
    };

    const addRoute = async (mockServerId: string) => {
        const method = prompt('HTTP Method (GET, POST, etc):')?.toUpperCase();
        const path = prompt('Path (e.g., /users/:id):');
        const statusCode = prompt('Status Code (default: 200):') || '200';
        const responseBody = prompt('Response Body (JSON):');

        if (!method || !path || !responseBody) return;

        try {
            const body = JSON.parse(responseBody);
            await mocksApi.addRoute(mockServerId, {
                method,
                path,
                statusCode: parseInt(statusCode),
                responseBody: body,
            });

            // Reload server details
            if (selectedServer?.id === mockServerId) {
                const updated = await mocksApi.getMockServer(mockServerId);
                setSelectedServer(updated);
            }
            await loadMockServers();
        } catch (error) {
            alert('Failed to add route. Check JSON format.');
        }
    };

    const deleteRoute = async (routeId: string) => {
        if (!confirm('Delete this route?')) return;

        try {
            await mocksApi.deleteRoute(routeId);
            if (selectedServer) {
                const updated = await mocksApi.getMockServer(selectedServer.id);
                setSelectedServer(updated);
            }
            await loadMockServers();
        } catch (error) {
            alert('Failed to delete route');
        }
    };

    const copyMockUrl = (baseUrl: string) => {
        const url = `${window.location.origin}/mock/${baseUrl}`;
        navigator.clipboard.writeText(url);
        alert('Mock URL copied to clipboard!');
    };

    return (
        <div className="flex h-full bg-white dark:bg-gray-900">
            {/* Sidebar - Mock Servers List */}
            <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Mock Servers
                        </h2>
                        <button
                            onClick={createMockServer}
                            disabled={creating}
                            className="p-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="p-4 text-center text-gray-500">Loading...</div>
                    ) : mockServers.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            No mock servers yet
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {mockServers.map((server) => (
                                <div
                                    key={server.id}
                                    onClick={() => setSelectedServer(server)}
                                    className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedServer?.id === server.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Server size={16} className="text-gray-400 flex-shrink-0" />
                                                <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                                    {server.name}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex items-center gap-2">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${server.enabled
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                                    }`}>
                                                    {server.enabled ? 'Active' : 'Disabled'}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {server.routes?.length || 0} routes
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content - Server Details */}
            <div className="flex-1 flex flex-col">
                {selectedServer ? (
                    <>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                        {selectedServer.name}
                                    </h3>
                                    <div className="mt-1 flex items-center gap-2">
                                        <button
                                            onClick={() => copyMockUrl(selectedServer.baseUrl)}
                                            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
                                        >
                                            <Copy size={14} />
                                            {window.location.origin}/mock/{selectedServer.baseUrl}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleServer(selectedServer.id, selectedServer.enabled)}
                                        className={`p-2 rounded-md ${selectedServer.enabled
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        title={selectedServer.enabled ? 'Disable' : 'Enable'}
                                    >
                                        {selectedServer.enabled ? <Power size={16} /> : <PowerOff size={16} />}
                                    </button>
                                    <button
                                        onClick={() => deleteMockServer(selectedServer.id)}
                                        className="p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Routes */}
                        <div className="flex-1 overflow-auto p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h4 className="font-semibold text-gray-900 dark:text-white">Routes</h4>
                                <button
                                    onClick={() => addRoute(selectedServer.id)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm flex items-center gap-1.5"
                                >
                                    <Plus size={14} />
                                    Add Route
                                </button>
                            </div>

                            {selectedServer.routes?.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    No routes configured yet
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedServer.routes?.map((route: any) => (
                                        <div
                                            key={route.id}
                                            className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${route.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                                                                route.method === 'POST' ? 'bg-green-100 text-green-700' :
                                                                    route.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                                                                        route.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                                                                            'bg-gray-100 text-gray-700'
                                                            }`}>
                                                            {route.method}
                                                        </span>
                                                        <span className="font-mono text-sm text-gray-900 dark:text-white">
                                                            {route.path}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            → {route.statusCode}
                                                        </span>
                                                        {route.delay && (
                                                            <span className="text-xs text-gray-500">
                                                                ({route.delay}ms delay)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <pre className="mt-2 text-xs bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-auto">
                                                        {JSON.stringify(route.responseBody, null, 2)}
                                                    </pre>
                                                </div>
                                                <button
                                                    onClick={() => deleteRoute(route.id)}
                                                    className="ml-2 p-1.5 rounded text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        Select a mock server to view details
                    </div>
                )}
            </div>
        </div>
    );
}
