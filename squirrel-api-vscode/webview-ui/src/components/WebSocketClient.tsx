import { useState } from "react";
import { Wifi, Send } from "lucide-react";

interface WebSocketClientProps {
  logs: { direction: "in" | "out"; message: string }[];
  connected: boolean;
  onOpen(url: string, protocols: string[]): void;
  onSend(message: string): void;
  onClose(): void;
}

const glass = "bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/10";

export function WebSocketClient({ logs, connected, onOpen, onSend, onClose }: WebSocketClientProps) {
  const [url, setUrl] = useState("wss://echo.websocket.events");
  const [protocols, setProtocols] = useState("");
  const [payload, setPayload] = useState("Hello squirrels! 🐿️");

  const handleConnect = () => {
    const protocolList = protocols.split(/[,\s]+/).filter(Boolean);
    onOpen(url, protocolList);
  };

  return (
    <section className={`p-4 rounded-3xl space-y-3 ${glass}`}>
      <header className="flex items-center justify-between text-slate-200">
        <div className="flex items-center gap-2">
          <Wifi size={16} />
          <span className="uppercase text-xs tracking-[0.2em]">WebSocket</span>
        </div>
        <button
          className={`px-3 py-1 rounded-full ${connected ? "bg-rose-500/30 text-rose-100" : "bg-emerald-500/30 text-emerald-100"}`}
          onClick={connected ? onClose : handleConnect}
        >
          {connected ? "Disconnect" : "Connect"}
        </button>
      </header>
      <input
        className="w-full rounded-2xl bg-slate-950/60 border border-white/10 px-3 py-2 text-xs text-slate-200"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="wss://"
      />
      <input
        className="w-full rounded-2xl bg-slate-950/60 border border-white/10 px-3 py-2 text-xs text-slate-200"
        value={protocols}
        onChange={(event) => setProtocols(event.target.value)}
        placeholder="Protocols (comma separated)"
      />
      <div className="flex items-center gap-2">
        <textarea
          className="flex-1 rounded-2xl bg-slate-950/60 border border-white/10 px-3 py-2 text-xs text-slate-200"
          rows={2}
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
        />
        <button
          className="px-3 py-2 rounded-2xl bg-sky-500/30 text-sky-100 inline-flex items-center gap-2"
          onClick={() => onSend(payload)}
          disabled={!connected}
        >
          <Send size={16} />
        </button>
      </div>
      <div className="rounded-2xl bg-slate-950/60 border border-white/10 p-3 space-y-2 max-h-40 overflow-y-auto text-xs">
        {logs.map((log, index) => (
          <div key={index} className={log.direction === "out" ? "text-sky-200" : "text-emerald-200"}>
            <span className="font-semibold mr-2">{log.direction === "out" ? "→" : "←"}</span>
            <span>{log.message}</span>
          </div>
        ))}
        {!logs.length && <p className="text-slate-500">Connect to stream server activity and test events.</p>}
      </div>
    </section>
  );
}
