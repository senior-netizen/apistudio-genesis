import * as vscode from 'vscode';
import { ApiClient, ApiError } from '../utils/apiClient';
import { CredentialsManager } from '../utils/credentialsManager';
import { ApiWorkspace } from '../types';
import { brand } from '@sdl/language';

type WorkspaceTreeNode =
  | { kind: 'workspace'; workspace: ApiWorkspace }
  | { kind: 'message'; label: string; description?: string; command?: vscode.Command; tooltip?: string };

type ProviderStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'auth' | 'error';

export class WorkspaceTreeProvider implements vscode.TreeDataProvider<WorkspaceTreeNode> {
  public static readonly viewId = 'apistudio.workspaces';

  private readonly _onDidChangeTreeData = new vscode.EventEmitter<WorkspaceTreeNode | void>();
  readonly onDidChangeTreeData: vscode.Event<WorkspaceTreeNode | void> =
    this._onDidChangeTreeData.event;

  private cachedItems: ApiWorkspace[] = [];
  private status: ProviderStatus = 'idle';
  private lastError: string | undefined;

  constructor(
    private readonly memento: vscode.Memento,
    private readonly api: ApiClient,
    private readonly credentials: CredentialsManager,
  ) {}

  async refresh(): Promise<void> {
    this.status = 'loading';
    this._onDidChangeTreeData.fire();

    const hasSession = await this.credentials.hasSession();
    if (!hasSession) {
      this.cachedItems = [];
      this.status = 'auth';
      this.lastError = undefined;
      this._onDidChangeTreeData.fire();
      return;
    }

    try {
      if (!this.cachedItems.length) {
        const cached = this.mapStoredWorkspaces(this.memento.get('apistudio.cachedWorkspaces'));
        if (cached.length) {
          this.cachedItems = cached;
        }
      }
      const workspaces = await this.api.listWorkspaces();
      this.cachedItems = workspaces;
      this.status = workspaces.length ? 'ready' : 'empty';
      this.lastError = undefined;
      await this.memento.update('apistudio.cachedWorkspaces', workspaces);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'AUTHENTICATION_REQUIRED') {
        this.status = 'auth';
        this.cachedItems = [];
        this.lastError = undefined;
      } else {
        this.status = this.cachedItems.length ? 'ready' : 'error';
        this.lastError = error instanceof Error ? error.message : 'Unable to load workspaces.';
        if (!this.cachedItems.length) {
          const stored = this.mapStoredWorkspaces(this.memento.get('apistudio.cachedWorkspaces'));
          if (stored.length) {
            this.cachedItems = stored;
            this.status = 'ready';
          }
        }
      }
    }

    this._onDidChangeTreeData.fire();
  }

  private mapStoredWorkspaces(value: unknown): ApiWorkspace[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const mapped = value
      .map((item): ApiWorkspace | undefined => {
        if (!item || typeof item !== 'object') {
          return undefined;
        }
        const record = item as Partial<ApiWorkspace> & { label?: string };
        const id = typeof record.id === 'string' ? record.id : undefined;
        const name =
          typeof record.name === 'string'
            ? record.name
            : typeof record.label === 'string'
            ? record.label
            : undefined;
        if (!id || !name) {
          return undefined;
        }
        const out: ApiWorkspace = {
          id,
          name,
          slug: typeof record.slug === 'string' ? record.slug : undefined,
          plan: typeof record.plan === 'string' ? record.plan : undefined,
          role: typeof record.role === 'string' ? record.role : undefined,
        };
        return out;
      });

    return mapped.filter((entry): entry is ApiWorkspace => entry !== undefined);
  }

  getTreeItem(element: WorkspaceTreeNode): vscode.TreeItem {
    if (element.kind === 'workspace') {
      const item = new vscode.TreeItem(element.workspace.name, vscode.TreeItemCollapsibleState.None);
      const plan = element.workspace.plan ? element.workspace.plan.toString() : undefined;
      const role = element.workspace.role ? element.workspace.role.toString() : undefined;
      item.description = [plan, role].filter(Boolean).join(' · ') || undefined;
      item.command = {
        command: 'apistudio.workspaces.openItem',
        title: 'Open in Studio',
        arguments: [element.workspace.id],
      };
      item.iconPath = new vscode.ThemeIcon('folder-library');
      item.contextValue = 'workspaceItem';
      item.tooltip = element.workspace.slug
        ? `${element.workspace.name}\nSlug · ${element.workspace.slug}`
        : element.workspace.name;
      return item;
    }

    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.description = element.description;
    item.iconPath = new vscode.ThemeIcon('info');
    item.command = element.command;
    item.tooltip = element.tooltip;
    item.contextValue = 'message';
    return item;
  }

  async getChildren(): Promise<WorkspaceTreeNode[]> {
    if (this.status === 'auth') {
      return [
        {
          kind: 'message',
          label: `Connect to ${brand.productName}`,
          description: 'Provide an API token to load your workspaces.',
          command: {
            command: 'apistudio.configureCredentials',
            title: 'Configure credentials',
          },
        },
      ];
    }

    if (this.status === 'error' && this.lastError) {
      return [
        {
          kind: 'message',
          label: 'Unable to load workspaces',
          description: 'Select to retry.',
          tooltip: this.lastError,
          command: {
            command: 'apistudio.refreshWorkspaces',
            title: 'Retry loading workspaces',
          },
        },
      ];
    }

    if (!this.cachedItems.length) {
      if (this.status === 'loading') {
        return [
          {
            kind: 'message',
            label: 'Loading workspaces…',
          },
        ];
      }
      if (this.status === 'empty') {
        return [
          {
            kind: 'message',
            label: 'No workspaces found',
            description: 'Create a workspace from the Studio web app.',
            command: {
              command: 'apistudio.openStudio',
              title: 'Open Studio',
            },
          },
        ];
      }
    }

    return this.cachedItems.map((workspace) => ({ kind: 'workspace', workspace }));
  }
}
