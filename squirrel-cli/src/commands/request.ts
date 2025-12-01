import { Command, Option } from 'commander';
import { runAdhocRequest, runSavedRequest } from '../api/requests';
import { logger } from '../utils/logger';
import { createSpinner } from '../utils/spinner';

interface RunOptions {
  url?: string;
  method?: string;
  header?: string[];
  body?: string;
  raw?: boolean;
  json?: boolean;
  quiet?: boolean;
}

const parseHeaders = (headers?: string[]): Record<string, string> | undefined => {
  if (!headers?.length) {
    return undefined;
  }
  return headers.reduce<Record<string, string>>((acc, header) => {
    const [key, ...rest] = header.split('=');
    if (key) {
      acc[key.trim()] = rest.join('=').trim();
    }
    return acc;
  }, {});
};

const prettyPrintResponse = (response: unknown, raw?: boolean): void => {
  if (raw) {
    process.stdout.write(typeof response === 'string' ? response : JSON.stringify(response));
    return;
  }
  if (typeof response === 'object') {
    console.log(JSON.stringify(response, null, 2));
    return;
  }
  console.log(response);
};

export const registerRequestCommands = (program: Command): void => {
  const request = program.command('request').description('Work with requests');

  request
    .command('run [requestId]')
    .description('Execute a saved request or ad-hoc request')
    .addOption(new Option('-u, --url <url>', 'URL to call').conflicts('requestId'))
    .option('-m, --method <method>', 'HTTP method (default: GET)')
    .option('-H, --header <key=value...>', 'Add request header', (value: string, previous: string[]) => {
      const acc = previous ?? [];
      acc.push(value);
      return acc;
    }, [])
    .option('-b, --body <body>', 'Request body (JSON)')
    .option('--raw', 'Output raw response body')
    .option('--json', 'Output JSON metadata for scripting')
    .option('--quiet', 'Suppress human-readable output')
    .action(async (requestId: string | undefined, options: RunOptions) => {
      const spinner = createSpinner('Executing request...');
      try {
        let result;
        if (requestId && !options.url) {
          result = await runSavedRequest(requestId);
        } else if (options.url) {
          const headers = parseHeaders(options.header);
          let payload: unknown = undefined;
          if (options.body) {
            try {
              payload = JSON.parse(options.body);
            } catch (error) {
              spinner.fail('Invalid JSON body.');
              throw error;
            }
          }
          result = await runAdhocRequest({
            url: options.url,
            method: options.method ?? 'GET',
            headers,
            body: payload
          });
        } else {
          spinner.fail('You must supply either a request ID or a URL.');
          return;
        }
        spinner.stop();
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }
        if (!options.quiet) {
          logger.info(`Status: ${result.status} ${result.statusText}`);
          logger.info(`Duration: ${result.durationMs}ms`);
          if (result.headers) {
            logger.info(`Headers: ${JSON.stringify(result.headers, null, 2)}`);
          }
          logger.info('Body:');
        }
        prettyPrintResponse(result.body, options.raw);
      } catch (error) {
        spinner.fail('Request execution failed.');
        throw error;
      }
    });
};
