import * as XLSX from "xlsx";

export interface ExportData {
  headers: string[];
  rows: (string | number | boolean | null)[][];
  fileName: string;
  sheetName?: string;
}

export function exportToExcel(data: ExportData): void {
  const { headers, rows, fileName, sheetName = "Dados" } = data;

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths
  const colWidths = headers.map((header, i) => {
    const maxWidth = Math.max(
      header.length,
      ...rows.map(row => String(row[i] || "").length)
    );
    return { wch: Math.min(maxWidth + 2, 50) };
  });
  worksheet["!cols"] = colWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate and download
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

export function exportFlowsToExcel(flows: any[]): void {
  const headers = [
    "ID",
    "Nome",
    "Descrição",
    "Status",
    "Execuções",
    "Taxa Sucesso",
    "Última Execução",
    "Criado Em",
  ];

  const rows = flows.map(flow => [
    flow.id,
    flow.name,
    flow.description || "",
    flow.isActive ? "Ativo" : "Inativo",
    flow.executionCount || 0,
    flow.successRate ? `${flow.successRate}%` : "N/A",
    flow.lastExecution ? new Date(flow.lastExecution).toLocaleDateString("pt-BR") : "Nunca",
    new Date(flow.createdAt).toLocaleDateString("pt-BR"),
  ]);

  exportToExcel({
    headers,
    rows,
    fileName: `fluxos-automacao-${new Date().toISOString().split("T")[0]}`,
    sheetName: "Fluxos",
  });
}

export function exportExecutionsToExcel(executions: any[]): void {
  const headers = [
    "ID",
    "Fluxo",
    "Status",
    "Trigger",
    "Duração (s)",
    "Iniciado Em",
    "Finalizado Em",
    "Erro",
  ];

  const rows = executions.map(exec => [
    exec.id,
    exec.flowName || exec.flowId,
    exec.status,
    exec.trigger || "Manual",
    exec.duration ? Math.round(exec.duration / 1000) : "N/A",
    new Date(exec.startedAt).toLocaleString("pt-BR"),
    exec.finishedAt ? new Date(exec.finishedAt).toLocaleString("pt-BR") : "Em andamento",
    exec.error || "",
  ]);

  exportToExcel({
    headers,
    rows,
    fileName: `execucoes-${new Date().toISOString().split("T")[0]}`,
    sheetName: "Execuções",
  });
}
