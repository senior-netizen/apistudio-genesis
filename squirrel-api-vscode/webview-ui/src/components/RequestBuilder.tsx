import { useMemo } from "react";
import { Play, Plus, Trash2, Code2 } from "lucide-react";
import { ApiRequest, EnvironmentDefinition, AuthCredentials, HttpMethod } from "./types";

interface RequestBuilderProps {
  request: ApiRequest;
  environments: EnvironmentDefinition[];
  auth: AuthCredentials[];
  onChange(request: ApiRequest): void;
  onSend(): void;
  onGenerateSnippet(type: "curl" | "axios" | "fetch"): void;
}

const glass = "bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/10";
const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "TRACE"];

export function RequestBuilder({ request, environments, auth, onChange, onSend, onGenerateSnippet }: RequestBuilderProps) {
  const headers = request.headers ?? {};
  const headerEntries = useMemo(() => Object.entries(headers), [headers]);

  const setHeader = (key: string, value: string) => {
    onChange({ ...request, headers: { ...headers, [key]: value } });
  };

  const removeHeader = (key: string) => {
    const copy = { ...headers };
    delete copy[key];
    onChange({ ...request, headers: copy });
  };

  return (
    <section className={`p-4 rounded-3xl space-y-4 ${glass}`}>
      <div className="flex items-center gap-2">
        <select
          className="rounded-2xl bg-slate-900/60 border border-white/10 px-3 py-2 text-xs text-teal-200 font-semibold"
          value={request.method}
          onChange={(event) => onChange({ ...request, method: event.target.value as HttpMethod })}
        >
          {methods.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
        <input
          className="flex-1 rounded-2xl bg-slate-950/60 border border-white/10 px-3 py-2 text-sm text-slate-100"
          value={request.url}
          onChange={(event) => onChange({ ...request, url: event.target.value })}
          placeholder="https://api.example.com/v1/resource"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <select
          className="rounded-2xl bg-slate-900/60 border border-white/10 px-3 py-2 text-slate-200"
          value={request.environmentId ?? ""}
          onChange={(event) => onChange({ ...request, environmentId: event.target.value || undefined })}
        >
          <option value="">No environment</option>
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-2xl bg-slate-900/60 border border-white/10 px-3 py-2 text-slate-200"
          value={request.authId ?? ""}
          onChange={(event) => onChange({ ...request, authId: event.target.value || undefined })}
        >
          <option value="">No auth</option>
          {auth.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>Headers</span>
          <button
            className="inline-flex items-center gap-1 text-teal-200"
            onClick={() => setHeader(`Header-${headerEntries.length + 1}`, "")}
          >
            <Plus size={12} /> Add header
          </button>
        </div>
        <div className="space-y-2">
          {headerEntries.map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <input
                className="flex-1 rounded-xl bg-slate-950/60 border border-white/10 px-2 py-1"
                value={key}
                onChange={(event) => {
                  const newKey = event.target.value;
                  const copy = { ...headers };
                  delete copy[key];
                  copy[newKey] = value;
                  onChange({ ...request, headers: copy });
                }}
              />
              <input
                className="flex-[2] rounded-xl bg-slate-950/60 border border-white/10 px-2 py-1"
                value={value}
                onChange={(event) => setHeader(key, event.target.value)}
              />
              <button className="px-2 py-1 rounded-lg bg-slate-800/60" onClick={() => removeHeader(key)}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {!headerEntries.length && <p className="text-xs text-slate-500">No headers configured.</p>}
        </div>
      </div>
      <textarea
        className="w-full h-32 rounded-2xl bg-slate-950/60 border border-white/10 px-3 py-2 text-xs text-slate-200 font-mono"
        value={request.body ?? ""}
        onChange={(event) => onChange({ ...request, body: event.target.value })}
        placeholder={`{
  "message": "Hello"
}`}
      />
      <div className="flex flex-wrap gap-2">
        <button
          className="px-3 py-2 rounded-2xl bg-teal-500 text-slate-900 font-semibold inline-flex items-center gap-2 shadow-lg shadow-teal-500/30"
          onClick={onSend}
        >
          <Play size={16} /> Send Request
        </button>
        <button className="px-3 py-2 rounded-2xl bg-slate-800/60 text-slate-200 inline-flex items-center gap-2" onClick={() => onGenerateSnippet("curl")}>
          <Code2 size={16} /> cURL
        </button>
        <button className="px-3 py-2 rounded-2xl bg-slate-800/60 text-slate-200 inline-flex items-center gap-2" onClick={() => onGenerateSnippet("axios")}>
          <Code2 size={16} /> Axios
        </button>
        <button className="px-3 py-2 rounded-2xl bg-slate-800/60 text-slate-200 inline-flex items-center gap-2" onClick={() => onGenerateSnippet("fetch")}>
          <Code2 size={16} /> Fetch
        </button>
      </div>
    </section>
  );
}
