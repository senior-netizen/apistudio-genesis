import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { AiCommand, ApiRequest, ApiResponse } from "./types";

interface AIAssistantPanelProps {
  request?: ApiRequest;
  response?: ApiResponse;
  onCommand(command: AiCommand, context: Record<string, unknown>): void;
  transcript?: string;
}

const glass = "bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/10";

const commands: { value: AiCommand; label: string }[] = [
  { value: "analyzeResponse", label: "Analyze response" },
  { value: "suggestFix", label: "Suggest fix" },
  { value: "generateRequest", label: "Generate request" },
  { value: "explainError", label: "Explain error" },
];

export function AIAssistantPanel({ request, response, onCommand, transcript }: AIAssistantPanelProps) {
  const [command, setCommand] = useState<AiCommand>("analyzeResponse");
  const [notes, setNotes] = useState("");

  const run = () => {
    onCommand(command, {
      request,
      response,
      notes,
      summary: `${request?.method ?? ""} ${request?.url ?? ""}`,
    });
  };

  return (
    <section className={`p-4 rounded-3xl space-y-3 ${glass}`}>
      <header className="flex items-center gap-2 text-slate-200">
        <Sparkles size={16} />
        <span className="uppercase text-xs tracking-[0.2em]">Squirrel AI</span>
      </header>
      <select
        className="w-full rounded-2xl bg-slate-950/60 border border-white/10 px-3 py-2 text-xs text-slate-200"
        value={command}
        onChange={(event) => setCommand(event.target.value as AiCommand)}
      >
        {commands.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <textarea
        className="w-full rounded-2xl bg-slate-950/60 border border-white/10 px-3 py-2 text-xs text-slate-200"
        rows={3}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Add optional context for the assistant"
      />
      <button
        className="w-full px-3 py-2 rounded-2xl bg-amber-500/30 text-amber-100 inline-flex items-center justify-center gap-2"
        onClick={run}
      >
        <Send size={16} />
        Ask Squirrel
      </button>
      <div className="rounded-2xl bg-slate-950/60 border border-white/10 p-3 text-xs text-slate-300 min-h-[80px] whitespace-pre-wrap">
        {transcript ?? "AI replies will appear here with actionable insights."}
      </div>
    </section>
  );
}
