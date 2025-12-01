/**
 * @squirrel/vscode - Extension entry point bootstrapping commands and the API panel.
 */

import * as vscode from "vscode";
import { ApiPanel } from "./panels/ApiPanel";
import { SidebarProvider } from "./panels/SidebarProvider";
import { initializeStorage } from "./utils/storage";

class OutputTelemetry implements vscode.Disposable {
  private readonly channel: vscode.OutputChannel;

  constructor(name: string) {
    this.channel = vscode.window.createOutputChannel(name);
  }

  public track(eventName: string, properties?: Record<string, string | number | boolean | undefined>): void {
    const timestamp = new Date().toISOString();
    const payload = properties ? JSON.stringify(properties) : "{}";
    this.channel.appendLine(`[${timestamp}] ${eventName} ${payload}`);
  }

  public dispose() {
    this.channel.dispose();
  }
}

export async function activate(context: vscode.ExtensionContext) {
  const telemetry = new OutputTelemetry("Squirrel API Studio");
  initializeStorage(context);
  ApiPanel.register(context.extensionUri, telemetry);
  const sidebarProvider = new SidebarProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider)
  );

  const openStudio = vscode.commands.registerCommand("squirrel.openStudio", async () => {
    const editor = vscode.window.activeTextEditor;
    const selection = editor?.document.getText(editor.selection);
    ApiPanel.render(context, selection);
  });

  context.subscriptions.push(openStudio, telemetry);
}

export function deactivate() {
  // Nothing to dispose manually; everything is registered in the context subscriptions.
}
