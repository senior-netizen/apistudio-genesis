import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  JSON_SCHEMA_VERSION,
  printJsonSuccess,
  printJsonError,
  maybePrintJsonSuccess,
  maybePrintJsonError,
} from './output';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('json output envelopes', () => {
  it('prints success envelope with schemaVersion', () => {
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    printJsonSuccess({ workspaceId: 'ws_1' });
    expect(write).toHaveBeenCalledOnce();
    const output = String(write.mock.calls[0][0]);
    const parsed = JSON.parse(output);
    expect(parsed.schemaVersion).toBe(JSON_SCHEMA_VERSION);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.workspaceId).toBe('ws_1');
  });

  it('prints error envelope with code/message', () => {
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    printJsonError('workspace_required', 'No workspace specified.');
    const output = String(write.mock.calls[0][0]);
    const parsed = JSON.parse(output);
    expect(parsed.schemaVersion).toBe(JSON_SCHEMA_VERSION);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('workspace_required');
  });

  it('guards printing when disabled', () => {
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    expect(maybePrintJsonSuccess(false, { ok: 1 })).toBe(false);
    expect(maybePrintJsonError(false, 'x', 'y')).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });
});
