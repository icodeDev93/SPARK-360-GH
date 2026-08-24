import { printHtml } from '@/lib/printDocument';
import { ACTIVE_BUSINESS_KEY } from '@/lib/businessScope';

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

export type ExportBusinessDetails = {
  businessName?: string;
  legalName?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
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

export function getStoredExportBusinessDetails(): ExportBusinessDetails {
  if (typeof window === 'undefined') return {};
  const activeBusinessId = localStorage.getItem(ACTIVE_BUSINESS_KEY);
  if (!activeBusinessId) return {};

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith('bizzyapp:businesses:')) continue;
    try {
      const records = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(records)) continue;
      const match = records.find((business) => business?.id === activeBusinessId);
      if (match) {
        return {
          businessName: cleanExportText(match.businessName || match.business_name || ''),
          legalName: cleanExportText(match.legalName || match.legal_name || ''),
          address: cleanExportText(match.address || ''),
          phone: cleanExportText(match.phone || ''),
          email: cleanExportText(match.email || ''),
          logoUrl: cleanExportText(match.logoUrl || match.logo_url || ''),
        };
      }
    } catch {
      continue;
    }
  }

  return {};
}

function businessName(details: ExportBusinessDetails): string {
  return details.businessName || details.legalName || 'Selected Business';
}

function businessContactLine(details: ExportBusinessDetails): string {
  return [details.address, details.phone, details.email]
    .map(cleanExportText)
    .filter(Boolean)
    .join(' | ');
}

function businessLogoMarkup(details: ExportBusinessDetails, fallbackInitial: string): string {
  if (!details.logoUrl) return escapeHtml(fallbackInitial);
  return `<img src="${escapeHtml(details.logoUrl)}" alt="${escapeHtml(businessName(details))} logo" style="width:100%;height:100%;object-fit:contain;display:block;" />`;
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
  const business = getStoredExportBusinessDetails();
  const businessRows = [
    ['Business Name', businessName(business)],
    ...(business.legalName && business.legalName !== business.businessName ? [['Legal Name', business.legalName]] : []),
    ...(business.address ? [['Address', business.address]] : []),
    ...(business.phone ? [['Phone', business.phone]] : []),
    ...(business.email ? [['Email', business.email]] : []),
    ...(business.logoUrl ? [['Logo URL', business.logoUrl]] : []),
    ['Generated At', new Date().toLocaleString('en-GH')],
    [],
  ];
  const body = rows.map((row, rowIndex) =>
    columns.map((column) => escapeCsv(column.value(row, rowIndex))).join(',')
  );
  const footer = totals?.length
    ? ['', ...totals.map((total) => `${escapeCsv(total.label)},${escapeCsv(total.value)}`)]
    : [];
  const csv = [
    ...businessRows.map((row) => row.map(escapeCsv).join(',')),
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
  const generatedAt = new Date().toLocaleString('en-GH');
  const business = getStoredExportBusinessDetails();
  const contactLine = businessContactLine(business);
  const selectedBusinessName = businessName(business);
  const businessInitial = selectedBusinessName.charAt(0).toUpperCase() || 'B';
  const logoMarkup = businessLogoMarkup(business, businessInitial);
  const tableRows = rows.map((row, rowIndex) => `
    <tr>${columns.map((column) => `<td>${escapeHtml(column.value(row, rowIndex))}</td>`).join('')}</tr>
  `).join('');
  const totalRows = totals?.length
    ? `<div class="totals">${totals.map((total) => `<div><span>${escapeHtml(total.label)}</span><strong>${escapeHtml(total.value)}</strong></div>`).join('')}</div>`
    : '';
  printHtml(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          @page { size: A4 landscape; margin: 14mm; }
          body { font-family: Arial, sans-serif; color: #1e293b; margin: 0; background: #fff; }
          .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #4f46e5; padding-bottom: 14px; margin-bottom: 18px; }
          .brand { display: flex; align-items: center; gap: 10px; }
          .mark { width: 40px; height: 40px; border-radius: 10px; background: #fff; border: 1px solid #dbe3f0; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-weight: 800; padding: 4px; }
          h1 { font-size: 21px; margin: 0 0 4px; }
          .subtitle { color: #64748b; font-size: 12px; }
          .meta { text-align: right; color: #64748b; font-size: 11px; line-height: 1.5; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: auto; }
          th { background: #eef2ff; color: #3730a3; text-align: left; padding: 9px 8px; border: 1px solid #dbe3f0; text-transform: uppercase; font-size: 9px; letter-spacing: .04em; }
          td { padding: 8px; border: 1px solid #e2e8f0; vertical-align: top; }
          tr:nth-child(even) td { background: #f8fafc; }
          .totals { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
          .totals div { border: 1px solid #dbe3f0; border-left: 4px solid #4f46e5; border-radius: 8px; padding: 9px 12px; min-width: 170px; }
          .totals span { color: #64748b; display: block; font-size: 10px; text-transform: uppercase; }
          .totals strong { display: block; margin-top: 3px; font-size: 15px; }
          .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; color: #94a3b8; font-size: 10px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <div class="mark">${logoMarkup}</div>
            <div>
              <h1>${escapeHtml(selectedBusinessName)}</h1>
              <div class="subtitle">${contactLine ? escapeHtml(contactLine) : 'Business report'}</div>
            </div>
          </div>
          <div class="meta">
            <div><strong>${escapeHtml(title)}</strong></div>
            ${subtitle ? `<div>${escapeHtml(subtitle)}</div>` : ''}
            <div>Generated: ${escapeHtml(generatedAt)}</div>
            <div>Records: ${rows.length}</div>
          </div>
        </div>
        <table>
          <thead><tr>${columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join('')}</tr></thead>
          <tbody>${tableRows || `<tr><td colspan="${columns.length}">No records found</td></tr>`}</tbody>
        </table>
        ${totalRows}
        <div class="footer">
          <span>Confidential - Internal Use Only</span>
          <span>${escapeHtml(title)}</span>
        </div>
      </body>
    </html>`, { title: filename, windowFeatures: 'width=1100,height=820' });
}

export function dateRangeLabel(startDate: string, endDate: string): string {
  if (!startDate && !endDate) return 'All dates';
  if (startDate && endDate) return `${formatExportDate(startDate)} to ${formatExportDate(endDate)}`;
  if (startDate) return `From ${formatExportDate(startDate)}`;
  return `Until ${formatExportDate(endDate)}`;
}
