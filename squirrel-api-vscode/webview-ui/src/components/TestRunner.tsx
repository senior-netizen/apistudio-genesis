import { Play, ClipboardCopy } from "lucide-react";
import { TestResult } from "./types";

interface TestRunnerProps {
  tests?: string;
  results: TestResult[];
  onChange(tests: string): void;
  onRun(): void;
}

const glass = "bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/10";

export function TestRunner({ tests, results, onChange, onRun }: TestRunnerProps) {
  return (
    <section className={`p-4 rounded-3xl space-y-3 ${glass}`}>
      <header className="flex items-center justify-between">
        <span className="uppercase text-xs tracking-[0.2em] text-slate-200">Tests</span>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-100 inline-flex items-center gap-1"
            onClick={onRun}
          >
            <Play size={14} /> Run
          </button>
          <button
            className="px-2 py-1 rounded-full bg-slate-800/60"
            onClick={() => navigator.clipboard.writeText(tests ?? "")}
          >
            <ClipboardCopy size={14} />
          </button>
        </div>
      </header>
      <textarea
        className="w-full h-32 rounded-2xl bg-slate-950/60 border border-white/10 px-3 py-2 text-xs text-slate-200 font-mono"
        placeholder={`test('status is ok', () => {\n  expect(response.status === 200, 'status should be 200');\n});`}
        value={tests ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
        {results.map((result) => (
          <div
            key={result.id}
            className={`rounded-xl px-3 py-2 text-xs ${
              result.passed ? "bg-emerald-500/20 text-emerald-100" : "bg-rose-500/20 text-rose-100"
            }`}
          >
            <div className="font-semibold">{result.title}</div>
            {result.message && <div className="text-[11px] opacity-80">{result.message}</div>}
          </div>
        ))}
        {!results.length && <p className="text-xs text-slate-500">Write tests with the mini harness to validate responses.</p>}
      </div>
    </section>
  );
}
