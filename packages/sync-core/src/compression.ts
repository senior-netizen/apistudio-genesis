import { deflate, inflate } from 'pako';

export function compress(data: Uint8Array): Uint8Array {
  return deflate(data, { level: 6 });
}

export function decompress(data: Uint8Array): Uint8Array {
  return inflate(data);
}

export function compressJson(value: unknown): Uint8Array {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  return compress(encoded);
}

export function decompressJson<T>(data: Uint8Array): T {
  const decoded = new TextDecoder().decode(decompress(data));
  return JSON.parse(decoded) as T;
}
