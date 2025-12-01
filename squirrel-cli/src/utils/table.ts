import Table from 'cli-table3';

export const renderTable = (head: string[], rows: (string | number | undefined)[][]): void => {
  const table = new Table({ head });
  rows.forEach((row) => table.push(row));
  console.log(table.toString());
};
