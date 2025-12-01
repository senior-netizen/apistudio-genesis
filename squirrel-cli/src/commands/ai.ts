import fs from 'fs-extra';
import { Command } from 'commander';
import { composeRequest, requestAdvice } from '../api/ai';
import { logger } from '../utils/logger';
import { createSpinner } from '../utils/spinner';
import { confirmPrompt } from '../utils/prompts';

export const registerAiCommands = (program: Command): void => {
  const ai = program.command('ai').description('AI-assisted workflows');

  ai
    .command('advise')
    .description('Get AI guidance for a request')
    .option('-r, --request <requestId>', 'Saved request ID to analyze')
    .option('-f, --from-file <path>', 'Request file to analyze')
    .action(async (options: { request?: string; fromFile?: string }) => {
      if (!options.request && !options.fromFile) {
        logger.warn('Provide either --request or --from-file.');
        return;
      }
      let payload: unknown;
      if (options.fromFile) {
        payload = await fs.readJson(options.fromFile);
      }
      const spinner = createSpinner('Requesting AI advice...');
      try {
        const response = await requestAdvice({ requestId: options.request, payload });
        spinner.stop();
        logger.info(response.summary);
        if (response.suggestions?.length) {
          console.log();
          logger.info('Suggestions:');
          response.suggestions.forEach((suggestion, index) => {
            console.log(` ${index + 1}. ${suggestion}`);
          });
        }
        if (response.warnings?.length) {
          console.log();
          logger.warn('Warnings:');
          response.warnings.forEach((warning, index) => {
            console.log(` ${index + 1}. ${warning}`);
          });
        }
      } catch (error) {
        spinner.fail('AI advice request failed.');
        throw error;
      }
    });

  ai
    .command('compose <prompt...>')
    .description('Generate a new request from a natural language prompt')
    .action(async (promptParts: string[]) => {
      const prompt = promptParts.join(' ');
      const spinner = createSpinner('Composing request...');
      try {
        const response = await composeRequest(prompt);
        spinner.stop();
        logger.success('AI composed request:');
        console.log(JSON.stringify(response, null, 2));
        const shouldSave = await confirmPrompt('Save this request to a file?');
        if (shouldSave) {
          const fileName = `ai-request-${Date.now()}.json`;
          await fs.writeJson(fileName, response, { spaces: 2 });
          logger.success(`Saved to ${fileName}`);
        }
      } catch (error) {
        spinner.fail('Failed to compose request.');
        throw error;
      }
    });
};
