export * from './types';
export * from './manifest';
export * from './auth';
export * from './security/csrf';

export class PluginHost {
  private readonly registered: Map<string, unknown> = new Map();

  register(name: string, plugin: unknown) {
    if (this.registered.has(name)) {
      throw new Error(`Plugin ${name} already registered`);
    }
    this.registered.set(name, plugin);
  }

  list() {
    return Array.from(this.registered.keys());
  }
}
