# Squirrel API Studio VS Code Extension

A focused VS Code companion for Squirrel API Studio that mirrors the Apple-inspired aesthetic from the web experience while connecting directly to your live workspaces. It introduces a polished Activity Bar entry with a Workspaces tree and an immersive Studio panel rendered via a custom webview.

## Features

- **Workspaces view** â€“ lists real workspaces from the Squirrel API platform using your personal access token with automatic caching.
- **Studio panel** â€“ a high-contrast dashboard that streams analytics, projects, environments, and request history for the selected workspace.
- **Request tooling** â€“ trigger runs for saved API requests, inspect their metadata, and review the latest execution timeline without leaving VS Code.
- **Command integration** â€“ quick entry points for opening the studio, refreshing workspaces, configuring credentials, and signing out.
- **Responsive + accessible UI** â€“ typography, focus affordances, and reduced motion support designed for clarity.

## Authentication & configuration

1. Run **`Squirrel API Studio: Configure Credentials`** from the Command Palette.
2. Provide the API base URL (defaults to `http://localhost:8081`).
3. Paste a valid personal access token â€” it is stored securely in VS Code secret storage.
4. Optional: adjust the `apistudio.studioBaseUrl` setting if you want the web workspace link to point at another environment.

Use **`Squirrel API Studio: Sign Out`** at any time to revoke the token from the extension host.

## Development

```bash
yarn install
yarn workspace apistudio-vscode watch
```

Then press `F5` inside VS Code to launch the extension host for iterative development.

To produce a `.vsix` package:

```bash
yarn workspace apistudio-vscode build
yarn workspace apistudio-vscode package
```
