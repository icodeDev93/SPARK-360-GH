export type ExportColumn<T> = {
  header: string;
  value: (row: T, index: number) => unknown;
};

type ExportOptions<T> = {
  title: string;
  filename: string;
  columns: ExportColumn<T>[];
  rows: T[];
  subtitle?: string;
  totals?: { label: string; value: string }[];
};

export function cleanExportText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\u00c2\u00a2|\u00e2\u201a\u00b5|Ã¢â€šÂµ|â‚µ/g, '₵')
    .replace(/\u00e2\u20ac\u201d|â€”|â€“/g, '-')
    .replace(/\u00c3\u2014|Ã—/g, 'x')
    .replace(/\u00c2\u00b7|Â·/g, '-')
    .replace(/\u00e2\u20ac\u00a6|â€¦/g, '...')
    .replace(/\u00e2\u20ac\u02dc|\u00e2\u20ac\u2122|â€˜|â€™/g, "'")
    .replace(/\u00e2\u20ac\u0153|\u00e2\u20ac\u009d|â€œ|â€�/g, '"')
    .replace(/[<>]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function formatCurrency(value: number): string {
  return `₵${Number(value || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatExportDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return cleanExportText(iso);
  return date.toLocaleDateString('en-GH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function isWithinDateRange(iso: string | null | undefined, startDate: string, endDate: string): boolean {
  if (!startDate && !endDate) return true;
  if (!iso) return true;
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return true;
  value.setHours(0, 0, 0, 0);
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (value < start) return false;
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (value > end) return false;
  }
  return true;
}

function escapeCsv(value: unknown): string {
  const clean = cleanExportText(value);
  return /[",\n\r]/.test(clean) ? `"${clean.replace(/"/g, '""')}"` : clean;
}

function escapeHtml(value: unknown): string {
  return cleanExportText(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function exportRowsCsv<T>({ filename, columns, rows, totals }: ExportOptions<T>): void {
  const body = rows.map((row, rowIndex) =>
    columns.map((column) => escapeCsv(column.value(row, rowIndex))).join(',')
  );
  const footer = totals?.length
    ? ['', ...totals.map((total) => `${escapeCsv(total.label)},${escapeCsv(total.value)}`)]
    : [];
  const csv = [
    columns.map((column) => escapeCsv(column.header)).join(','),
    ...body,
    ...footer,
  ].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportRowsPdf<T>({ title, filename, subtitle, columns, rows, totals }: ExportOptions<T>): void {
  const tableRows = rows.map((row, rowIndex) => `
    <tr>${columns.map((column) => `<td>${escapeHtml(column.value(row, rowIndex))}</td>`).join('')}</tr>
  `).join('');
  const totalRows = totals?.length
    ? `<div class="totals">${totals.map((total) => `<div><span>${escapeHtml(total.label)}</span><strong>${escapeHtml(total.value)}</strong></div>`).join('')}</div>`
    : '';
  const doc = window.open('', '_blank', 'width=1100,height=820');
  if (!doc) return;
  doc.document.write(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #1e293b; margin: 28px; }
          h1 { font-size: 22px; margin: 0 0 4px; }
          .subtitle { color: #64748b; font-size: 12px; margin-bottom: 18px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #eef2ff; color: #3730a3; text-align: left; padding: 8px; border: 1px solid #dbe3f0; }
          td { padding: 7px 8px; border: 1px solid #e2e8f0; vertical-align: top; }
          tr:nth-child(even) td { background: #f8fafc; }
          .totals { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
          .totals div { border: 1px solid #dbe3f0; border-radius: 8px; padding: 8px 12px; min-width: 160px; }
          .totals span { color: #64748b; display: block; font-size: 10px; text-transform: uppercase; }
          .totals strong { display: block; margin-top: 2px; font-size: 14px; }
          @media print { body { margin: 14px; } }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <div class="subtitle">${escapeHtml(subtitle || `Generated ${new Date().toLocaleString('en-GH')}`)}</div>
        <table>
          <thead><tr>${columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join('')}</tr></thead>
          <tbody>${tableRows || `<tr><td colspan="${columns.length}">No records found</td></tr>`}</tbody>
        </table>
        ${totalRows}
        <script>
          window.onload = () => {
            document.title = ${JSON.stringify(filename)};
            setTimeout(() => window.print(), 300);
          };
        </script>
      </body>
    </html>`);
  doc.document.close();
}

export function dateRangeLabel(startDate: string, endDate: string): string {
  if (!startDate && !endDate) return 'All dates';
  if (startDate && endDate) return `${formatExportDate(startDate)} to ${formatExportDate(endDate)}`;
  if (startDate) return `From ${formatExportDate(startDate)}`;
  return `Until ${formatExportDate(endDate)}`;
}
