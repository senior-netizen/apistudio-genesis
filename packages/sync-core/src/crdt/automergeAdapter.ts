import * as Automerge from '@automerge/automerge';

export interface AutomergeInitialization<T extends Record<string, unknown>> {
  docId: string;
  initialValue: T;
}

export interface AutomergeChange {
  docId: string;
  binary: Uint8Array;
  actor?: string;
  message?: string;
  time?: number;
}

export class AutomergeAdapter<T extends Record<string, unknown>> {
  private doc: Automerge.Doc<T>;

  constructor(initial: AutomergeInitialization<T>) {
    this.doc = Automerge.from<T>(initial.initialValue, { actor: initial.docId });
  }

  static fromBinary<T extends Record<string, unknown>>(docId: string, binary: Uint8Array) {
    const doc = Automerge.load<T>(binary, { actor: docId });
    const adapter = new AutomergeAdapter<T>({ docId, initialValue: {} as T });
    adapter.doc = doc;
    return adapter;
  }

  getDocument(): Automerge.Doc<T> {
    return this.doc;
  }

  fork(actorId: string): Automerge.Doc<T> {
    return Automerge.clone<T>(this.doc, { actor: actorId });
  }

  applyChanges(changes: AutomergeChange[]): void {
    if (changes.length === 0) {
      return;
    }
    const binaryChanges = changes.map((change) => change.binary);
    const [updatedDoc] = Automerge.applyChanges(this.doc, binaryChanges);
    this.doc = updatedDoc;
  }

  generateChanges(next: Automerge.Doc<T>): AutomergeChange[] {
    const binaryChanges = Automerge.getChanges(this.doc, next);
    return binaryChanges.map((binary) => ({
      docId: Automerge.getActorId(next),
      binary,
    }));
  }

  save(): Uint8Array {
    return Automerge.save(this.doc);
  }
}
