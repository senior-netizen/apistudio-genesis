import { useCallback, useMemo } from "react";
import { FolderPlus, Folder, FilePlus, Trash2, Pencil, Plus } from "lucide-react";
import { ApiProject, CollectionNode, CollectionRequestNode } from "./types";
import { useDialog } from "./DialogProvider";

interface ProjectSidebarProps {
  projects: ApiProject[];
  selectedRequestId?: string;
  onSelectRequest(node: CollectionRequestNode): void;
  onSave(projects: ApiProject[]): void;
}

const glass = "bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/10";

const randomId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36));

export function ProjectSidebar({ projects, selectedRequestId, onSelectRequest, onSave }: ProjectSidebarProps) {
  const dialog = useDialog();
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );

  const updateProjects = useCallback(
    (updater: (current: ApiProject[]) => ApiProject[]) => {
      const next = updater(projects);
      onSave(next);
    },
    [projects, onSave]
  );
  const createProject = useCallback(async () => {
    const name = (await dialog.prompt({
      title: "Create project",
      placeholder: "Project name",
      confirmLabel: "Create",
    }))?.trim();
    if (!name) return;
    updateProjects((current) => [
      ...current,
      {
        id: randomId(),
        name,
        collections: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
  }, [dialog, updateProjects]);

  const updateProject = (projectId: string, updater: (project: ApiProject) => ApiProject) => {
    updateProjects((current) => current.map((project) => (project.id === projectId ? updater(project) : project)));
  };

  const removeProject = useCallback(
    async (projectId: string) => {
      const confirmed = await dialog.confirm({
        title: "Delete project",
        description: "This will remove the project and every nested folder and request.",
        tone: "danger",
        confirmLabel: "Delete",
      });
      if (!confirmed) return;
      updateProjects((current) => current.filter((project) => project.id !== projectId));
    },
    [dialog, updateProjects]
  );

  const renderNode = (projectId: string, node: CollectionNode) => {
    if (node.type === "folder") {
      return (
        <div key={node.id} className="pl-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
            <div className="flex items-center gap-2">
              <Folder size={14} />
              <span>{node.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="text-slate-400 hover:text-slate-200"
                onClick={async () => {
                  const name = (await dialog.prompt({
                    title: "Rename folder",
                    defaultValue: node.name,
                    confirmLabel: "Rename",
                  }))?.trim();
                  if (!name) return;
                  updateProject(projectId, (project) => ({
                    ...project,
                    collections: replaceNode(project.collections, node.id, { ...node, name, updatedAt: Date.now() }),
                    updatedAt: Date.now(),
                  }));
                }}
                aria-label="Rename folder"
              >
                <Pencil size={14} />
              </button>
              <button
                className="text-teal-300 hover:text-teal-100"
                onClick={async () => {
                  const name = (await dialog.prompt({
                    title: "New request",
                    placeholder: "Request name",
                    confirmLabel: "Create",
                  }))?.trim();
                  if (!name) return;
                  const request: CollectionRequestNode = {
                    id: randomId(),
                    type: "request",
                    name,
                    request: {
                      id: randomId(),
                      name,
                      method: "GET",
                      url: "https://api.example.com",
                      headers: {},
                    },
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  };
                  updateProject(projectId, (project) => ({
                    ...project,
                    collections: replaceNode(project.collections, node.id, {
                      ...node,
                      children: [...node.children, request],
                      updatedAt: Date.now(),
                    }),
                    updatedAt: Date.now(),
                  }));
                }}
                aria-label="Add request"
              >
                <FilePlus size={14} />
              </button>
              <button
                className="text-rose-400 hover:text-rose-200"
                onClick={async () => {
                  const confirmed = await dialog.confirm({
                    title: "Delete folder",
                    description: "All nested requests inside this folder will also be removed.",
                    tone: "danger",
                    confirmLabel: "Delete",
                  });
                  if (!confirmed) return;
                  updateProject(projectId, (project) => ({
                    ...project,
                    collections: removeNode(project.collections, node.id),
                    updatedAt: Date.now(),
                  }));
                }}
                aria-label="Delete folder"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">{node.children.map((child) => renderNode(projectId, child))}</div>
        </div>
      );
    }
    return (
      <button
        key={node.id}
        className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center justify-between ${
          node.request.id === selectedRequestId ? "bg-teal-500/20 text-teal-200" : "hover:bg-white/10"
        }`}
        onClick={() => onSelectRequest(node)}
      >
        <span className="text-sm font-medium">{node.name}</span>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{node.request.method}</span>
          <button
            className="text-slate-500 hover:text-rose-300"
            onClick={async (event) => {
              event.stopPropagation();
              const confirmed = await dialog.confirm({
                title: "Delete request",
                description: "This request will be permanently removed from the collection.",
                tone: "danger",
                confirmLabel: "Delete",
              });
              if (!confirmed) return;
              updateProject(projectId, (project) => ({
                ...project,
                collections: removeNode(project.collections, node.id),
                updatedAt: Date.now(),
              }));
            }}
            aria-label="Delete request"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </button>
    );
  };

  return (
    <aside className={`p-4 rounded-3xl space-y-4 h-full overflow-y-auto ${glass}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Projects</h2>
        <button
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-teal-500/30 text-teal-100 text-xs"
          onClick={createProject}
        >
          <Plus size={14} /> New
        </button>
      </div>
      <div className="space-y-6">
        {sortedProjects.map((project) => (
          <div key={project.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-100">{project.name}</span>
              <div className="flex items-center gap-2">
                <button
                  className="text-slate-400 hover:text-slate-200"
                  onClick={async () => {
                    const name = (await dialog.prompt({
                      title: "Rename project",
                      defaultValue: project.name,
                      confirmLabel: "Rename",
                    }))?.trim();
                    if (!name) return;
                    updateProject(project.id, (current) => ({ ...current, name, updatedAt: Date.now() }));
                  }}
                  aria-label="Rename project"
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="text-rose-400 hover:text-rose-200"
                  onClick={() => void removeProject(project.id)}
                  aria-label="Delete project"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  className="text-slate-300 hover:text-teal-200"
                  onClick={async () => {
                    const name = (await dialog.prompt({
                      title: "New folder",
                      placeholder: "Folder name",
                      confirmLabel: "Create",
                    }))?.trim();
                    if (!name) return;
                    const folder: CollectionNode = {
                      id: randomId(),
                      type: "folder",
                      name,
                      children: [],
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                    };
                    updateProject(project.id, (current) => ({
                      ...current,
                      collections: [...current.collections, folder],
                      updatedAt: Date.now(),
                    }));
                  }}
                  aria-label="Add folder"
                >
                  <FolderPlus size={16} />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {project.collections.length ? (
                project.collections.map((node) => renderNode(project.id, node))
              ) : (
                <p className="text-xs text-slate-500">No requests yet. Add a folder or request to begin.</p>
              )}
            </div>
          </div>
        ))}
        {!sortedProjects.length && (
          <div className="text-xs text-slate-400">Create your first project to organize requests and tests.</div>
        )}
      </div>
    </aside>
  );
}

function replaceNode(nodes: CollectionNode[], id: string, next: CollectionNode): CollectionNode[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return next;
    }
    if (node.type === "folder") {
      return { ...node, children: replaceNode(node.children, id, next) };
    }
    return node;
  });
}

function removeNode(nodes: CollectionNode[], id: string): CollectionNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => (node.type === "folder" ? { ...node, children: removeNode(node.children, id) } : node));
}
