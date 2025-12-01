import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export async function prompt(question: string, mask = false): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    if (!mask) {
      const answer = await rl.question(`${question}: `);
      return answer.trim();
    }

    const answer = await new Promise<string>((resolve) => {
      const buffer: string[] = [];
      output.write(`${question}: `);
      const onData = (data: Buffer) => {
        const char = data.toString();
        if (char === '\n' || char === '\r' || char === '\u0004') {
          input.removeListener('data', onData);
          output.write('\n');
          resolve(buffer.join(''));
        } else if (char === '\u0003') {
          process.exit(1);
        } else if (char === '\u0008' || char === '\u007f') {
          buffer.pop();
        } else {
          buffer.push(char);
          output.write('*');
        }
      };
      input.on('data', onData);
    });

    return answer.trim();
  } finally {
    rl.close();
  }
}
