import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

export interface DataTableColumn<T> {
  header: string;
  accessor: keyof T;
  render?: (value: T[keyof T], row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  emptyState?: ReactNode;
}

export function DataTable<T extends Record<string, unknown>>({ columns, data, emptyState }: DataTableProps<T>) {
  if (!data.length && emptyState) {
    return <div className="rounded-[12px] border border-dashed border-border/60 bg-background/70 p-6 text-center text-sm text-muted">{emptyState}</div>;
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-white/5 bg-background/70 shadow-soft">
      <table className="min-w-full divide-y divide-border/60 text-sm">
        <thead className="bg-foreground/5">
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em] text-muted',
                  column.align === 'center' ? 'text-center' : '',
                  column.align === 'right' ? 'text-right' : '',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {data.map((row, idx) => (
            <motion.tr key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}>
              {columns.map((column) => {
                const value = row[column.accessor];
                return (
                  <td
                    key={String(column.accessor)}
                    className={cn(
                      'px-4 py-3 text-foreground/90',
                      column.align === 'center' ? 'text-center' : '',
                      column.align === 'right' ? 'text-right' : '',
                    )}
                  >
                    {column.render ? column.render(value, row) : (value as ReactNode)}
                  </td>
                );
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
