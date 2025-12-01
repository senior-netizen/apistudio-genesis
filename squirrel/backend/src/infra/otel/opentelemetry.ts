import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | null = null;

export async function startOtel(serviceName: string) {
  if (sdk) {
    return sdk;
  }
  const prometheusPort = Number(process.env.OTEL_PROMETHEUS_PORT ?? 9464);
  const traceExporter = new OTLPTraceExporter({});
  const prometheusExporter = new PrometheusExporter({ port: prometheusPort }, () => {
    console.log(`Prometheus exporter started on port ${prometheusPort}`);
  });
  sdk = new NodeSDK({
    traceExporter,
    metricReader: prometheusExporter,
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  await sdk.start();
  return sdk;
}

export async function shutdownOtel() {
  if (!sdk) return;
  await sdk.shutdown();
  sdk = null;
}
