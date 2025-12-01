import type { StateCreator } from '../index';

export function subscribeWithSelector<TState, TSlice>(initializer: StateCreator<TState>): StateCreator<TState> {
  return initializer;
}
