import { encode, decode } from 'base64-arraybuffer';
import type { ChangeEnvelope, SnapshotEnvelope } from './types';

export interface EncodedChangeBatch {
  changes: ChangeEnvelope[];
  cursor?: number;
}

export interface EncodedSnapshot extends Omit<SnapshotEnvelope, 'payloadCompressed'> {
  payloadCompressed: string;
}

export function encodeSnapshot(snapshot: SnapshotEnvelope): EncodedSnapshot {
  return {
    ...snapshot,
    payloadCompressed: encode(new Uint8Array(snapshot.payloadCompressed).buffer),
  };
}

export function decodeSnapshot(snapshot: EncodedSnapshot): SnapshotEnvelope {
  return {
    ...snapshot,
    payloadCompressed: new Uint8Array(decode(snapshot.payloadCompressed)),
  };
}

export function serializeChanges(changes: ChangeEnvelope[]): string {
  return JSON.stringify(changes);
}

export function deserializeChanges(serialized: string): ChangeEnvelope[] {
  if (!serialized) {
    return [];
  }
  try {
    const parsed = JSON.parse(serialized);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (error) {
    throw new Error(`Failed to deserialize change batch: ${(error as Error).message}`);
  }
}
