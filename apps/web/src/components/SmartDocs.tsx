import { useMemo, useState } from "react";
import { documentationApi } from "../lib/api/documentation";

export interface SmartDocsProps {
  collectionId?: string;
  title?: string;
  description?: string;
  version?: string;
  onGenerate?: () => void;
}

function buildMarkdownPreview(spec: any): string {
  if (!spec || typeof spec !== "object") {
    return "No documentation preview available.";
  }

  const info = spec.info ?? {};
  const paths = spec.paths ?? {};
  const routeLines: string[] = [];

  Object.entries(paths)
    .slice(0, 15)
    .forEach(([path, methods]) => {
      if (!methods || typeof methods !== "object") {
        return;
      }
      Object.keys(methods).forEach((method) => {
        routeLines.push(`- ${String(method).toUpperCase()} ${path}`);
      });
    });

  const endpointSection =
    routeLines.length > 0
      ? routeLines.join("\n")
      : "- No endpoints found in generated spec.";

  return [
    `# ${info.title ?? "API Documentation"}`,
    "",
    info.description ?? "Generated OpenAPI preview.",
    "",
    `**Version:** ${info.version ?? "1.0.0"}`,
    "",
    "## Endpoints",
    endpointSection,
  ].join("\n");
}

export function SmartDocs({
  collectionId,
  title,
  description,
  version,
  onGenerate,
}: SmartDocsProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = useMemo(
    () => Boolean(collectionId?.trim()),
    [collectionId],
  );

  const handleGenerate = async () => {
    onGenerate?.();
    if (!collectionId) {
      setError("Collection ID is required to generate documentation.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await documentationApi.generate(collectionId, {
        title,
        description,
        version,
      });
      setContent(buildMarkdownPreview(response?.spec));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to generate documentation.";
      setError(message);
      setContent("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="smart-docs space-y-3">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate || loading}
      >
        {loading ? "Generating…" : "Generate Docs"}
      </button>
      {!canGenerate && (
        <p className="text-sm text-muted">
          Provide a collection ID to generate SmartDocs.
        </p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {content && (
        <pre className="smart-docs__preview whitespace-pre-wrap">{content}</pre>
      )}
    </section>
  );
}

export default SmartDocs;
