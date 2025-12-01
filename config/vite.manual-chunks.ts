type ManualChunkFn = (id: string) => string | undefined;

const CHUNK_PATTERNS: Array<{ name: string; match: (id: string) => boolean }> = [
  {
    name: 'vendor-react',
    match: (id) =>
      /node_modules\/(react(-dom)?|scheduler|history|@remix-run|react-router)/.test(id)
  },
  {
    name: 'vendor-radix',
    match: (id) => /node_modules\/@radix-ui\//.test(id) || /node_modules\/@floating-ui\//.test(id)
  },
  {
    name: 'vendor-query',
    match: (id) => /node_modules\/@tanstack\//.test(id)
  },
  {
    name: 'vendor-automerge',
    match: (id) => /node_modules\/@automerge\/automerge/.test(id)
  },
  {
    name: 'vendor-request-runner',
    match: (id) =>
      id.includes('/libs/@sdl/request-runner/') ||
      /node_modules\/@sdl\/request-runner/.test(id)
  },
  {
    name: 'vendor-zustand',
    match: (id) => /node_modules\/zustand/.test(id)
  },
  {
    name: 'vendor-charting',
    match: (id) => /node_modules\/(d3|chart\.js)/.test(id)
  }
];

export function createManualChunks(): ManualChunkFn {
  return (id) => {
    if (!id.includes('node_modules') && !id.includes('/libs/@sdl/request-runner/')) {
      return undefined;
    }
    const found = CHUNK_PATTERNS.find((pattern) => pattern.match(id));
    if (found) {
      return found.name;
    }
    if (id.includes('node_modules')) {
      return 'vendor';
    }
    return undefined;
  };
}
