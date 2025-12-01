import chalk from 'chalk';
import ora from 'ora';

export interface PrintOptions {
  pretty?: boolean;
  showTip?: string;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function printResponse(
  status: number,
  duration: number,
  method: string,
  path: string,
  bodyText: string,
  options: PrintOptions = {}
): void {
  const statusColor = status >= 200 && status < 300 ? chalk.green : status >= 400 ? chalk.red : chalk.yellow;
  const icon = status >= 200 && status < 300 ? '🟢' : status >= 400 ? '🔴' : '🟠';
  console.log(`${statusColor(`${icon} ${status} ${method.toUpperCase()}`)} ${chalk.gray(`| ${formatDuration(duration)}`)}`);
  console.log(chalk.bold('Endpoint:'), path);
  console.log('─────────────────────────────');
  if (options.pretty) {
    try {
      const json = JSON.parse(bodyText);
      console.log(JSON.stringify(json, null, 2));
    } catch (error) {
      console.log(bodyText);
    }
  } else {
    console.log(bodyText);
  }
  console.log('─────────────────────────────');
  if (options.showTip) {
    console.log(chalk.gray(`Tip: ${options.showTip}`));
  }
}

export function createSpinner(text: string) {
  return ora({ text, color: 'cyan' });
}
