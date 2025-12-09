import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
} from '@sdl/ui';
import { Download, ShieldCheck, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../ui/toast';
import { useAppStore } from '../../store';
import { parsePostmanCollection, toPostmanCollection } from '../../lib/importExport/postman';
import { parseOpenApi, toOpenApi } from '../../lib/importExport/openapi';
import yaml from 'js-yaml';
import {
  exportWorkspace,
  fetchWorkspaceAuditLogs,
  importWorkspace,
  listWorkspaces,
  type WorkspaceAuditLog,
  type WorkspaceListItem,
} from '../../lib/api/workspace';

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseStructuredContent(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return yaml.load(raw);
    } catch (error) {
      throw new Error('Unable to parse as JSON or YAML');
    }
  }
}

type ImportKind = 'postman' | 'openapi' | 'workspace';

interface ImportSummary {
  projects: number;
  collections: number;
  requests: number;
  environments: number;
  currentProjects?: number;
  currentCollections?: number;
  currentRequests?: number;
  currentEnvironments?: number;
}

interface PendingImport {
  kind: ImportKind;
  name: string;
  bundle: any;
  summary: ImportSummary;
  fileName?: string;
  collisions?: {
    collections: string[];
    requests: string[];
  };
}

interface EnvOptions {
  maskValues: boolean;
  keyPrefix: string;
}

function summarizeProject(project: any): { collections: number; requests: number } {
  const walk = (collections: any[] = []): { collections: number; requests: number } =>
    collections.reduce(
      (acc, collection) => {
        const nested = walk(collection.folders ?? []);
        return {
          collections: acc.collections + 1 + nested.collections,
          requests: acc.requests + (collection.requests?.length ?? 0) + nested.requests,
        };
      },
      { collections: 0, requests: 0 },
    );
  const root = walk(project.collections ?? []);
  return {
    collections: root.collections,
    requests: root.requests,
  };
}

function summarizeProjectsList(projects: any[]): ImportSummary {
  const summary = projects.reduce(
    (acc, project) => {
      const stats = summarizeProject(project);
      acc.projects += 1;
      acc.collections += stats.collections;
      acc.requests += stats.requests;
      acc.environments += project.environments?.length ?? 0;
      return acc;
    },
    { projects: 0, collections: 0, requests: 0, environments: 0 },
  );
  return summary;
}

function summarizeWorkspaceBundle(bundle: any): ImportSummary {
  const projects = bundle?.projects ?? [];
  const envs = bundle?.environments ?? [];
  const projectSummary = summarizeProjectsList(projects);
  return {
    ...projectSummary,
    environments: projectSummary.environments + (envs.length ?? 0),
  };
}

function collectNames(projects: any[]): { projects: string[]; collections: string[]; requests: string[] } {
  const projectNames = projects.map((p) => p?.name).filter(Boolean).slice(0, 5);
  const collectionNames: string[] = [];
  const requestNames: string[] = [];

  const walk = (collections: any[] = []) => {
    collections.forEach((col) => {
      if (collectionNames.length < 6 && col?.name) collectionNames.push(col.name);
      (col.requests ?? []).forEach((req: any) => {
        if (requestNames.length < 6 && req?.name) requestNames.push(req.name);
      });
      walk(col.folders ?? []);
    });
  };

  projects.forEach((project) => walk(project?.collections ?? []));

  return {
    projects: projectNames,
    collections: collectionNames,
    requests: requestNames,
  };
}

function findCollisions(incomingProjects: any[], currentProjects: any[]) {
  const collisions: { collections: string[]; requests: string[] } = { collections: [], requests: [] };

  const mapCollections = (projects: any[]) => {
    const entries: string[] = [];
    const walk = (projectName: string, collections: any[] = []) => {
      collections.forEach((col) => {
        const path = `${projectName} / ${col?.name ?? 'Untitled'}`;
        entries.push(path.toLowerCase());
        walk(projectName, col.folders ?? []);
      });
    };
    projects.forEach((project) => walk(project?.name ?? 'Project', project?.collections ?? []));
    return entries;
  };

  const mapRequests = (projects: any[]) => {
    const entries: string[] = [];
    const walk = (projectName: string, collections: any[] = []) => {
      collections.forEach((col) => {
        (col.requests ?? []).forEach((req: any) => {
          entries.push(`${projectName} / ${col?.name ?? 'Collection'} / ${req?.name ?? 'Request'}`.toLowerCase());
        });
        walk(projectName, col.folders ?? []);
      });
    };
    projects.forEach((project) => walk(project?.name ?? 'Project', project?.collections ?? []));
    return entries;
  };

  const currentCollectionSet = new Set(mapCollections(currentProjects));
  const currentRequestSet = new Set(mapRequests(currentProjects));

  const incomingCollectionPaths = mapCollections(incomingProjects);
  const incomingRequestPaths = mapRequests(incomingProjects);

  collisions.collections = incomingCollectionPaths.filter((path) => currentCollectionSet.has(path)).slice(0, 6);
  collisions.requests = incomingRequestPaths.filter((path) => currentRequestSet.has(path)).slice(0, 6);

  return collisions;
}

