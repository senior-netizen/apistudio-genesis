import ora from 'ora';

export const createSpinner = (text: string) => ora({ text, color: 'cyan' }).start();
