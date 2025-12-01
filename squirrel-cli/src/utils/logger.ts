import chalk from 'chalk';
import { AxiosError } from 'axios';

class Logger {
  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string): void {
    console.log(chalk.green('✔'), message);
  }

  warn(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  }

  error(message: string): void {
    console.error(chalk.red('✖'), message);
  }

  handleError(error: unknown): void {
    if (error instanceof Error) {
      this.error(error.message);
    } else {
      this.error('An unknown error occurred.');
    }
  }

  handleAxiosError(error: AxiosError): void {
    if (error.response) {
      const status = `${error.response.status} ${error.response.statusText}`;
      const body = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data, null, 2);
      this.error(`Request failed with status ${status}.\n${body}`);
    } else if (error.request) {
      this.error('Unable to reach Squirrel API gateway. Check your network connection or base URL.');
    } else {
      this.error(error.message);
    }
  }
}

export const logger = new Logger();
