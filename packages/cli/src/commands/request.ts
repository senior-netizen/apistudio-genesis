import { Command } from 'commander';
import chalk from 'chalk';
import { sendRequest } from '../core/httpClient.js';
import { parseJsonInput, parseKeyValuePairs } from '../utils/parser.js';
import { printResponse } from '../utils/printer.js';
import { loadConfig, saveConfig } from '../core/config.js';
import { CollectionDefinition } from '../types/config.js';

interface RequestCommandOptions {
  data?: string;
  file?: string;
  header?: string[];
  env?: string;
  auth?: string;
  pretty?: boolean;
  save?: boolean | string;
  export?: string;
}

function registerRequestCommand(program: Command, method: string) {
  program
    .command(method)
    .argument('<path>', 'Request path, e.g. /users')
    .description(`${method.toUpperCase()} a resource from the active environment`)
    .option('--data <data>', 'JSON payload to send')
    .option('--file <path>', 'Read request body from file')
    .option('--header <header...>', 'Custom header key=value pair', [])
    .option('--env <env>', 'Override environment for this request')
    .option('--auth <token>', 'Override auth token for this request')
    .option('--pretty', 'Pretty-print JSON responses')
    .option('--save [name]', 'Save the request into a collection')
    .option('--export <path>', 'Export the response body to a file')
    .action(async (pathArg: string, options: RequestCommandOptions) => {
      const body = parseJsonInput(options.data, options.file);
      const headers = parseKeyValuePairs(options.header);
      const response = await sendRequest({
        method: method.toUpperCase(),
        path: pathArg,
        body,
        headers,
        environmentName: options.env,
        authToken: options.auth,
      });

      if (options.export) {
        const fs = await import('node:fs');
        await fs.promises.writeFile(options.export, response.bodyText);
        console.log(chalk.green(`Response exported to ${options.export}`));
      }

      printResponse(
        response.status,
        response.durationMs,
        method.toUpperCase(),
        pathArg,
        response.bodyText,
        { pretty: options.pretty, showTip: 'Run `squirrel ai analyze` for performance hints.' }
      );

      if (options.save) {
        const config = await loadConfig();
        const collectionName = typeof options.save === 'string' ? options.save : 'scratchpad.collection';
        const collection: CollectionDefinition = config.collections[collectionName] ?? {
          name: collectionName,
          requests: [],
        };
        collection.requests.push({
          id: `${collection.requests.length + 1}`,
          name: `${method.toUpperCase()} ${pathArg}`,
          method: method.toUpperCase(),
          path: pathArg,
          body,
          headers,
        });
        config.collections[collectionName] = collection;
        await saveConfig(config);
        console.log(chalk.green(`Saved to collection ${collectionName}.`));
      }
    });
}

export function registerRequestCommands(program: Command): void {
  ['get', 'post', 'put', 'patch', 'delete'].forEach((method) => registerRequestCommand(program, method));
}
