import { Command } from 'commander';
import chalk from 'chalk';
import { generateDocsForCollection, fixErrorMessage, rememberOpenAIKey, suggestRequest } from '../services/ai.js';
import { loadConfig } from '../core/config.js';

export function registerAiCommands(program: Command): void {
  const ai = program.command('ai').description('AI assistant commands powered by OpenAI');

  ai
    .command('store-key')
    .description('Store an OpenAI API key in the encrypted vault')
    .argument('<key>', 'OpenAI API key')
    .action(async (key: string) => {
      await rememberOpenAIKey(key);
      console.log(chalk.green('API key stored securely.'));
    });

  ai
    .command('suggest <path>')
    .description('Ask AI for suggestions on improving an API endpoint')
    .action(async (path: string) => {
      const response = await suggestRequest(path);
      console.log(response);
    });

  ai
    .command('generate-docs <collection>')
    .description('Generate Markdown documentation for a saved collection')
    .action(async (collection: string) => {
      const config = await loadConfig();
      const definition = config.collections[collection];
      if (!definition) {
        console.log(chalk.red(`Collection "${collection}" not found.`));
        return;
      }
      const docs = await generateDocsForCollection(collection, definition.summary ?? '');
      console.log(docs);
    });

  ai
    .command('fix-error <message>')
    .description('Get help fixing an API error message')
    .action(async (message: string) => {
      const fix = await fixErrorMessage(message);
      console.log(fix);
    });
}
