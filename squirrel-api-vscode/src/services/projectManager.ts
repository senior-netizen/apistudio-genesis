/**
 * @squirrel/vscode - Project and collection management utilities.
 */

import { randomUUID } from "crypto";
import {
  ApiProject,
  CollectionFolderNode,
  CollectionNode,
  CollectionRequestNode,
  DocumentationBundle,
} from "../types/api";
import { getProjectsState, saveProjectsState } from "../utils/storage";

const ensureFolder = (node: CollectionNode): CollectionNode => {
  if (node.type === "folder") {
    const children = node.children?.map(ensureFolder) ?? [];
    return {
      ...node,
      id: node.id ?? randomUUID(),
      children,
      createdAt: node.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    } satisfies CollectionFolderNode;
  }
  return {
    ...node,
    id: node.id ?? randomUUID(),
    createdAt: node.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  } satisfies CollectionRequestNode;
};

const normalizeProject = (project: ApiProject): ApiProject => ({
  ...project,
  id: project.id ?? randomUUID(),
  createdAt: project.createdAt ?? Date.now(),
  updatedAt: Date.now(),
  collections: project.collections?.map(ensureFolder) ?? [],
});

export const getProjects = async (): Promise<ApiProject[]> => {
  const stored = await getProjectsState<ApiProject>();
  return stored.map((project) => ({
    ...project,
    collections: project.collections?.map(ensureFolder) ?? [],
  }));
};

export const saveProjects = async (projects: ApiProject[]): Promise<ApiProject[]> => {
  const normalized = projects.map(normalizeProject);
  await saveProjectsState(normalized);
  return getProjects();
};

const describeRequest = (node: CollectionRequestNode, depth: number): string => {
  const indent = "  ".repeat(depth);
  const headers = node.request.headers
    ? Object.entries(node.request.headers)
        .map(([key, value]) => `${indent}- ${key}: ${value}`)
        .join("\n")
    : `${indent}- none`;
  const parts = [
    `${"#".repeat(Math.min(depth + 2, 6))} ${node.name}`,
    `${indent}- Method: ${node.request.method}`,
    `${indent}- URL: ${node.request.url}`,
    `${indent}- Headers:\n${headers}`,
  ];
  if (node.request.body) {
    parts.push(`${indent}- Body:\n${indent}${node.request.body}`);
  }
  if (node.tests) {
    parts.push(`${indent}- Tests:\n${indent}${node.tests}`);
  }
  return parts.join("\n\n");
};

const describeNode = (node: CollectionNode, depth: number): string => {
  if (node.type === "folder") {
    const header = `${"#".repeat(Math.min(depth + 1, 6))} ${node.name}`;
    const children = node.children?.map((child) => describeNode(child, depth + 1)).join("\n\n") ?? "";
    return [header, children].filter(Boolean).join("\n\n");
  }
  return describeRequest(node, depth);
};

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const renderNodeHtml = (node: CollectionNode, depth: number): string => {
  if (node.type === "folder") {
    const childHtml = node.children?.map((child) => renderNodeHtml(child, depth + 1)).join("\n") ?? "";
    const level = Math.min(depth + 1, 6);
    return `<section><h${level}>${node.name}</h${level}>${childHtml}</section>`;
  }
  const level = Math.min(depth + 2, 6);
  const subLevel = Math.min(depth + 3, 6);
  const headerRows = node.request.headers
    ? Object.entries(node.request.headers)
        .map(([key, value]) => `<li><strong>${key}</strong>: ${value}</li>`)
        .join("")
    : "<li><em>None</em></li>";
  const bodyBlock = node.request.body
    ? `<pre><code>${escapeHtml(node.request.body)}</code></pre>`
    : "<p><em>Empty body</em></p>";
  const testsBlock = node.tests
    ? `<details><summary>Tests</summary><pre><code>${escapeHtml(node.tests)}</code></pre></details>`
    : "";
  return `
    <article class="request">
      <h${level}>${node.name}</h${level}>
      <p><strong>Method:</strong> ${node.request.method}</p>
      <p><strong>URL:</strong> ${node.request.url}</p>
      <h${subLevel}>Headers</h${subLevel}>
      <ul>${headerRows}</ul>
      ${bodyBlock}
      ${testsBlock}
    </article>
  `;
};

export const generateDocumentation = async (projectId: string): Promise<DocumentationBundle | undefined> => {
  const projects = await getProjects();
  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    return undefined;
  }
  const markdownSections = [
    `# ${project.name}`,
    project.description ? `_${project.description}_` : "",
    project.collections.map((node) => describeNode(node, 1)).join("\n\n"),
  ].filter(Boolean);
  const markdown = markdownSections.join("\n\n");
  const htmlBody = project.collections.map((node) => renderNodeHtml(node, 1)).join("\n");
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${project.name} — API Documentation</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 2rem; color: #0f172a; }
      h1, h2, h3, h4, h5 { color: #0f172a; }
      pre { background: rgba(15, 23, 42, 0.08); padding: 1rem; border-radius: 12px; }
      code { font-family: 'Fira Code', 'SFMono-Regular', monospace; }
      em { color: #475569; }
      section { margin-bottom: 2rem; }
      article.request { margin: 1.5rem 0; padding: 1.25rem; border-radius: 16px; background: rgba(20, 184, 166, 0.08); backdrop-filter: blur(14px); }
    </style>
  </head>
  <body>
    <header>
      <h1>${project.name}</h1>
      ${project.description ? `<p><em>${project.description}</em></p>` : ""}
    </header>
    ${htmlBody}
  </body>
</html>`;
  return { markdown, html, generatedAt: Date.now() };
};
