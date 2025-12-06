import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

let tracerProvider: NodeTracerProvider | null = null;

export async function startOtel(serviceName: string) {
  if (tracerProvider) {
    return { tracerProvider };
  }

  const resource = resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  });

  const traceExporter = new OTLPTraceExporter({});
  tracerProvider = new NodeTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(traceExporter)],
  });
  tracerProvider.register();

  return { tracerProvider };
}

export async function shutdownOtel() {
  await Promise.all([tracerProvider?.shutdown()].filter(Boolean) as Promise<void>[]);
  tracerProvider = null;
}
