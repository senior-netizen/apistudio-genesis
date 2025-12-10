import { useState, useEffect } from 'react';
import { FileText, Download, Globe, Code, CheckCircle, Loader2 } from 'lucide-react';
import { documentationApi, type DocumentationConfig } from '../lib/api/documentation';

interface DocumentationPageProps {
    collectionId: string;
    collectionName: string;
}

export function DocumentationPage({ collectionId, collectionName }: DocumentationPageProps) {
    const [config, setConfig] = useState<DocumentationConfig | null>(null);
    const [spec, setSpec] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [publishing, setPublishing] = useState(false);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [version, setVersion] = useState('1.0.0');

    useEffect(() => {
        loadDocumentation();
    }, [collectionId]);

    const loadDocumentation = async () => {
        setLoading(true);
        try {
            const data = await documentationApi.getPreview(collectionId);
            setConfig(data.config);
            setSpec(data.spec);
            setTitle(data.config.title);
            setDescription(data.config.description || '');
            setVersion(data.config.version);
        } catch (error) {
            // Documentation not generated yet
            setTitle(collectionName || 'API Documentation');
            setDescription(`API documentation for ${collectionName}`);
        } finally {
            setLoading(false);
        }
    };

    const generateDocumentation = async () => {
        setGenerating(true);
        try {
            const data = await documentationApi.generate(collectionId, {
                title,
                description,
                version,
            });
            setConfig(data.config);
            setSpec(data.spec);
        } catch (error) {
            console.error('Failed to generate documentation:', error);
            alert('Failed to generate documentation');
        } finally {
            setGenerating(false);
        }
    };

    const publishDocumentation = async () => {
        setPublishing(true);
        try {
            const data = await documentationApi.publish(collectionId);
            setConfig(data.config);
            alert(`Documentation published at: ${data.url}`);
        } catch (error) {
            console.error('Failed to publish documentation:', error);
            alert('Failed to publish documentation');
        } finally {
            setPublishing(false);
        }
    };

    const exportDocumentation = async (format: 'json') => {
        try {
            const data = await documentationApi.export(collectionId);
            const blob = new Blob([JSON.stringify(data.spec, null, 2)], {
                type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/\s+/g, '-').toLowerCase()}-openapi.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export documentation:', error);
            alert('Failed to export documentation');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText className="text-blue-600 dark:text-blue-400" size={24} />
                        <div>
                            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                                API Documentation
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Generate OpenAPI documentation for this collection
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {config?.published && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md text-xs font-medium">
                                <CheckCircle size={14} />
                                Published
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <div className="max-w-4xl mx-auto p-6 space-y-6">
                    {/* Configuration Form */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Configuration
                        </h2>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Title
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="My API"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="API documentation description..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Version
                            </label>
                            <input
                                type="text"
                                value={version}
                                onChange={(e) => setVersion(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="1.0.0"
                            />
                        </div>

                        <button
                            onClick={generateDocumentation}
                            disabled={generating || !title}
                            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {generating ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Code size={16} />
                                    Generate Documentation
                                </>
                            )}
                        </button>
                    </div>

                    {/* Preview */}
                    {spec && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                                    Preview
                                </h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => exportDocumentation('json')}
                                        className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-md text-xs font-medium flex items-center gap-1.5"
                                    >
                                        <Download size={14} />
                                        Export JSON
                                    </button>
                                    <button
                                        onClick={publishDocumentation}
                                        disabled={publishing}
                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        {publishing ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <Globe size={14} />
                                        )}
                                        Publish
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-4 overflow-auto max-h-96">
                                <pre className="text-xs font-mono text-gray-800 dark:text-gray-200">
                                    {JSON.stringify(spec, null, 2)}
                                </pre>
                            </div>

                            {config?.publishedUrl && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                                    <p className="text-xs text-blue-900 dark:text-blue-200">
                                        <strong>Public URL:</strong> https://docs.yourdomain.com/{config.publishedUrl}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
