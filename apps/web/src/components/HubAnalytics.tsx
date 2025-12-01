interface HubAnalyticsProps {
  subscribers: number;
  averageRating: number | null;
  reviews: { id: string; userId: string; rating: number; comment?: string }[];
}

export function HubAnalytics({ subscribers, averageRating, reviews }: HubAnalyticsProps) {
  return (
    <section className="hub-analytics">
      <header>
        <h2>Marketplace Performance</h2>
      </header>
      <dl className="hub-analytics__stats">
        <div>
          <dt>Active Subscribers</dt>
          <dd>{subscribers}</dd>
        </div>
        <div>
          <dt>Average Rating</dt>
          <dd>{averageRating ? averageRating.toFixed(2) : 'No reviews yet'}</dd>
        </div>
      </dl>
      <h3>Recent Reviews</h3>
      <ul>
        {reviews.map((review) => (
          <li key={review.id}>
            <strong>{review.userId}</strong> rated {review.rating}/5
            {review.comment && <p>{review.comment}</p>}
          </li>
        ))}
        {reviews.length === 0 && <li>No reviews yet.</li>}
      </ul>
    </section>
  );
}

export default HubAnalytics;
