import { useMemo, useState } from "react";
import { ClipboardCopy, Timer, FileCode } from "lucide-react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vs2015 } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { ApiResponse } from "./types";

interface ResponseViewerProps {
  response?: ApiResponse;
  error?: string;
  snippet?: { type: string; code: string };
}

const glass = "bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/10";

export function ResponseViewer({ response, error, snippet }: ResponseViewerProps) {
  const [tab, setTab] = useState<"json" | "raw" | "preview">("json");
  const formatted = useMemo(() => {
    if (!response) return "";
    if (typeof response.data === "string") {
      try {
        return JSON.stringify(JSON.parse(response.data), null, 2);
      } catch {
        return response.data;
      }
    }
    return JSON.stringify(response.data, null, 2);
  }, [response]);

  const raw = useMemo(() => (response ? String(response.data) : ""), [response]);

  return (
    <section className={`p-4 rounded-3xl space-y-3 ${glass}`}>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-200">
          <span className="uppercase tracking-[0.2em]">Response</span>
          {response && (
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Timer size={14} /> {response.duration} ms
            </span>
          )}
          {response && (
            <span className="inline-flex items-center gap-1 text-slate-400">
              <FileCode size={14} /> {response.size ?? 0} bytes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className={`px-3 py-1 rounded-full ${tab === "json" ? "bg-teal-500/30 text-teal-100" : "bg-slate-800/60"}`}
            onClick={() => setTab("json")}
          >
            JSON
          </button>
          <button
            className={`px-3 py-1 rounded-full ${tab === "raw" ? "bg-teal-500/30 text-teal-100" : "bg-slate-800/60"}`}
            onClick={() => setTab("raw")}
          >
            Raw
          </button>
          <button
            className={`px-3 py-1 rounded-full ${tab === "preview" ? "bg-teal-500/30 text-teal-100" : "bg-slate-800/60"}`}
            onClick={() => setTab("preview")}
          >
            Headers
          </button>
        </div>
      </header>
      {error && (
        <div className="rounded-2xl bg-rose-500/20 text-rose-100 px-3 py-2 text-xs">{error}</div>
      )}
      {response && (
        <div className="rounded-2xl bg-slate-950/60 border border-white/10 p-3 text-xs text-slate-100 min-h-[180px]">
          {tab === "json" && (
            <SyntaxHighlighter style={vs2015} language="json" customStyle={{ background: "transparent", padding: 0 }}>
              {formatted}
            </SyntaxHighlighter>
          )}
          {tab === "raw" && (
            <SyntaxHighlighter style={vs2015} language="text" customStyle={{ background: "transparent", padding: 0 }}>
              {raw}
            </SyntaxHighlighter>
          )}
          {tab === "preview" && (
            <div className="space-y-1">
              {Object.entries(response.headers).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-slate-400">{key}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {snippet && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="uppercase tracking-[0.2em]">{snippet.type}</span>
            <button
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/60"
              onClick={() => navigator.clipboard.writeText(snippet.code)}
            >
              <ClipboardCopy size={14} /> Copy
            </button>
          </div>
          <pre className="rounded-2xl bg-slate-950/60 border border-white/10 p-3 text-[11px] whitespace-pre-wrap text-slate-200">
            {snippet.code}
          </pre>
        </div>
      )}
      {!response && !error && <p className="text-xs text-slate-500">Responses will appear here after you send a request.</p>}
    </section>
  );
}
