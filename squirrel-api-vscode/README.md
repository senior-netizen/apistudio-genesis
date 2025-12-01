# Squirrel API Studio for VS Code

Squirrel API Studio brings the full Squirrel API experience into Visual Studio Code. Craft HTTP requests, manage environments, inspect responses, and experiment with WebSockets without leaving your editor.

## Features

- 🍃 **React-powered studio** with glassmorphism design, TailwindCSS styling, and Framer Motion transitions.
- 🗂️ **Projects & collections** manager to organise folders, requests, and inline tests—fully persisted in global state.
- 🚀 **Request builder** supporting all major HTTP verbs, environment-aware headers, secure auth profiles, and code snippet generation (cURL, Axios, Fetch).
- 📦 **Environment + auth managers** backed by VS Code SecretStorage with variable interpolation, PKCE-ready OAuth2, API key, basic, and bearer flows.
- 📜 **History timeline** with favourites, export/import, replay, and analytics (success rate, latency, favourites).
- 🧾 **Response viewer** featuring Raw / JSON / Headers tabs, size metrics, and copy-to-clipboard helpers.
- 🧪 **Test runner** powered by a mini harness (`test`/`expect`) executing in the extension host with captured assertions.
- 🌐 **GraphQL playground** and **WebSocket client** for realtime experimentation.
- 🧠 **Squirrel AI assistant stub** ready for cloud integration with actionable prompts.
- 📚 **Docs generator** producing Markdown/HTML bundles from collections.
- 📊 **Analytics dashboard** visualising recent latency and success/failure breakdowns via Recharts.
- 🧭 **Activity bar control center** to launch the studio instantly.

## Project structure

```
squirrel-api-vscode/
├─ src/                     # Extension backend (TypeScript)
│  ├─ extension.ts          # Activation entry point
│  ├─ panels/
│  │   ├─ ApiPanel.ts       # Webview panel orchestration
│  │   └─ SidebarProvider.ts# Activity bar webview view provider
│  ├─ services/
│  │   ├─ requestManager.ts # Axios + GraphQL client utilities
│  │   ├─ environmentManager.ts # Variable interpolation + persistence
│  │   ├─ authManager.ts    # Secure auth credential orchestration
│  │   ├─ historyManager.ts # History analytics, favourites, import/export
│  │   └─ projectManager.ts # Collection CRUD + documentation generator
│  ├─ ai/
│  │   └─ squirrelAI.ts     # Offline AI assistant stub
│  ├─ utils/
│  │   └─ storage.ts        # Global state + secret helpers
│  └─ types/api.ts          # Shared backend message types
├─ webview-ui/              # React + Vite front-end powering the studio
│  ├─ src/App.tsx           # Root component wiring all panels together
│  ├─ src/components/       # UI components (projects, builder, history, analytics, etc.)
│  ├─ vite.config.ts        # Vite build manifest for the extension to consume
│  └─ package.json          # Webview UI dependencies
├─ package.json             # VS Code extension manifest & scripts
├─ tsconfig.json            # TypeScript config for extension code
└─ README.md                # This file
```

## Development workflow

1. **Install dependencies**
   ```bash
   cd squirrel-api-vscode
   npm install
   cd webview-ui
   npm install
   ```

2. **Run the webview in watch mode** (optional but ideal for quick UI tweaks):
   ```bash
   npm run dev:webview
   ```

3. **Compile the extension**:
   ```bash
   npm run watch
   ```

4. **Launch the extension**:
   - Open the `squirrel-api-vscode` folder in VS Code.
   - Press `F5` to start the Extension Development Host.
   - Use the **Squirrel Control Center** view in the activity bar or run the `Squirrel API Studio: Open` command.

## Building for distribution

```bash
npm run build:webview   # Bundle the React UI (uses Vite manifest)
npm run compile         # Transpile extension TypeScript
npm run package         # Produce a VSIX via vsce
```

## Security considerations

- Environment variables are split between global metadata (Memento) and secrets (VS Code `SecretStorage`).
- All network requests execute within the extension host via Axios, keeping credentials out of the webview sandbox.
- CSP rules for the webview restrict scripts to the compiled bundle and limit network access to HTTPS/WSS origins for features such as the WebSocket tester.

## Cloud sync preview (optional)

- The extension ships with dormant helpers for Squirrel Cloud synchronization in `src/services/cloudSync.ts`.
- To opt in once endpoints are available, uncomment the hooks in `src/panels/ApiPanel.ts` and provide the following settings in VS Code:
  - `@squirrel.vscode.cloudSync.enable` → `true`
  - `@squirrel.vscode.cloudSync.endpoint` → Cloud API base URL
  - `@squirrel.vscode.cloudSync.token` → Personal or workspace access token
  - `@squirrel.vscode.cloudSync.workspaceId` → (Optional) target workspace identifier
- When enabled, project collections and analytics snapshots can be pushed securely to the configured workspace.

## Telemetry

A lightweight output channel logs request success and failure events. No data leaves your machine—this channel is intended for observability and future integration with Squirrel Cloud telemetry.

## License

Released under the MIT License. See `LICENSE` (add your preferred license terms here).
