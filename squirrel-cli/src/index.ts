import { run } from './cli';

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
