import inquirer from 'inquirer';

export interface LoginPromptResult {
  email: string;
  password: string;
}

export const loginPrompt = async (): Promise<LoginPromptResult> => {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Email',
      validate: (value: string) => value.length > 0 || 'Email is required'
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password',
      mask: '*',
      validate: (value: string) => value.length > 0 || 'Password is required'
    }
  ]);
  return answers as LoginPromptResult;
};

export const confirmPrompt = async (message: string): Promise<boolean> => {
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      default: false,
      message
    }
  ]);
  return (answers as { confirmed: boolean }).confirmed;
};
