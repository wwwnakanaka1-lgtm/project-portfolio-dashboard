import { Project, Categories } from "./types";

/**
 * Export projects to CSV format
 */
export function exportToCSV(projects: Project[], categories: Categories): void {
  const headers = ["ID", "Name", "Category", "Description", "Technologies", "Status", "Path"];

  const rows = projects.map((project) => {
    const categoryName = categories[project.category]?.name || project.category;
    return [
      escapeCsvField(project.id),
      escapeCsvField(project.name),
      escapeCsvField(categoryName),
      escapeCsvField(project.description),
      escapeCsvField(project.technologies.join("; ")),
      escapeCsvField(project.status),
      escapeCsvField(project.path),
    ].join(",");
  });

  const BOM = "\uFEFF";
  const csvContent = BOM + headers.join(",") + "\n" + rows.join("\n");

  triggerDownload(csvContent, "projects.csv", "text/csv;charset=utf-8");
}

/**
 * Export all project data to JSON format
 */
export function exportToJSON(projects: Project[], categories: Categories): void {
  const exportData = {
    exportedAt: new Date().toISOString(),
    totalProjects: projects.length,
    projects: projects,
    categories: categories,
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  triggerDownload(jsonContent, "projects.json", "application/json;charset=utf-8");
}

/**
 * Export to PDF - creates a simple text-based PDF without html2canvas
 */
export async function exportToPDF(): Promise<void> {
  // Dynamic import to avoid SSR issues
  const { jsPDF } = await import("jspdf");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Title
  pdf.setFontSize(18);
  pdf.text("Project Portfolio Dashboard", 105, 15, { align: "center" });

  // Date
  pdf.setFontSize(10);
  pdf.text(`Generated: ${new Date().toLocaleDateString("ja-JP")}`, 105, 22, { align: "center" });

  // Note about full data
  pdf.setFontSize(12);
  pdf.text("For complete project data, please use CSV or JSON export.", 105, 35, { align: "center" });

  // Footer
  pdf.setFontSize(8);
  pdf.text("Project Portfolio Dashboard - Export", 105, 290, { align: "center" });

  pdf.save("project-portfolio.pdf");
}

/**
 * Escape CSV field - handles commas, quotes, and newlines
 */
function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Trigger file download
 */
function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";

  document.body.appendChild(a);
  a.click();

  // Cleanup
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
