import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../../shared/providers/ai-provider.service';
import { ComposeRequestDto } from './dto/compose-request.dto';

export interface ComposedRequestSuggestion {
  method: string;
  url: string;
  headers: Record<string, string>;
  query?: Record<string, string>;
  bodyTemplate?: Record<string, unknown>;
  aiSummary: {
    provider: string;
    model?: string;
    output: string;
  };
}

@Injectable()
export class ComposerService {
  private readonly logger = new Logger(ComposerService.name);

  constructor(private readonly providerService: AiProviderService) {}

  async compose(dto: ComposeRequestDto): Promise<ComposedRequestSuggestion> {
    const method = (dto.preferredMethod ?? this.deriveMethod(dto.description)).toUpperCase();
    const url = this.deriveUrl(dto.description, dto.baseUrl);
    const headers = this.buildHeaders(dto);
    const query = this.deriveQuery(dto.description);
    const bodyTemplate = this.deriveBodyTemplate(dto);

    const aiSummary = await this.providerService.generateCompletion({
      task: 'composer',
      input: dto.description,
      context: { method, url, headers, query, bodyTemplate },
    });

    const suggestion: ComposedRequestSuggestion = {
      method,
      url,
      headers,
      query,
      bodyTemplate,
      aiSummary: {
        provider: aiSummary.provider,
        model: aiSummary.model,
        output: aiSummary.output,
      },
    };

    this.logger.debug(`Composer suggestion created for ${dto.description}`);
    return suggestion;
  }

  private deriveMethod(description: string): string {
    const lower = description.toLowerCase();
    if (lower.includes('create') || lower.includes('add')) {
      return 'POST';
    }
    if (lower.includes('update') || lower.includes('replace')) {
      return 'PUT';
    }
    if (lower.includes('patch')) {
      return 'PATCH';
    }
    if (lower.includes('delete') || lower.includes('remove')) {
      return 'DELETE';
    }
    return 'GET';
  }

  private deriveUrl(description: string, baseUrl?: string): string {
    const match = description.match(/\b([\w-]+\/?){1,3}\b api/i);
    let resource = 'resource';
    if (match) {
      resource = match[0]
        .toLowerCase()
        .replace(/ api/, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    } else {
      const noun = description.match(/\busers|projects|orders|items|sessions\b/i);
      if (noun) {
        resource = noun[0].toLowerCase();
      }
    }
    const prefix = baseUrl ? baseUrl.replace(/\/$/, '') : '';
    return `${prefix}/${resource}`.replace(/\/\//g, '/');
  }

  private buildHeaders(dto: ComposeRequestDto): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (dto.knownHeaders) {
      Object.assign(headers, dto.knownHeaders);
    }
    if (!Object.keys(headers).some((key) => key.toLowerCase() === 'authorization')) {
      headers.Authorization = 'Bearer <token>'; // placeholder for user to replace
    }
    return headers;
  }

  private deriveQuery(description: string): Record<string, string> | undefined {
    const query: Record<string, string> = {};
    if (description.toLowerCase().includes('pagination')) {
      query.page = '1';
      query.limit = '25';
    }
    if (description.toLowerCase().includes('filter')) {
      query.filter = '<filter-value>';
    }
    return Object.keys(query).length > 0 ? query : undefined;
  }

  private deriveBodyTemplate(dto: ComposeRequestDto): Record<string, unknown> | undefined {
    if (dto.samplePayload) {
      return dto.samplePayload;
    }
    const description = dto.description.toLowerCase();
    if (description.includes('create') || description.includes('update') || description.includes('patch')) {
      return {
        name: '<string>',
        description: '<string>',
      };
    }
    return undefined;
  }
}
