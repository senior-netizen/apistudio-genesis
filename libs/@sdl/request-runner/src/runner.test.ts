import { describe, expect, it, vi } from 'vitest';
import { RequestRunner } from './runner';

const noopStorage = {
  load: vi.fn(() => [] as never[]),
  save: vi.fn()
};

describe('RequestRunner', () => {
  it('executes a request and records history', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    );

    const runner = new RequestRunner({ fetchImplementation: fetchMock, historyStorage: noopStorage });

    const result = await runner.run({
      method: 'GET',
      url: 'https://example.com',
      headers: [],
      params: []
    });

    expect(result.response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const history = await runner.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].url).toBe('https://example.com');
  });

  it('emits progress events while streaming', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('hello '));
        controller.enqueue(encoder.encode('world'));
        controller.close();
      }
    });

    const fetchMock = vi.fn(async () =>
      new Response(stream, {
        status: 200,
        headers: { 'content-type': 'text/plain', 'content-length': '11' }
      })
    );

    const runner = new RequestRunner({ fetchImplementation: fetchMock, historyStorage: noopStorage });

    const handler = vi.fn();
    runner.on('request:progress', handler);

    const outcome = await runner.run({ method: 'GET', url: 'https://example.com/stream' });

    expect(outcome.response.body).toBe('hello world');
    expect(handler).toHaveBeenCalled();
    const [firstCall] = handler.mock.calls;
    expect(firstCall?.[0].totalBytes).toBe(11);
  });

  it('retries failed requests', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(
        new Response('ok', {
          status: 200,
          headers: { 'content-type': 'text/plain' }
        })
      );

    const runner = new RequestRunner({ fetchImplementation: fetchMock, historyStorage: noopStorage });

    const success = await runner.run({ method: 'GET', url: 'https://retry.test' }, { retries: 1 });

    expect(success.response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
