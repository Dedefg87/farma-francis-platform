/**
 * Utilit ários para exportação de dados em múltiplos formatos
 * Suporta CSV, Excel e PDF
 */

interface ExportColumn {
  key: string;
  label: string;
  format?: (value: unknown) => string;
}

interface ExportOptions {
  filename: string;
  columns: ExportColumn[];
  data: unknown[];
  title?: string;
  subtitle?: string;
}

/**
 * Exporta dados para CSV
 */
export function exportToCSV(options: ExportOptions): void {
  const { filename, columns, data } = options;

  // Criar cabeçalho
  const headers = columns.map(col => col.label).join(',');

  // Criar linhas de dados
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col.key];
      const formatted = col.format ? col.format(value) : value;
      // Escapar vírgulas e aspas
      const escaped = String(formatted).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');
  });

  // Combinar tudo
  const csv = [headers, ...rows].join('\n');

  // Criar blob e download
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Exporta dados para Excel (formato CSV compatível)
 * Para Excel real, seria necessário usar biblioteca como xlsx
 */
export function exportToExcel(options: ExportOptions): void {
  // Por enquanto, usa CSV que Excel consegue abrir
  // TODO: Implementar geração real de .xlsx com biblioteca
  const { filename, ...rest } = options;
  exportToCSV({ ...rest, filename: filename.replace('.xlsx', '') });
}

/**
 * Exporta dados para PDF
 */
export async function exportToPDF(options: ExportOptions): Promise<void> {
  const { filename, columns, data, title, subtitle } = options;

  // Criar HTML para o PDF
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          color: #333;
        }
        h1 {
          color: #1e40af;
          margin-bottom: 5px;
        }
        h2 {
          color: #64748b;
          font-size: 14px;
          font-weight: normal;
          margin-top: 0;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th {
          background-color: #f1f5f9;
          padding: 12px;
          text-align: left;
          border-bottom: 2px solid #cbd5e1;
          font-weight: 600;
        }
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        tr:hover {
          background-color: #f8fafc;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      ${title ? `<h1>${title}</h1>` : ''}
      ${subtitle ? `<h2>${subtitle}</h2>` : ''}
      <table>
        <thead>
          <tr>
            ${columns.map(col => `<th>${col.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              ${columns.map(col => {
                const value = item[col.key];
                const formatted = col.format ? col.format(value) : value;
                return `<td>${formatted}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">
        Gerado em ${new Date().toLocaleString('pt-BR')} - Farma Francis Platform
      </div>
    </body>
    </html>
  `;

  // Abrir em nova janela para impressão/salvar como PDF
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Aguardar carregamento e abrir diálogo de impressão
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

/**
 * Helper para download de blob
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formata número com 2 casas decimais
 */
export function formatNumber(value: number): string {
  return value.toFixed(2);
}

/**
 * Formata porcentagem
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Formata data
 */
export function formatDate(date: Date | string): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

/**
 * Formata data e hora
 */
export function formatDateTime(date: Date | string): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR');
}
