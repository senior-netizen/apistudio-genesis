export interface DiffViewerProps {
  added?: string[];
  removed?: string[];
  changed?: string[];
  synopsis?: string;
}

export function DiffViewer({ added = [], removed = [], changed = [], synopsis }: DiffViewerProps) {
  return (
    <section className="diff-viewer">
      <header className="diff-viewer__header">
        <h3>API Diff Summary</h3>
        {synopsis && <p className="diff-viewer__synopsis">{synopsis}</p>}
      </header>
      <div className="diff-viewer__columns">
        <DiffColumn title="Added" tone="positive" entries={added} emptyLabel="No new endpoints" />
        <DiffColumn title="Removed" tone="negative" entries={removed} emptyLabel="Nothing removed" />
        <DiffColumn title="Changed" tone="neutral" entries={changed} emptyLabel="No updates" />
      </div>
    </section>
  );
}

interface DiffColumnProps {
  title: string;
  tone: 'positive' | 'negative' | 'neutral';
  entries: string[];
  emptyLabel: string;
}

function DiffColumn({ title, tone, entries, emptyLabel }: DiffColumnProps) {
  return (
    <article className={`diff-viewer__column diff-viewer__column--${tone}`}>
      <h4>{title}</h4>
      <ul>
        {entries.length === 0 && <li className="diff-viewer__empty">{emptyLabel}</li>}
        {entries.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
    </article>
  );
}

export default DiffViewer;
