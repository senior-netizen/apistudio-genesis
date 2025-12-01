import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../../shared/providers/ai-provider.service';
import { AdvisorRequestDto } from './dto/http-transaction.dto';

export interface AdvisorSuggestionResponse {
  probableCause: string;
  explanation: string;
  fixSteps: string[];
  examples: Array<{ label: string; language: string; content: string }>;
  aiSummary: {
    provider: string;
    model?: string;
    output: string;
  };
}

@Injectable()
export class AdvisorService {
  private readonly logger = new Logger(AdvisorService.name);

  constructor(private readonly providerService: AiProviderService) {}

  async analyze(dto: AdvisorRequestDto): Promise<AdvisorSuggestionResponse> {
    const probableCause = this.deriveProbableCause(dto);
    const explanation = this.buildExplanation(dto, probableCause);
    const fixSteps = this.generateFixSteps(dto, probableCause);
    const examples = this.generateExamples(dto);

    const aiSummary = await this.providerService.generateCompletion({
      task: 'advisor',
      input: `${dto.request.method} ${dto.request.url} -> ${dto.response.status}`,
      context: {
        probableCause,
        explanation,
        recentAttempts: dto.recentAttempts,
        errorMessage: dto.response.errorMessage,
      },
    });

    const result: AdvisorSuggestionResponse = {
      probableCause,
      explanation,
      fixSteps,
      examples,
      aiSummary: {
        provider: aiSummary.provider,
        model: aiSummary.model,
        output: aiSummary.output,
      },
    };

    this.logger.debug(`Advisor result computed for ${dto.request.method} ${dto.request.url}`);
    return result;
  }

  private deriveProbableCause(dto: AdvisorRequestDto): string {
    const status = dto.response.status;
    const error = dto.response.errorMessage?.toLowerCase() ?? '';
    if (status === 401 || error.includes('unauthorized')) {
      return 'Authentication failure – check API keys or auth headers.';
    }
    if (status === 403) {
      return 'Authorization failure – credentials lack required permissions.';
    }
    if (status === 404) {
      return 'Resource not found – verify endpoint path and identifiers.';
    }
    if (status >= 500) {
      return 'Server error – backend may be misconfigured or experiencing downtime.';
    }
    if (status === 400 || error.includes('invalid')) {
      return 'Invalid request payload or query parameters.';
    }
    if (status === 429 || error.includes('rate')) {
      return 'Rate limiting encountered – requests exceed allowed throughput.';
    }
    return 'Unexpected response – inspect request payload, headers, and upstream logs.';
  }

  private buildExplanation(dto: AdvisorRequestDto, cause: string): string {
    const { method, url, headers } = dto.request;
    const response = dto.response;
    const headerSummary = headers
      ? Object.entries(headers)
          .slice(0, 3)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
      : 'No custom headers included';

    const message = response.errorMessage ? ` Error: ${response.errorMessage}.` : '';
    return `The ${method.toUpperCase()} ${url} call returned HTTP ${response.status}. ${cause} Headers snapshot → ${headerSummary}.${message}`;
  }

  private generateFixSteps(dto: AdvisorRequestDto, cause: string): string[] {
    const steps: string[] = [];
    steps.push('Review the original request payload and compare it against the API documentation.');

    if (cause.includes('Authentication')) {
      steps.push('Verify that the Authorization header includes the correct scheme and token.');
      steps.push('Confirm that the token or API key is still valid and has not expired.');
    }

    if (cause.includes('Authorization')) {
      steps.push('Ensure the account or token has permissions for this endpoint.');
      steps.push('Review role or scope assignments in the upstream service.');
    }

    if (cause.includes('payload') || cause.includes('Invalid')) {
      steps.push('Validate the request body against the expected schema.');
      steps.push('Double-check query parameters for typos or unsupported values.');
    }

    if (cause.includes('Server error')) {
      steps.push('Inspect upstream service logs for stack traces or outages.');
      steps.push('Retry the request with exponential backoff to mitigate transient failures.');
    }

    if (cause.includes('Rate')) {
      steps.push('Implement retry with jitter and respect rate limit headers.');
      steps.push('Consider batching calls or caching responses to reduce load.');
    }

    steps.push('Re-run the call using the corrected inputs to validate the fix.');
    return steps;
  }

  private generateExamples(dto: AdvisorRequestDto) {
    const curl = `curl -X ${dto.request.method.toUpperCase()} "${dto.request.url}"`;
    const body = dto.request.body ? JSON.stringify(dto.request.body, null, 2) : undefined;
    const headers = dto.request.headers
      ? Object.entries(dto.request.headers)
          .map(([key, value]) => `  -H "${key}: ${value}"`)
          .join(' \\\n')
      : '';

    const curlSnippet = [curl, headers, body ? `  -d '${body}'` : undefined]
      .filter(Boolean)
      .join(' \\\n');

    return [
      {
        label: 'Retry with corrected headers',
        language: 'bash',
        content: curlSnippet || curl,
      },
      {
        label: 'Example request payload',
        language: 'json',
        content: body ?? '{ }',
      },
    ];
  }
}
