import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Automerge from '@automerge/automerge';
import { AutomergeAdapter } from '@sdl/sync-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_DIR = path.resolve(__dirname, '../../../docs/sync/cases');

function loadFixtures() {
  return fs
    .readdirSync(FIXTURE_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, file), 'utf8')));
}

function applyOperations(doc, operations) {
  let next = doc;
  for (const operation of operations ?? []) {
    if (operation.type !== 'set') continue;
    next = Automerge.change(next, `set:${operation.path.join('.')}`, (draft) => {
      let cursor = draft;
      for (let i = 0; i < operation.path.length - 1; i += 1) {
        const key = operation.path[i];
        if (cursor[key] == null) {
          cursor[key] = {};
        }
        cursor = cursor[key];
      }
      cursor[operation.path[operation.path.length - 1]] = operation.value;
    });
  }
  return next;
}

function mergeActorDocs(docs, baseline) {
  const server = AutomergeAdapter.fromBinary(toActorId('server'), baseline);
  for (const doc of docs) {
    const changes = server.generateChanges(doc);
    server.applyChanges(changes);
  }
  return server.getDocument();
}

function randomActorDoc(baseline, rng, index) {
  let doc = Automerge.load(baseline, { actor: toActorId(`actor-${index}`) });
  const ops = 4 + Math.floor(rng() * 4);
  for (let i = 0; i < ops; i += 1) {
    doc = Automerge.change(doc, `fuzz:${index}:${i}`, (draft) => {
      if (rng() > 0.5) {
        draft.request.name = `Req-${index}-${i}-${Math.floor(rng() * 500)}`;
      } else {
        const header = `x-header-${Math.floor(rng() * 5)}`;
        draft.request.headers[header] = `value-${Math.floor(rng() * 1000)}`;
      }
    });
  }
  return doc;
}

function createRng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

for (const fixture of loadFixtures()) {
  test(`replay fixture: ${fixture.name}`, () => {
    const base = new AutomergeAdapter({ docId: toActorId('server'), initialValue: fixture.initial ?? {} });
    const baseline = base.save();
    const docs = fixture.actors.map((actor) => {
      const doc = Automerge.load(baseline, { actor: toActorId(actor.actorId) });
      return applyOperations(doc, actor.operations);
    });
    const merged = mergeActorDocs(docs, baseline);
    assert.deepEqual(Automerge.toJS(merged), fixture.expectation ?? {});
  });
}

test('fuzz merges stay deterministic', () => {
  for (let seed = 1; seed <= 20; seed += 1) {
    const rng = createRng(seed);
    const initial = { request: { name: `Seed-${seed}`, description: '', headers: {} } };
    const base = new AutomergeAdapter({ docId: toActorId('server'), initialValue: initial });
    const baseline = base.save();
    const actors = Array.from({ length: 3 }).map((_, idx) => randomActorDoc(baseline, rng, idx));
    const forward = mergeActorDocs(actors, baseline);
    const reverse = mergeActorDocs([...actors].reverse(), baseline);
    assert.deepEqual(Automerge.toJS(forward), Automerge.toJS(reverse));
  }
});

function toActorId(label) {
  return Buffer.from(label).toString('hex');
}
