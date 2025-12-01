import { useState } from 'react';

export interface SmartDocsProps {
  onGenerate?: () => void;
}

/**
 * SmartDocs renders a button to trigger documentation generation and displays
 * a placeholder preview of the AI output. Wiring the real backend response is
 * as simple as replacing the state management with data fetching hooks.
 */
export function SmartDocs({ onGenerate }: SmartDocsProps) {
  const [content, setContent] = useState<string>('');

  const handleGenerate = () => {
    onGenerate?.();
    setContent('### Example Endpoint\nGET /api/example\n\nReturns the list of admin users created after 2024-01-01.');
  };

  return (
    <section className="smart-docs">
      <button type="button" onClick={handleGenerate}>
        Generate Docs
      </button>
      {content && <pre className="smart-docs__preview">{content}</pre>}
    </section>
  );
}

export default SmartDocs;
