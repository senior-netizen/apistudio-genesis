declare module '@sdl/sync-core' {
  export class PresenceTracker {
    observe: (event: any) => void;
    list: () => any;
  }
  export type SyncPresenceEvent = any;
}
