import { useSyncExternalStore } from 'react';

type Listener = () => void;
type EqualityFn<T> = (a: T, b: T) => boolean;

export interface StoreApi<TState> {
  setState: (partial: Partial<TState> | TState | ((state: TState) => Partial<TState> | TState | void), replace?: boolean) => void;
  getState: () => TState;
  // Overload: subscribe(listener) or subscribe(selector, listener, equality?)
  subscribe: {
    (listener: Listener): () => void;
    <TSlice>(selector: (state: TState) => TSlice, listener: (slice: TSlice, prevSlice: TSlice) => void, equalityFn?: EqualityFn<TSlice>): () => void;
  };
}

export type StateCreator<TState, _Mutators = [], _Slices = [], TSlice = TState> = (
  set: StoreApi<TState>['setState'],
  get: StoreApi<TState>['getState'],
  api: StoreApi<TState>
) => TSlice;

export type UseStore<TState> = {
  (): TState;
  <TSlice>(selector: (state: TState) => TSlice): TSlice;
} & StoreApi<TState>;

export function create<TState>(initializer: StateCreator<TState>): UseStore<TState> {
  let state: TState;
  const listeners = new Set<Listener>();
  type SelectorSub<TSlice> = {
    selector: (s: TState) => TSlice;
    listener: (slice: TSlice, prev: TSlice) => void;
    equalityFn: EqualityFn<TSlice>;
    currentSlice: TSlice;
  };
  const selectorSubs: Array<SelectorSub<any>> = [];

  function notify() {
    // Notify raw listeners first
    listeners.forEach((l) => l());
    // Then notify selector subscribers if their slice changed
    for (const sub of selectorSubs) {
      const next = sub.selector(state);
      if (!sub.equalityFn(next, sub.currentSlice)) {
        const prev = sub.currentSlice;
        sub.currentSlice = next;
        sub.listener(next, prev);
      }
    }
  }

  const api: StoreApi<TState> = {
    setState(partial, replace = false) {
      const nextState = typeof partial === 'function' ? (partial as (state: TState) => Partial<TState> | TState)(state) : partial;
      state = replace ? (nextState as TState) : { ...state, ...(nextState as Partial<TState>) };
      notify();
    },
    getState() {
      return state;
    },
    subscribe(listenerOrSelector: any, maybeListener?: any, maybeEquality?: any) {
      // Selector subscription form
      if (typeof maybeListener === 'function') {
        const selector = listenerOrSelector as (s: TState) => unknown;
        const fn = maybeListener as (slice: unknown, prevSlice: unknown) => void;
        const equality = (maybeEquality as EqualityFn<unknown>) ?? ((a, b) => Object.is(a, b));
        const sub: SelectorSub<unknown> = {
          selector,
          listener: fn,
          equalityFn: equality,
          currentSlice: selector(state)
        };
        selectorSubs.push(sub);
        return () => {
          const idx = selectorSubs.indexOf(sub);
          if (idx >= 0) selectorSubs.splice(idx, 1);
        };
      }
      // Raw listener form
      const listener = listenerOrSelector as Listener;
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  } as StoreApi<TState>;

  state = initializer(api.setState, api.getState, api);

  const subscribe = api.subscribe.bind(api) as (listener: Listener) => () => void;

  function useStore(): TState;
  function useStore<TSlice>(selector: (state: TState) => TSlice): TSlice;
  function useStore<TSlice>(selector?: (state: TState) => TSlice) {
    const snapshot = useSyncExternalStore(subscribe, () => state, () => state);
    if (selector) {
      return selector(snapshot);
    }
    return snapshot;
  }

  const typedUseStore = useStore as UseStore<TState>;

  typedUseStore.setState = api.setState;
  typedUseStore.getState = api.getState;
  typedUseStore.subscribe = api.subscribe;

  return typedUseStore;
}
