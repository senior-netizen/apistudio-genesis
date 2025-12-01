import { useState } from 'react';

export interface AIRequestComposerProps {
  onCompose?: (prompt: string) => void;
}

/**
 * AIRequestComposer renders a text area that lets the user describe intent in
 * natural language. For the scaffold we fire the optional callback and display
 * a synthesized response preview so the consuming screens can be wired without
 * waiting for the production AI backend to land.
 */
export function AIRequestComposer({ onCompose }: AIRequestComposerProps) {
  const [prompt, setPrompt] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!prompt.trim()) {
      return;
    }
    onCompose?.(prompt);
    setPreview(
      `Suggested endpoint: GET /api/example\nHeaders: Authorization: Bearer <token>\nParameters: createdAfter=2024-01-01\nPrompt: ${prompt}`,
    );
  };

  return (
    <div className="ai-request-composer">
      <label className="ai-request-composer__label" htmlFor="ai-request-composer-input">
        Describe your API goal
      </label>
      <textarea
        id="ai-request-composer-input"
        className="ai-request-composer__input"
        placeholder="e.g. Get all users with admin role created after Jan 2024"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
      />
      <div className="ai-request-composer__actions">
        <button type="button" onClick={handleSubmit}>
          Compose with AI
        </button>
      </div>
      {preview && (
        <pre className="ai-request-composer__preview" aria-live="polite">
          {preview}
        </pre>
      )}
    </div>
  );
}

export default AIRequestComposer;
