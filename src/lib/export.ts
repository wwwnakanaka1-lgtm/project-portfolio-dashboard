import { Project, Categories } from "./types";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Export projects to CSV format
 * Columns: ID, Name, Category, Description, Technologies, Status
 */
export function exportToCSV(projects: Project[], categories: Categories): void {
  const headers = ["ID", "Name", "Category", "Description", "Technologies", "Status"];

  const rows = projects.map((project) => {
    const categoryName = categories[project.category]?.name || project.category;
    return [
      project.id,
      project.name,
      categoryName,
      // Escape quotes and handle commas in description
      `"${project.description.replace(/"/g, '""')}"`,
      `"${project.technologies.join(", ")}"`,
      project.status,
    ];
  });

  // Add BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF";
  const csvContent = BOM + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  downloadFile(csvContent, "projects.csv", "text/csv;charset=utf-8");
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
  downloadFile(jsonContent, "projects.json", "application/json");
}

/**
 * Export current view to PDF using html2canvas and jspdf
 */
export async function exportToPDF(elementId: string = "main-content"): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  try {
    // Create canvas from the element
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");

    // Calculate PDF dimensions (A4 size)
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Calculate image dimensions to fit the page
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

    const finalWidth = imgWidth * ratio;
    const finalHeight = imgHeight * ratio;

    // Center the image
    const x = (pdfWidth - finalWidth) / 2;
    const y = 10; // Small margin from top

    // Add title
    pdf.setFontSize(16);
    pdf.text("Project Portfolio Dashboard", pdfWidth / 2, 8, { align: "center" });

    // Add the image
    pdf.addImage(imgData, "PNG", x, y + 5, finalWidth, finalHeight - 10);

    // Add footer with date
    pdf.setFontSize(8);
    pdf.text(
      `Generated: ${new Date().toLocaleDateString("ja-JP")}`,
      pdfWidth / 2,
      pdfHeight - 5,
      { align: "center" }
    );

    pdf.save("project-portfolio.pdf");
  } catch (error) {
    console.error("PDF export failed:", error);
    throw error;
  }
}

/**
 * Helper function to trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
