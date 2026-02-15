declare module 'ws' {
  export type RawData = string | Buffer | ArrayBuffer | Buffer[];
  export default class WebSocket {
    static readonly OPEN: number;
    constructor(url: string, protocols?: string | string[], options?: Record<string, unknown>);
    readyState: number;
    on(event: 'open' | 'close', listener: () => void): this;
    on(event: 'message', listener: (data: RawData) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    send(data: string): void;
    terminate(): void;
    close(): void;
  }
}
