import { useState } from "react";
import { FileText, Download } from "lucide-react";
import { ApiProject, DocumentationBundle } from "./types";

interface DocsGeneratorProps {
  projects: ApiProject[];
  latest?: DocumentationBundle;
  onGenerate(projectId: string): void;
}

const glass = "bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/10";

export function DocsGenerator({ projects, latest, onGenerate }: DocsGeneratorProps) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");

  const handleDownload = (type: "markdown" | "html") => {
    if (!latest) return;
    const blob = new Blob([type === "markdown" ? latest.markdown : latest.html], {
      type: type === "markdown" ? "text/markdown" : "text/html",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `squirrel-docs.${type === "markdown" ? "md" : "html"}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className={`p-4 rounded-3xl space-y-3 ${glass}`}>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200">
          <FileText size={16} />
          <span className="uppercase text-xs tracking-[0.2em]">Docs</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <select
            className="bg-slate-900/60 border border-white/10 rounded-full px-2 py-1"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <button
            className="px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-100"
            onClick={() => projectId && onGenerate(projectId)}
            disabled={!projectId}
          >
            Generate
          </button>
        </div>
      </header>
      {latest ? (
        <div className="space-y-2 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <span>Generated {new Date(latest.generatedAt).toLocaleString()}</span>
            <div className="flex items-center gap-2">
              <button className="px-2 py-1 rounded-full bg-slate-800/60" onClick={() => handleDownload("markdown")}>
                <Download size={14} /> MD
              </button>
              <button className="px-2 py-1 rounded-full bg-slate-800/60" onClick={() => handleDownload("html")}>
                <Download size={14} /> HTML
              </button>
            </div>
          </div>
          <pre className="max-h-40 overflow-y-auto bg-slate-950/60 border border-white/10 rounded-2xl p-3 text-[11px] whitespace-pre-wrap">
            {latest.markdown}
          </pre>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Generate documentation to share collections with your team.</p>
      )}
    </section>
  );
}
