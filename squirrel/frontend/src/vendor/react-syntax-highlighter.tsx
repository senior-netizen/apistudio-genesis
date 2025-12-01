import type { ReactNode } from 'react';

interface SyntaxHighlighterProps {
  language?: string;
  style?: Record<string, unknown>;
  children: string;
  customStyle?: Record<string, unknown>;
}

export function LightAsync({ children, customStyle }: SyntaxHighlighterProps) {
  return (
    <pre style={{ margin: 0, background: 'transparent', ...(customStyle ?? {}) }}>
      <code>{children}</code>
    </pre>
  );
}
