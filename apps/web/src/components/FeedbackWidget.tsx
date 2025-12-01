import { useState } from 'react';

export interface FeedbackWidgetProps {
  onSubmit?: (feedback: { rating: number; comment: string }) => void;
}

export function FeedbackWidget({ onSubmit }: FeedbackWidgetProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    onSubmit?.({ rating, comment });
    setSubmitted(true);
  };

  return (
    <div className="feedback-widget">
      <h3>Share your feedback</h3>
      <label>
        Rating
        <input type="number" min={1} max={5} value={rating} onChange={(event) => setRating(Number(event.target.value))} />
      </label>
      <label>
        Comment
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} />
      </label>
      <button type="button" onClick={handleSubmit}>
        Send feedback
      </button>
      {submitted && <p className="feedback-widget__success">Thanks! We appreciate your input.</p>}
    </div>
  );
}

export default FeedbackWidget;
