import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../../shared/providers/ai-provider.service';
import { OptimizerDto } from './dto/optimizer.dto';

export interface OptimizerSuggestion {
  category: 'cors' | 'performance' | 'reliability';
  title: string;
  recommendation: string;
  details: string[];
}

@Injectable()
export class OptimizerService {
  private readonly logger = new Logger(OptimizerService.name);

  constructor(private readonly providerService: AiProviderService) {}

  async suggest(dto: OptimizerDto) {
    const suggestions = this.deriveSuggestions(dto);
    const aiSummary = await this.providerService.generateCompletion({
      task: 'optimizer',
      input: JSON.stringify(dto.logs.slice(0, 5)),
      context: { suggestions },
    });

    return {
      suggestions,
      aiSummary: {
        provider: aiSummary.provider,
        model: aiSummary.model,
        output: aiSummary.output,
      },
    };
  }

  private deriveSuggestions(dto: OptimizerDto): OptimizerSuggestion[] {
    const suggestions: OptimizerSuggestion[] = [];
    const corsIssues = dto.logs.filter((log) =>
      typeof log['error'] === 'string' && (log['error'] as string).toLowerCase().includes('cors'),
    );
    if (corsIssues.length) {
      suggestions.push({
        category: 'cors',
        title: 'Configure Access-Control headers',
        recommendation:
          'Ensure the gateway and upstream service return Access-Control-Allow-Origin and related headers for allowed domains.',
        details: [
          'Allow only the origins observed in the failing logs to prevent overexposure.',
          'Include Access-Control-Allow-Credentials if cookies or auth headers are required.',
        ],
      });
    }

    const slowLogs = dto.logs.filter((log) => (log['durationMs'] as number | undefined) ?? 0 > 1000);
    if (slowLogs.length) {
      suggestions.push({
        category: 'performance',
        title: 'Introduce caching or pagination',
        recommendation:
          'Leverage Cache-Control/ETag headers and paginate large responses to reduce response times.',
        details: [
          'Use conditional requests with If-None-Match to avoid re-downloading unchanged data.',
          'Review database queries powering slow endpoints and add indexes where needed.',
        ],
      });
    }

    if (dto.logs.some((log) => (log['status'] as number | undefined) === 429)) {
      suggestions.push({
        category: 'reliability',
        title: 'Implement request retry and backoff',
        recommendation: 'Adopt exponential backoff and jitter strategies to gracefully handle rate limits.',
        details: [
          'Surface Retry-After headers to clients.',
          'Consider server-side batching for bursty workloads.',
        ],
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        category: 'performance',
        title: 'Monitor baseline performance',
        recommendation: 'No immediate issues detected; continue monitoring with performance budgets.',
        details: [
          'Track P95 latency and configure alerts when thresholds are exceeded.',
          'Enable structured logging for easier analysis of future incidents.',
        ],
      });
    }

    this.logger.debug(`Optimizer generated ${suggestions.length} suggestions`);
    return suggestions;
  }
}
