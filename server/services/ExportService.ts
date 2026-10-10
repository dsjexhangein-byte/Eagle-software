/**
 * Export Service
 * Produces secure CSV exports with formula injection mitigation
 * (preventing DDE/CSV injection when opening in Microsoft Excel or Google Sheets)
 */
export class ExportService {
  /**
   * Escape cell value for CSV and neutralize spreadsheet formula triggers
   */
  public static sanitizeCell(val: unknown): string {
    if (val === null || val === undefined) return '""';
    let str = String(val).trim();

    // Neutralize formula injection characters: =, +, -, @, \t, \r
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }

    // Escape quotes
    return `"${str.replace(/"/g, '""')}"`;
  }

  /**
   * Convert array of objects to CSV string
   */
  public static toCsv(rows: Record<string, unknown>[], headers: { key: string; label: string }[]): string {
    const headerLine = headers.map((h) => this.sanitizeCell(h.label)).join(',');
    const dataLines = rows.map((row) =>
      headers.map((h) => this.sanitizeCell(row[h.key])).join(',')
    );

    return [headerLine, ...dataLines].join('\n');
  }
}
