/**
 * Utility to export tabular data to clean CSV/Excel files with UTF-8 BOM
 * Ensures Arabic text opens properly in Microsoft Excel on Windows without gibberish.
 */

export interface ExportColumn<T> {
  header: string;
  accessor: (item: T) => string | number | boolean | null | undefined;
}

export function exportToCsv<T>(
  filename: string,
  data: T[],
  columns: ExportColumn<T>[]
): void {
  if (!data || data.length === 0) {
    alert('لا توجد بيانات للتصدير');
    return;
  }

  // Header row
  const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(',');

  // Data rows
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const val = col.accessor(item);
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',')
  );

  // Prepend UTF-8 BOM (\uFEFF) so Excel recognizes Arabic characters properly
  const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
