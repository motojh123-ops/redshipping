import ExcelJS from 'exceljs';

/**
 * Clean and secure Excel workbook export utility using ExcelJS.
 * Replaces vulnerable xlsx library without prototype-pollution CVEs.
 */
export async function exportWorkbook(
  filename: string,
  sheetName: string,
  rows: (string | number | boolean | null | undefined)[][],
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Banna ERP / Red Shipping';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName);

  rows.forEach((row) => {
    worksheet.addRow(row);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
