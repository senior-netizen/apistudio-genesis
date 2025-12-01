import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../../shared/providers/ai-provider.service';
import { TestGenerationDto } from './dto/test-generation.dto';

export interface GeneratedTestCase {
  name: string;
  description: string;
  assertions: Array<{
    type: 'status' | 'json-path' | 'schema';
    path?: string;
    expected?: unknown;
  }>;
  codeTemplate: string;
}

@Injectable()
export class TestsService {
  private readonly logger = new Logger(TestsService.name);

  constructor(private readonly providerService: AiProviderService) {}

  async generate(dto: TestGenerationDto) {
    const baseTests = this.createBaseTests(dto);
    const aiSummary = await this.providerService.generateCompletion({
      task: 'tests',
      input: `${dto.request.method} ${dto.request.url}`,
      context: { baseTests },
    });

    return {
      cases: baseTests,
      aiSummary: {
        provider: aiSummary.provider,
        model: aiSummary.model,
        output: aiSummary.output,
      },
    };
  }

  private createBaseTests(dto: TestGenerationDto): GeneratedTestCase[] {
    const cases: GeneratedTestCase[] = [];
    const status = dto.responseSample?.status ?? 200;

    cases.push({
      name: `${dto.request.method.toUpperCase()} ${dto.request.url} returns ${status}`,
      description: 'Validates that the endpoint responds with the expected HTTP status code.',
      assertions: [
        {
          type: 'status',
          expected: status,
        },
      ],
      codeTemplate: this.buildJestTemplate(dto, status),
    });

    if (dto.responseSample?.body) {
      const sampleBody = dto.responseSample.body;
      Object.entries(sampleBody).forEach(([key, value]) => {
        cases.push({
          name: `Response contains ${key}`,
          description: `Ensures the response JSON includes the “${key}” field with the expected type.`,
          assertions: [
            {
              type: 'json-path',
              path: `$.${key}`,
              expected: typeof value,
            },
          ],
          codeTemplate: `expect(body.${key}).toBeDefined();`,
        });
      });
    }

    if (dto.assertions) {
      dto.assertions.forEach((assertion) =>
        cases.push({
          name: assertion,
          description: assertion,
          assertions: [
            {
              type: 'schema',
              path: assertion,
            },
          ],
          codeTemplate: `// TODO: implement custom assertion for ${assertion}`,
        }),
      );
    }

    return cases;
  }

  private buildJestTemplate(dto: TestGenerationDto, status: number): string {
    return `await expect(apiClient.${dto.request.method.toLowerCase()}('${dto.request.url}', ${JSON.stringify(
      dto.request.body ?? {},
      null,
      2,
    )})).resolves.toMatchObject({ status: ${status} });`;
  }
}
