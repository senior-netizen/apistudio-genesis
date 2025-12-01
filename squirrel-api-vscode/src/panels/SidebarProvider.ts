/**
 * @squirrel/vscode - Activity bar webview view that exposes quick controls for Squirrel API Studio.
 */

import * as vscode from "vscode";

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "@squirrel/vscode/sidebar";

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message?.type === "openStudio") {
        await vscode.commands.executeCommand("squirrel.openStudio");
      }
    });
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    return `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Squirrel Studio</title>
          <style nonce="${nonce}">
            body {
              font-family: 'SF Pro Display', 'Inter', system-ui, sans-serif;
              background: linear-gradient(180deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95));
              color: #f8fafc;
              padding: 16px;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            button {
              border: none;
              border-radius: 16px;
              padding: 12px 16px;
              background: linear-gradient(120deg, #38bdf8, #6366f1);
              color: white;
              font-weight: 600;
              cursor: pointer;
              box-shadow: 0 12px 30px rgba(99, 102, 241, 0.25);
            }
            button:hover {
              filter: brightness(1.05);
            }
            .card {
              background: rgba(15, 23, 42, 0.6);
              border-radius: 20px;
              padding: 16px;
              border: 1px solid rgba(148, 163, 184, 0.2);
            }
            .badge {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              font-size: 11px;
              padding: 4px 10px;
              border-radius: 999px;
              background: rgba(20, 184, 166, 0.2);
              color: #5eead4;
              text-transform: uppercase;
              letter-spacing: 0.08em;
            }
          </style>
        </head>
        <body>
          <div class="badge">Studio Ready</div>
          <div class="card">
            <h2 style="margin:0 0 8px 0; font-size: 16px;">Squirrel API Studio</h2>
            <p style="margin:0; font-size: 13px; line-height: 1.5; opacity: 0.8;">
              Launch the immersive API studio, manage secure environments, and orchestrate requests without leaving VS Code.
            </p>
          </div>
          <button id="launch" type="button">Open Studio</button>
          <div class="card" style="font-size: 12px; opacity: 0.7;">
            Upcoming: synchronized history, collaborative sessions, and AI-powered flows via Squirrel Cloud.
          </div>
          <script nonce="${nonce}">
            const vscode = acquireVsCodeApi();
            document.getElementById('launch')?.addEventListener('click', () => {
              vscode.postMessage({ type: 'openStudio' });
            });
          </script>
        </body>
      </html>`;
  }
}

const getNonce = () => {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};