function applyEnvTransforms(bundle: any, options: EnvOptions): any {
  if (!options.maskValues && !options.keyPrefix) return bundle;
  const clone = JSON.parse(JSON.stringify(bundle));
  const transformEnvs = (envs: any[]) => {
    envs?.forEach((env) => {
      env.variables = (env.variables ?? []).map((variable: any) => ({
        ...variable,
        key: options.keyPrefix ? `${options.keyPrefix}${variable.key}` : variable.key,
        value: options.maskValues ? '' : variable.value,
      }));
    });
  };
  transformEnvs(clone.environments ?? []);
  (clone.projects ?? []).forEach((project: any) => transformEnvs(project.environments ?? []));
  return clone;
}

export function ImportExportControls() {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const postmanInputRef = useRef<HTMLInputElement>(null);
  const openApiInputRef = useRef<HTMLInputElement>(null);
  const workspaceInputRef = useRef<HTMLInputElement>(null);
  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceListItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<WorkspaceAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [envOptions, setEnvOptions] = useState<EnvOptions>({ maskValues: true, keyPrefix: '' });
  const navigate = useNavigate();
  const { createProject, createCollection, createRequest, projects, activeProjectId } = useAppStore((state) => ({
    createProject: state.createProject,
    createCollection: state.createCollection,
    createRequest: state.createRequest,
    projects: state.projects,
    activeProjectId: state.activeProjectId,
  }));

  useEffect(() => {
    void (async () => {
      try {
        const response = await listWorkspaces();
        const workspaces = Array.isArray(response) ? response : (response as any)?.items ?? [];
        setWorkspaceOptions(workspaces);
        if (!workspaceId && workspaces[0]?.id) {
          setWorkspaceId(workspaces[0].id);
        }
      } catch (error) {
        console.warn('[import/export] unable to load workspaces', error);
      }
    })();
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) {
      setAuditLogs([]);
      return;
    }
    setAuditLoading(true);
    void fetchWorkspaceAuditLogs(workspaceId, {
      limit: 3,
      actions: ['workspace.import', 'workspace.export'],
    })
      .then((logs) => setAuditLogs(logs))
      .catch((error) => {
        console.warn('[import/export] unable to load audit logs', error);
      })
      .finally(() => setAuditLoading(false));
  }, [workspaceId]);

  const handlePostmanImport = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      push({ title: 'File too large', description: 'Limit imports to 5MB', tone: 'warning' });
      return;
    }
    try {
      const raw = await readFileAsText(file);
      const json = parseStructuredContent(raw);
      const project = parsePostmanCollection(json);
      const incoming = summarizeProjectsList([project]);
      const current = summarizeProjectsList(projects);
      const collisions = findCollisions([project], projects);
      setPendingImport({
        kind: 'postman',
        name: project.name,
        bundle: project,
        summary: {
          ...incoming,
          currentProjects: current.projects,
          currentCollections: current.collections,
          currentRequests: current.requests,
          currentEnvironments: current.environments,
        },
        fileName: file.name,
        collisions,
      });
    } catch (error) {
      console.error(error);
      push({ title: 'Import failed', description: error instanceof Error ? error.message : 'Unable to import Postman JSON', tone: 'danger' });
    }
    finally {
      if (postmanInputRef.current) postmanInputRef.current.value = '';
    }
  }, [projects, push]);

  const handleOpenApiImport = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      push({ title: 'File too large', description: 'Limit imports to 5MB', tone: 'warning' });
      return;
    }
    try {
      const raw = await readFileAsText(file);
      const json = parseStructuredContent(raw);
      const project = parseOpenApi(json);
      const incoming = summarizeProjectsList([project]);
      const current = summarizeProjectsList(projects);
      const collisions = findCollisions([project], projects);
      setPendingImport({
        kind: 'openapi',
        name: project.name,
        bundle: project,
        summary: {
          ...incoming,
          currentProjects: current.projects,
          currentCollections: current.collections,
          currentRequests: current.requests,
          currentEnvironments: current.environments,
        },
        fileName: file.name,
        collisions,
      });
    } catch (error) {
      console.error(error);
      push({ title: 'Import failed', description: error instanceof Error ? error.message : 'Unable to import OpenAPI JSON', tone: 'danger' });
    }
    finally {
      if (openApiInputRef.current) openApiInputRef.current.value = '';
    }
  }, [projects, push]);

  const exportActiveProject = useCallback(async (format: 'postman' | 'openapi' | 'workspace') => {
    const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];
    if (format === 'workspace') {
      const targetWorkspaceId = workspaceId.trim();
      if (!targetWorkspaceId) {
        push({ title: 'Workspace required', description: 'Enter a workspace ID to export', tone: 'warning' });
        return;
      }
      setBusy(true);
      try {
        const bundle = await exportWorkspace(targetWorkspaceId);
        downloadJson(`workspace-${targetWorkspaceId}.json`, bundle);
        push({ title: 'Exported workspace', description: targetWorkspaceId, tone: 'success' });
      } catch (error) {
        push({
          title: 'Export failed',
          description: error instanceof Error ? error.message : 'Unable to export workspace',
          tone: 'danger',
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!activeProject) {
      push({ title: 'Nothing to export', description: 'No active project found', tone: 'warning' });
      return;
    }
    if (format === 'postman') {
      downloadJson(`${activeProject.name || 'collection'}.postman.json`, toPostmanCollection(activeProject));
    } else {
      downloadJson(`${activeProject.name || 'collection'}.openapi.json`, toOpenApi(activeProject));
    }
    push({ title: 'Exported', description: `${activeProject.name} (${format})`, tone: 'success' });
  }, [activeProjectId, projects, push, workspaceId]);

  const importWorkspaceBundle = useCallback(
    async (file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        push({ title: 'File too large', description: 'Limit imports to 5MB', tone: 'warning' });
        return;
      }
      const targetWorkspaceId = workspaceId.trim();
      if (!targetWorkspaceId) {
        push({ title: 'Workspace required', description: 'Enter a workspace ID to import into', tone: 'warning' });
        return;
      }
      try {
        const raw = await readFileAsText(file);
        const json = parseStructuredContent(raw);
        setBusy(true);
        const dryRun = await importWorkspace(targetWorkspaceId, json as any, { dryRun: true });
        const summary = dryRun?.summary ?? summarizeWorkspaceBundle(json);
        const current = summarizeProjectsList(projects);
        const incomingProjects = json?.projects ?? [];
        const collisions = findCollisions(incomingProjects, projects);
        setPendingImport({
          kind: 'workspace',
          name: `Workspace ${targetWorkspaceId}`,
          bundle: json,
          summary: {
            ...summary,
            currentProjects: current.projects,
            currentCollections: current.collections,
            currentRequests: current.requests,
            currentEnvironments: current.environments,
          },
          fileName: file.name,
          collisions,
        });
        push({ title: 'Validated workspace bundle', description: 'Dry run succeeded. Review and confirm to import.', tone: 'success' });
      } catch (error) {
        push({
          title: 'Import failed',
          description: error instanceof Error ? error.message : 'Unable to validate workspace bundle',
          tone: 'danger',
        });
      } finally {
        setBusy(false);
        if (workspaceInputRef.current) workspaceInputRef.current.value = '';
      }
    },
    [projects, push, workspaceId],
  );

  const confirmPendingImport = useCallback(async () => {
    if (!pendingImport) return;
    setBusy(true);
    try {
      if (pendingImport.kind === 'workspace') {
        const targetWorkspaceId = workspaceId.trim();
        if (!targetWorkspaceId) {
          throw new Error('Workspace ID is required for import');
        }
        const transformed = applyEnvTransforms(pendingImport.bundle, envOptions);
        await importWorkspace(targetWorkspaceId, transformed as any);
        push({
          title: 'Imported workspace',
          description: 'Collections, requests, and environments imported',
          tone: 'success',
        });
      } else {
        const project = pendingImport.bundle;
        const createdProject = await createProject(project.name);
        for (const collection of project.collections) {
          const createdCollection = await createCollection(createdProject.id as string, collection.name);
          if (!createdCollection) continue;
          for (const request of collection.requests) {
            await createRequest(createdCollection.id as string, request);
          }
        }
        push({
          title: `Imported ${pendingImport.kind === 'postman' ? 'Postman' : 'OpenAPI'}`,
          description: project.name,
          tone: 'success',
        });
      }
    } catch (error) {
      push({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Unable to complete import',
          tone: 'danger',
        });
      } finally {
        setBusy(false);
        setPendingImport(null);
        setEnvOptions({ maskValues: true, keyPrefix: '' });
      }
  }, [createCollection, createProject, createRequest, envOptions, pendingImport, push, workspaceId]);

  const latestAudit = auditLogs[0];
  const formatActionLabel = (action?: string) => {
    if (!action) return 'activity';
    return action.replace('workspace.', '').replace(/_/g, ' ');
  };
  const summarizeMetadata = (metadata?: any) => {
    if (!metadata || typeof metadata !== 'object') return '';
    const parts: string[] = [];
    if (typeof (metadata as any).projects === 'number') parts.push(`${metadata.projects} projects`);
    if (typeof (metadata as any).collections === 'number') parts.push(`${metadata.collections} collections`);
    if (typeof (metadata as any).environments === 'number') parts.push(`${metadata.environments} envs`);
    return parts.join(' • ');
  };

  const renderSummaryRow = (label: string, value: number, current?: number) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">{value}</Badge>
        {typeof current === 'number' ? <span className="text-xs text-muted-foreground">Current: {current}</span> : null}
      </div>
    </div>
  );

  const maskVariableKeys = (bundle: any): string[] => {
    const keys = new Set<string>();
    const collect = (envs: any[]) => {
      envs?.forEach((env) => {
        (env?.variables ?? []).forEach((variable: any) => {
          if (variable?.key) keys.add(variable.key);
        });
      });
    };
    collect(bundle?.environments ?? []);
    (bundle?.projects ?? []).forEach((project: any) => collect(project?.environments ?? []));
    return Array.from(keys).slice(0, 6);
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={postmanInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handlePostmanImport(file);
            }}
          />
          <input
            ref={openApiInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleOpenApiImport(file);
            }}
          />
          <input
            ref={workspaceInputRef}
            type="file"
            accept=".json,.yaml,.yml,application/json,text/yaml"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importWorkspaceBundle(file);
            }}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="subtle" disabled={busy} className="gap-2">
                <Upload className="h-4 w-4" aria-hidden /> Import
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => postmanInputRef.current?.click()}>Postman collection (v2.1 JSON)</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openApiInputRef.current?.click()}>OpenAPI 3 (JSON)</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => workspaceInputRef.current?.click()}>Workspace bundle (JSON/YAML)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={busy} className="gap-2">
                <Download className="h-4 w-4" aria-hidden /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => exportActiveProject('postman')}>Postman collection</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => exportActiveProject('openapi')}>OpenAPI 3</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => exportActiveProject('workspace')}>Workspace bundle</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2">
            <select
              className="h-9 min-w-[180px] rounded-md border border-border/60 bg-background px-2 text-sm text-foreground"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
            >
              {workspaceOptions.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name || ws.id}
                </option>
              ))}
              {!workspaceOptions.length && <option value="">Enter workspace ID</option>}
            </select>
            {!workspaceOptions.length && (
              <Input
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                placeholder="Workspace ID"
                className="h-9 w-40 text-sm"
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/50 px-2 py-1">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            <span>Audited</span>
          </span>
          <span className="truncate">
            {auditLoading && 'Checking import/export activity…'}
            {!auditLoading && latestAudit && (
              <>
                Last {formatActionLabel(latestAudit.action)} on {new Date(latestAudit.createdAt).toLocaleString()}
                {summarizeMetadata(latestAudit.metadata) ? ` • ${summarizeMetadata(latestAudit.metadata)}` : ''}
              </>
            )}
            {!auditLoading && !latestAudit && 'Import and export actions are logged for this workspace.'}
          </span>
          <Button
            variant="link"
            size="sm"
            className="px-0 text-xs"
            disabled={!workspaceId}
            onClick={() => workspaceId && navigate(`/settings/${workspaceId}/governance?tab=audit`)}
          >
            View audit log
          </Button>
        </div>
      </div>

      <Dialog open={Boolean(pendingImport)} onOpenChange={(open) => (open ? null : setPendingImport(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review import</DialogTitle>
            <DialogDescription>
              {pendingImport
                ? `Preflight for ${pendingImport.fileName || pendingImport.name} (${pendingImport.kind}).`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {pendingImport ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {renderSummaryRow('Projects', pendingImport.summary.projects, pendingImport.summary.currentProjects)}
                {renderSummaryRow('Collections', pendingImport.summary.collections, pendingImport.summary.currentCollections)}
                {renderSummaryRow('Requests', pendingImport.summary.requests, pendingImport.summary.currentRequests)}
                {renderSummaryRow('Environments', pendingImport.summary.environments, pendingImport.summary.currentEnvironments)}
              </div>

              <div className="rounded-md border border-border/60 bg-muted/40 p-3">
                <p className="mb-2 text-xs font-semibold text-foreground">Side-by-side preview</p>
                {(() => {
                      const incomingProjects =
                        pendingImport.kind === 'workspace' ? pendingImport.bundle.projects ?? [] : [pendingImport.bundle];
                      const incomingNames = collectNames(incomingProjects);
                      const currentNames = collectNames(projects);
                  return (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Incoming</p>
                        <p className="mt-1 text-foreground">
                              Projects: {incomingNames.projects.join(', ') || '—'}
                            </p>
                            <p className="mt-1 text-foreground">
                              Collections: {incomingNames.collections.join(', ') || '—'}
                            </p>
                            <p className="mt-1 text-foreground">
                              Requests: {incomingNames.requests.join(', ') || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Current workspace</p>
                            <p className="mt-1 text-foreground">{currentNames.projects.join(', ') || '—'}</p>
                            <p className="mt-1 text-foreground">{currentNames.collections.join(', ') || '—'}</p>
                            <p className="mt-1 text-foreground">{currentNames.requests.join(', ') || '—'}</p>
                        </div>
                      </div>
                    );
                  })()}
              </div>

              {pendingImport.collisions && (pendingImport.collisions.collections.length || pendingImport.collisions.requests.length) ? (
                <div className="rounded-md border border-amber-300/60 bg-amber-50/60 p-3 text-xs text-amber-900">
                  <p className="font-semibold text-foreground">Name collisions detected</p>
                  {pendingImport.collisions.collections.length ? (
                    <p className="mt-2">
                      Collections matching current workspace: {pendingImport.collisions.collections.join(', ')}
                    </p>
                  ) : null}
                  {pendingImport.collisions.requests.length ? (
                    <p className="mt-1">
                      Requests matching current workspace: {pendingImport.collisions.requests.join(', ')}
                    </p>
                  ) : null}
                  <p className="mt-2 text-amber-800">Imports will append; rename after import if you want to avoid confusion.</p>
                </div>
              ) : null}

              {pendingImport.kind === 'workspace' ? (
                <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground space-y-2">
                  <p className="font-semibold text-foreground">Workspace validation</p>
                  <p>Dry run completed; no data has been written yet.</p>
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      id="mask-values"
                      type="checkbox"
                      checked={envOptions.maskValues}
                      onChange={(e) => setEnvOptions((prev) => ({ ...prev, maskValues: e.target.checked }))}
                    />
                    <Label htmlFor="mask-values" className="cursor-pointer text-xs">
                      Strip environment values on import
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="prefix" className="text-xs text-muted-foreground">
                      Prefix environment keys
                    </Label>
                    <Input
                      id="prefix"
                      value={envOptions.keyPrefix}
                      onChange={(e) => setEnvOptions((prev) => ({ ...prev, keyPrefix: e.target.value }))}
                      placeholder="ex: imported_"
                      className="h-8 text-xs"
                    />
                  </div>
                  <p className="mt-2">
                    Environment variable keys (values shown after masking):{' '}
                    {maskVariableKeys(applyEnvTransforms(pendingImport.bundle, envOptions)).join(', ') || 'none'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Collections and requests will be appended as a new project. Existing projects stay untouched.
                </p>
              )}
            </div>
          ) : null}
          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={() => setPendingImport(null)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmPendingImport()} disabled={busy || !pendingImport}>
              Confirm import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
