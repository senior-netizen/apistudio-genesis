import * as vscode from 'vscode';
import { brand } from '@sdl/language';
import { StudioPanel } from './panels/StudioPanel';
import { WorkspaceTreeProvider } from './providers/WorkspaceTreeProvider';
import { ApiClient } from './utils/apiClient';
import { CredentialsManager } from './utils/credentialsManager';

let workspaceProvider: WorkspaceTreeProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
  const credentials = new CredentialsManager(context);
  const apiClient = new ApiClient(credentials);

  workspaceProvider = new WorkspaceTreeProvider(context.globalState, apiClient, credentials);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      WorkspaceTreeProvider.viewId,
      workspaceProvider,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('apistudio.openStudio', (workspaceId?: string) => {
      StudioPanel.createOrShow(context.extensionUri, apiClient, workspaceId);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('apistudio.refreshWorkspaces', async () => {
      await workspaceProvider?.refresh();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('apistudio.workspaces.openItem', (itemId: string) => {
      StudioPanel.createOrShow(context.extensionUri, apiClient, itemId);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('apistudio.configureCredentials', async () => {
      const configuration = vscode.workspace.getConfiguration('apistudio');
      const existingBase = configuration.get<string>('apiBaseUrl') ?? 'http://localhost:8081';
      const baseUrlInput = await vscode.window.showInputBox({
        title: brand.productName,
        prompt: 'Enter the API base URL',
        value: existingBase,
        ignoreFocusOut: true,
        placeHolder: 'http://localhost:8081',
      });

      if (baseUrlInput) {
        await configuration.update('apiBaseUrl', baseUrlInput.trim(), vscode.ConfigurationTarget.Global);
      }

      const email = await vscode.window.showInputBox({
        title: brand.productName,
        prompt: 'Enter your account email',
        ignoreFocusOut: true,
        placeHolder: 'name@example.com',
      });
      if (!email || !email.trim()) {
        await vscode.window.showWarningMessage('No email provided. Credentials were not updated.');
        return;
      }

      const password = await vscode.window.showInputBox({
        title: brand.productName,
        prompt: 'Enter your password',
        password: true,
        ignoreFocusOut: true,
      });
      if (!password) {
        await vscode.window.showWarningMessage('No password provided. Credentials were not updated.');
        return;
      }

      const totpCode = await vscode.window.showInputBox({
        title: brand.productName,
        prompt: 'Enter your 2FA code (leave blank if not enabled)',
        ignoreFocusOut: true,
        password: true,
        placeHolder: '123456',
      });

      const effectiveBase = apiClient.getResolvedBaseUrl();

      try {
        await credentials.login(effectiveBase, email.trim(), password, totpCode ?? undefined);
        await vscode.window.showInformationMessage(`${brand.productName} credentials saved.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Authentication failed.';
        await vscode.window.showErrorMessage(message);
        return;
      }

      await workspaceProvider?.refresh();
      await StudioPanel.reloadActive(apiClient);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('apistudio.signOut', async () => {
      await credentials.logout(apiClient.getResolvedBaseUrl());
      await vscode.window.showInformationMessage(`Signed out from ${brand.productName}.`);
      await workspaceProvider?.refresh();
      await StudioPanel.reloadActive(apiClient);
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      workspaceProvider?.refresh();
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('apistudio.apiBaseUrl')) {
        workspaceProvider?.refresh();
        StudioPanel.reloadActive(apiClient);
      }
    }),
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveColorTheme((theme) => {
      StudioPanel.updateTheme(theme.kind);
    }),
  );

  workspaceProvider.refresh();

  const disposeSessionListener = credentials.onSessionExpired(() => {
    void workspaceProvider?.refresh();
    void StudioPanel.reloadActive(apiClient);
  });
  context.subscriptions.push({ dispose: disposeSessionListener });

  if (vscode.window.activeColorTheme) {
    StudioPanel.updateTheme(vscode.window.activeColorTheme.kind);
  }
}

export function deactivate() {
  // Nothing to cleanup yet
}
