import { useState } from "react";
import { Braces, Play } from "lucide-react";

interface GraphQLPlaygroundProps {
  onExecute(payload: { url: string; query: string; variables?: string; headers?: Record<string, string> }): void;
}

const glass = "bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/10";

export function GraphQLPlayground({ onExecute }: GraphQLPlaygroundProps) {
  const [url, setUrl] = useState("https://countries.trevorblades.com/");
  const [query, setQuery] = useState(`query Countries {\n  countries {\n    code\n    name\n  }\n}`);
  const [variables, setVariables] = useState("{}");
  const [headers, setHeaders] = useState("Content-Type: application/json");

  const execute = () => {
    const headerEntries = headers
      .split(/\n+/)
      .map((line) => line.split(":"))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key.trim(), value.trim()]);
    onExecute({ url, query, variables, headers: Object.fromEntries(headerEntries) });
  };

  return (
    <section className={`p-4 rounded-3xl space-y-3 ${glass}`}>
      <header className="flex items-center justify-between text-slate-200">
        <div className="flex items-center gap-2">
          <Braces size={16} />
          <span className="uppercase text-xs tracking-[0.2em]">GraphQL</span>
        </div>
        <button className="px-3 py-1 rounded-full bg-purple-500/30 text-purple-100 inline-flex items-center gap-1" onClick={execute}>
          <Play size={14} /> Run
        </button>
      </header>
      <input
        className="w-full rounded-2xl bg-slate-950/60 border border-white/10 px-3 py-2 text-xs text-slate-200"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="GraphQL endpoint"
      />
      <textarea
        className="w-full rounded-2xl bg-slate-950/60 border border-white/10 px-3 py-2 text-xs text-slate-200 font-mono"
        rows={6}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <textarea
        className="w-full rounded-2xl bg-slate-950/60 border border-white/10 px-3 py-2 text-xs text-slate-200 font-mono"
        rows={3}
        value={variables}
        onChange={(event) => setVariables(event.target.value)}
        placeholder="{}"
      />
      <textarea
        className="w-full rounded-2xl bg-slate-950/60 border border-white/10 px-3 py-2 text-xs text-slate-200 font-mono"
        rows={3}
        value={headers}
        onChange={(event) => setHeaders(event.target.value)}
        placeholder="Header: Value"
      />
    </section>
  );
}
