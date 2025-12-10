import { useState } from 'react';
import { Braces, Play, Book } from 'lucide-react';

interface GraphQLPlaygroundProps {
    requestId: string;
    initialUrl?: string;
    onExecute?: (result: any) => void;
}

export function GraphQLPlayground({ requestId, initialUrl = '', onExecute }: GraphQLPlaygroundProps) {
    const [url, setUrl] = useState(initialUrl);
    const [query, setQuery] = useState(`query {
  # Start typing your GraphQL query here
}`);
    const [variables, setVariables] = useState('{}');
    const [headers, setHeaders] = useState('');
    const [introspecting, setIntrospecting] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [schema, setSchema] = useState<any>(null);

    const introspectSchema = async () => {
        if (!requestId) return;

        setIntrospecting(true);
        try {
            const response = await fetch(`/api/v1/requests/${requestId}/graphql/introspect`, {
                method: 'POST',
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setSchema(data.schema);
            }
        } catch (error) {
            console.error('Failed to introspect schema:', error);
        } finally {
            setIntrospecting(false);
        }
    };

    const execute = async () => {
        setExecuting(true);
        try {
            const headerEntries = headers
                .split(/\n+/)
                .map((line) => line.split(':'))
                .filter(([key, value]) => key && value)
                .map(([key, value]) => [key.trim(), value.trim()]);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...Object.fromEntries(headerEntries),
                },
                body: JSON.stringify({
                    query,
                    variables: variables ? JSON.parse(variables) : undefined,
                }),
            });

            const result = await response.json();
            onExecute?.(result);
        } catch (error) {
            onExecute?.({ errors: [{ message: String(error) }] });
        } finally {
            setExecuting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                    <Braces size={18} />
                    <span className="font-semibold text-sm">GraphQL</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={introspectSchema}
                        disabled={introspecting || !requestId}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1.5"
                    >
                        <Book size={14} />
                        {introspecting ? 'Loading...' : 'Introspect'}
                    </button>
                    <button
                        onClick={execute}
                        disabled={executing || !url || !query}
                        className="px-4 py-1.5 text-xs font-medium rounded-md bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 flex items-center gap-1.5"
                    >
                        <Play size={14} />
                        {executing ? 'Running...' : 'Run'}
                    </button>
                </div>
            </div>

            {/* URL Input */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.example.com/graphql"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
            </div>

            <div className="flex-1 overflow-hidden flex">
                {/* Query Editor */}
                <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Query</span>
                    </div>
                    <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 px-4 py-3 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none focus:outline-none"
                        placeholder="Enter your GraphQL query..."
                    />

                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Variables</span>
                    </div>
                    <textarea
                        value={variables}
                        onChange={(e) => setVariables(e.target.value)}
                        className="h-24 px-4 py-3 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none focus:outline-none"
                        placeholder="{}"
                    />

                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Headers</span>
                    </div>
                    <textarea
                        value={headers}
                        onChange={(e) => setHeaders(e.target.value)}
                        className="h-20 px-4 py-3 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none focus:outline-none"
                        placeholder="Authorization: Bearer token"
                    />
                </div>

                {/* Schema Explorer */}
                {schema && (
                    <div className="w-80 flex flex-col bg-gray-50 dark:bg-gray-800">
                        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Schema</span>
                        </div>
                        <div className="flex-1 overflow-auto px-4 py-3">
                            <div className="text-xs space-y-2">
                                {schema.__schema?.types?.filter((t: any) => !t.name.startsWith('__')).map((type: any) => (
                                    <div key={type.name} className="text-gray-700 dark:text-gray-300">
                                        <span className="font-semibold">{type.kind.toLowerCase()}</span> {type.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
