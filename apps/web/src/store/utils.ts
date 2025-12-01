import { ulid } from 'ulidx';
import type { ApiRequest } from '../types/api';

export function createEmptyRequest(): ApiRequest {
  return {
    id: ulid(),
    name: '',
    method: 'GET',
    url: '',
    description: '',
    body: { mode: 'none' },
    headers: [],
    params: [],
    auth: { type: 'none' },
    scripts: { preRequest: '', test: '' },
    tags: [],
    examples: []
  };
}

export function createId() {
  return ulid();
}
