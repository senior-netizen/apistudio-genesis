export interface HeatmapDataPoint {
  endpoint: string;
  hour: number;
  intensity: number;
}

export interface HeatmapChartProps {
  data: HeatmapDataPoint[];
}

export function HeatmapChart({ data }: HeatmapChartProps) {
  return (
    <div className="heatmap-chart">
      {data.map((point) => (
        <div
          key={`${point.endpoint}-${point.hour}`}
          className="heatmap-chart__cell"
          style={{
            backgroundColor: `rgba(244, 114, 182, ${Math.min(point.intensity, 1)})`,
          }}
        >
          <span className="heatmap-chart__label">
            {point.endpoint} — {point.hour}:00
          </span>
        </div>
      ))}
      {data.length === 0 && <p className="heatmap-chart__empty">No usage data captured yet.</p>}
    </div>
  );
}

export default HeatmapChart;
