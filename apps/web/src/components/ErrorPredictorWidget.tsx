export interface ErrorPredictorWidgetProps {
  endpointId: string;
  probability?: number;
  recommendation?: string;
}

export function ErrorPredictorWidget({ endpointId, probability = 0.12, recommendation }: ErrorPredictorWidgetProps) {
  const displayProbability = Math.round(probability * 100);
  return (
    <div className="error-predictor-widget" role="status" aria-live="polite">
      <header className="error-predictor-widget__header">
        <h3>Predictive Error Engine</h3>
        <span className="error-predictor-widget__endpoint">{endpointId}</span>
      </header>
      <p className="error-predictor-widget__probability">
        Failure probability: <strong>{displayProbability}%</strong>
      </p>
      <p className="error-predictor-widget__advice">
        {recommendation ?? 'Endpoint looks stable. No action required.'}
      </p>
    </div>
  );
}

export default ErrorPredictorWidget;
