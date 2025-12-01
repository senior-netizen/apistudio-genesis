import fs from 'fs-extra';
import path from 'path';
import { Command } from 'commander';
import { getCollection, listCollections, pushCollection } from '../api/collections';
import { logger } from '../utils/logger';
import { renderTable } from '../utils/table';
import { createSpinner } from '../utils/spinner';

const COLLECTION_DIR = path.join(process.cwd(), 'squirrel-collections');

const ensureCollectionDir = async (): Promise<string> => {
  await fs.ensureDir(COLLECTION_DIR);
  return COLLECTION_DIR;
};

const collectionFilePath = (collectionId: string, name: string): string => {
  const safeName = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  return path.join(COLLECTION_DIR, `${collectionId}-${safeName}.json`);
};

export const registerCollectionCommands = (program: Command): void => {
  const collections = program.command('collections').description('Manage request collections');

  collections
    .command('list')
    .description('List collections available in the workspace')
    .action(async () => {
      const spinner = createSpinner('Loading collections...');
      try {
        const data = await listCollections();
        spinner.stop();
        if (!data.length) {
          logger.warn('No collections found.');
          return;
        }
        renderTable(
          ['ID', 'Name', 'Updated'],
          data.map((item) => [item.id, item.name, item.updatedAt ?? '-'])
        );
      } catch (error) {
        spinner.fail('Failed to fetch collections.');
        throw error;
      }
    });

  collections
    .command('pull [collectionId]')
    .description('Download collections as local JSON files')
    .action(async (collectionId?: string) => {
      const spinner = createSpinner('Pulling collections...');
      try {
        await ensureCollectionDir();
        if (collectionId) {
          const collection = await getCollection(collectionId);
          await fs.writeJson(collectionFilePath(collection.id ?? collectionId, collection.name), collection, { spaces: 2 });
          spinner.succeed(`Saved ${collection.name}`);
        } else {
          const summaries = await listCollections();
          for (const summary of summaries) {
            const collection = await getCollection(summary.id);
            await fs.writeJson(collectionFilePath(collection.id ?? summary.id, collection.name), collection, { spaces: 2 });
          }
          spinner.succeed(`Pulled ${summaries.length} collection(s).`);
        }
      } catch (error) {
        spinner.fail('Failed to pull collections.');
        throw error;
      }
    });

  collections
    .command('push [folder]')
    .description('Upload local collection files to the workspace')
    .action(async (folder?: string) => {
      const sourceDir = folder ? path.resolve(folder) : await ensureCollectionDir();
      const spinner = createSpinner(`Pushing collections from ${sourceDir}...`);
      try {
        const files = (await fs.readdir(sourceDir)).filter((file: string) => file.endsWith('.json'));
        if (!files.length) {
          spinner.stop();
          logger.warn('No JSON collection files found.');
          return;
        }
        for (const file of files) {
          const payload = await fs.readJson(path.join(sourceDir, file));
          await pushCollection(payload);
        }
        spinner.succeed(`Pushed ${files.length} collection(s).`);
      } catch (error) {
        spinner.fail('Failed to push collections.');
        throw error;
      }
    });
};
