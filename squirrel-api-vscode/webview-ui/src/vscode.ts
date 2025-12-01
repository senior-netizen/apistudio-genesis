/**
 * Typed helper around the VS Code webview messaging API.
 */

declare function acquireVsCodeApi<TState = unknown>(): {
  postMessage: (message: unknown) => void;
  getState: () => TState | undefined;
  setState: (data: TState) => void;
};

const vscode = acquireVsCodeApi();

export default vscode;
