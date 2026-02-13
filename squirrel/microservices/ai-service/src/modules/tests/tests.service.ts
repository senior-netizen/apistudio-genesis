import { Injectable, Logger } from "@nestjs/common";
import { AiProviderService } from "../../shared/providers/ai-provider.service";
import { TestGenerationDto } from "./dto/test-generation.dto";

export interface GeneratedTestCase {
  name: string;
  description: string;
  assertions: Array<{
    type: "status" | "json-path" | "schema";
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
      task: "tests",
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
      description:
        "Validates that the endpoint responds with the expected HTTP status code.",
      assertions: [
        {
          type: "status",
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
              type: "json-path",
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
        cases.push(this.buildCustomAssertionCase(assertion)),
      );
    }

    return cases;
  }

  private buildCustomAssertionCase(assertion: string): GeneratedTestCase {
    const normalized = assertion.trim();
    const statusMatch = normalized.match(/^status(?:\s+is|\s*=)?\s+(\d{3})$/i);
    if (statusMatch) {
      const expectedStatus = Number(statusMatch[1]);
      return {
        name: `Status is ${expectedStatus}`,
        description: assertion,
        assertions: [{ type: "status", expected: expectedStatus }],
        codeTemplate: `expect(response.status).toBe(${expectedStatus});`,
      };
    }

    const existsMatch = normalized.match(
      /^(?:body\.|\$\.?)([a-zA-Z0-9_.\[\]]+)\s+(?:exists|defined)$/i,
    );
    if (existsMatch) {
      const path = existsMatch[1].replace(/^\./, "");
      return {
        name: `${path} exists`,
        description: assertion,
        assertions: [{ type: "json-path", path: `$.${path}` }],
        codeTemplate: `expect(body${this.toDotPath(path)}).toBeDefined();`,
      };
    }

    const equalsMatch = normalized.match(
      /^(?:body\.|\$\.?)([a-zA-Z0-9_.\[\]]+)\s+(?:equals|==|=)\s+(.+)$/i,
    );
    if (equalsMatch) {
      const path = equalsMatch[1].replace(/^\./, "");
      const expected = this.parseExpectedValue(equalsMatch[2]);
      return {
        name: `${path} equals ${String(expected)}`,
        description: assertion,
        assertions: [{ type: "json-path", path: `$.${path}`, expected }],
        codeTemplate: `expect(body${this.toDotPath(path)}).toEqual(${JSON.stringify(expected)});`,
      };
    }

    return {
      name: assertion,
      description: assertion,
      assertions: [{ type: "schema", path: assertion }],
      codeTemplate: `expect(body).toMatchObject(${JSON.stringify({ rule: assertion })});`,
    };
  }

  private parseExpectedValue(raw: string): unknown {
    const value = raw.trim();
    if (/^true$/i.test(value)) return true;
    if (/^false$/i.test(value)) return false;
    if (/^null$/i.test(value)) return null;
    if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }
    return value;
  }

  private toDotPath(path: string): string {
    return path
      .split(".")
      .map((segment) =>
        segment.match(/^\w+$/) ? `.${segment}` : `[${JSON.stringify(segment)}]`,
      )
      .join("");
  }

  private buildJestTemplate(dto: TestGenerationDto, status: number): string {
    return `await expect(apiClient.${dto.request.method.toLowerCase()}('${dto.request.url}', ${JSON.stringify(
      dto.request.body ?? {},
      null,
      2,
    )})).resolves.toMatchObject({ status: ${status} });`;
  }
}
