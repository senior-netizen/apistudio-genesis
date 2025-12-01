import { useMemo, useState } from 'react';
import { Button } from '@sdl/ui';

type Comment = {
  id: string;
  user: string;
  message: string;
  createdAt: string;
};

export interface CommentSidebarProps {
  comments?: Comment[];
  onSubmit?: (message: string) => void;
}

export function CommentSidebar({ comments = [], onSubmit }: CommentSidebarProps) {
  const [message, setMessage] = useState('');

  const countLabel = useMemo(() => `${comments.length} ${comments.length === 1 ? 'note' : 'notes'}`, [comments.length]);

  function initials(name: string) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
    return (first + last).toUpperCase() || 'U';
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) {
      return;
    }
    onSubmit?.(message);
    setMessage('');
  };

  return (
    <aside className="sticky top-6 h-fit rounded-xl border border-border/60 bg-background/80 p-6">
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Comments</h3>
        <span className="text-xs text-muted">{countLabel}</span>
      </header>
      <ul className="mt-4 max-h-[75vh] space-y-3 overflow-y-auto pr-1">
        {comments.map((comment) => (
          <li key={comment.id} className="rounded-lg border border-border/40 bg-muted/10 p-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent ">
                <span className="text-xs font-semibold">{initials(comment.user)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <strong className="truncate text-sm font-medium text-foreground">{comment.user}</strong>
                  <time
                    dateTime={comment.createdAt}
                    className="ml-auto text-xs text-muted"
                    title={new Date(comment.createdAt).toLocaleString()}
                  >
                    {new Date(comment.createdAt).toLocaleString()}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-foreground">{comment.message}</p>
              </div>
            </div>
          </li>
        ))}
        {comments.length === 0 && (
          <li className="rounded-lg border border-border/40 bg-muted/10 p-6 text-center text-sm text-muted">
            No comments yet. Start the conversation!
          </li>
        )}
      </ul>
      <form className="mt-4 space-y-2" onSubmit={handleSubmit}>
        <label className="block text-xs uppercase tracking-[0.2em] text-muted">Add a comment</label>
        <textarea
          className="w-full min-h-[96px] resize-y rounded-md border border-border/60 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          placeholder="Share feedback or mention a teammate with @handle"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <div className="flex items-center justify-end">
          <Button type="submit" size="sm" variant="primary" disabled={!message.trim()}>
            Send
          </Button>
        </div>
      </form>
    </aside>
  );
}

export default CommentSidebar;
