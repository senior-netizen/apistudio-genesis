import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../core/config.js';

interface DocsOptions {
  format?: string;
  output?: string;
}

export function registerDocsCommands(program: Command): void {
  const docs = program.command('docs').description('Generate documentation from your collections');

  docs
    .command('generate')
    .description('Generate OpenAPI or Postman documentation')
    .option('--format <format>', 'Output format (openapi|postman)', 'openapi')
    .option('--output <file>', 'Write documentation to a file')
    .action(async (options: DocsOptions) => {
      const config = await loadConfig();
      if (Object.keys(config.collections).length === 0) {
        console.log(chalk.yellow('No collections found. Save requests with `--save` before generating docs.'));
        return;
      }

      const format = (options.format ?? 'openapi').toLowerCase();
      if (format === 'postman') {
        const doc = buildPostman(config.collections);
        emit(doc, options.output);
        return;
      }

      const openapi = buildOpenApi(config.collections);
      emit(openapi, options.output);
    });
}

function emit(document: unknown, outputPath?: string) {
  const serialized = JSON.stringify(document, null, 2);
  if (outputPath) {
    const resolved = path.resolve(outputPath);
    fs.writeFileSync(resolved, serialized);
    console.log(chalk.green(`Documentation written to ${resolved}`));
  } else {
    console.log(serialized);
  }
}

function buildOpenApi(collections: Record<string, any>) {
  const paths: Record<string, any> = {};
  Object.values(collections).forEach((collection: any) => {
    collection.requests.forEach((request: any) => {
      const pathItem = (paths[request.path] = paths[request.path] ?? {});
      pathItem[request.method.toLowerCase()] = {
        summary: request.name,
        description: request.description,
        responses: {
          default: {
            description: 'Response generated from CLI',
          },
        },
      };
    });
  });

  return {
    openapi: '3.1.0',
    info: {
      title: 'Squirrel API Studio Collection',
      version: '1.0.0',
    },
    paths,
  };
}

function buildPostman(collections: Record<string, any>) {
  return {
    info: {
      name: 'Squirrel API Studio Collection',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: Object.values(collections).map((collection: any) => ({
      name: collection.name,
      item: collection.requests.map((request: any) => ({
        name: request.name,
        request: {
          method: request.method,
          header: Object.entries(request.headers ?? {}).map(([key, value]) => ({ key, value })),
          url: {
            raw: request.path,
            path: request.path.split('/').filter(Boolean),
          },
          body: request.body
            ? {
                mode: 'raw',
                raw: JSON.stringify(request.body, null, 2),
              }
            : undefined,
        },
      })),
    })),
  };
}
