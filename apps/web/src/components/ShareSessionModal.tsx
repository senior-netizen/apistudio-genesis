import { useState } from 'react';

export interface ShareSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl?: string;
}

export function ShareSessionModal({ isOpen, onClose, shareUrl }: ShareSessionModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="share-session-modal" role="dialog" aria-modal="true">
      <div className="share-session-modal__content">
        <h2>Invite collaborators</h2>
        <p>Share this secure link with your teammates to join the live API session.</p>
        <div className="share-session-modal__field">
          <input type="text" readOnly value={shareUrl ?? 'Generating...'} />
          <button type="button" onClick={handleCopy} disabled={!shareUrl}>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
        <button type="button" onClick={onClose} className="share-session-modal__close">
          Close
        </button>
      </div>
    </div>
  );
}

export default ShareSessionModal;
