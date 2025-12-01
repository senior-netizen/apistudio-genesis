export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author: string;
  entry: string;
  capabilities?: string[];
}

export function createManifest(manifest: PluginManifest) {
  if (!manifest.name) {
    throw new Error('Plugin manifest requires a name');
  }
  if (!manifest.entry) {
    throw new Error('Plugin manifest requires an entry point');
  }
  return manifest;
}
