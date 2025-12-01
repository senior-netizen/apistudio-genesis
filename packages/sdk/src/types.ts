export interface PluginContext {
  workspaceId: string;
  userId: string;
  settings: Record<string, unknown>;
}

export interface PluginDefinition {
  name: string;
  version: string;
  author: string;
  setup: (context: PluginContext) => Promise<void> | void;
}

export interface GatewayAdapter {
  id: string;
  displayName: string;
  execute: (payload: Record<string, unknown>) => Promise<unknown>;
}

export interface AIModelAdapter {
  id: string;
  provider: string;
  generate: (prompt: string, options?: Record<string, unknown>) => Promise<string>;
}
