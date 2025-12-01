import { describe, expect, it } from 'vitest';
import { getNonce } from './getNonce';

describe('getNonce', () => {
  it('produces a 32 character token', () => {
    const nonce = getNonce();
    expect(nonce).toHaveLength(32);
  });

  it('is reasonably random between invocations', () => {
    const first = getNonce();
    const second = getNonce();
    expect(first).not.toEqual(second);
  });
});
