import { showToast, Toast, environment, open } from "@raycast/api";
import path from "path";
import fs from "fs/promises";
import { BusinessLicenseResponse } from "../api/baidu";
import { exportToExcel } from "./excel";

export interface ExportOptions {
  formats: string[];
  includeRawData: boolean;
  compress: boolean;
  directory?: string;
}

async function checkDirectoryAccess(directory: string): Promise<boolean> {
  try {
    await fs.access(directory, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export async function exportData(
  data: BusinessLicenseResponse[],
  options: ExportOptions
): Promise<void> {
  try {
    console.log("Starting export with options:", options);
    console.log("Number of records to export:", data.length);

    if (!data || data.length === 0) {
      throw new Error("No data to export");
    }

    const timestamp = new Date().toISOString().split("T")[0];
    const exportDir = options.directory || path.join(environment.supportPath, "exports");
    
    console.log("Export directory:", exportDir);
    
    // Check directory access
    const hasAccess = await checkDirectoryAccess(exportDir);
    if (!hasAccess) {
      console.log("No write access to directory, attempting to create");
      try {
        await fs.mkdir(exportDir, { recursive: true, mode: 0o755 });
      } catch (error) {
        console.error("Failed to create directory:", error);
        throw new Error(`无法创建或访问导出目录: ${exportDir}`);
      }
    }
    
    console.log("Export directory created/verified");
    
    // Export Markdown
    if (options.formats.includes("markdown")) {
      console.log("Exporting Markdown...");
      const markdownPath = path.join(exportDir, `business_info_${timestamp}.md`);
      console.log("Markdown path:", markdownPath);
      const markdown = generateMarkdown(data, options.includeRawData);
      try {
        await fs.writeFile(markdownPath, markdown, "utf-8");
        console.log("Markdown file written successfully");
      } catch (error: any) {
        console.error("Failed to write markdown file:", error);
        throw new Error(`无法写入 Markdown 文件: ${error?.message || '未知错误'}`);
      }
    }

    // Export Excel
    if (options.formats.includes("excel")) {
      console.log("Exporting Excel...");
      const excelPath = path.join(exportDir, `business_info_${timestamp}.xlsx`);
      console.log("Excel path:", excelPath);
      try {
        await exportToExcel(data, excelPath, options.includeRawData);
        console.log("Excel file written successfully");
      } catch (error: any) {
        console.error("Failed to write Excel file:", error);
        throw new Error(`无法写入 Excel 文件: ${error?.message || '未知错误'}`);
      }
    }

    // Verify files were created
    const files = await fs.readdir(exportDir);
    console.log("Files in export directory:", files);

    if (files.length === 0) {
      throw new Error("No files were created during export");
    }

    // Auto open export directory
    await open(exportDir);

    await showToast({
      style: Toast.Style.Success,
      title: "Export Successful",
      message: `Files saved to ${exportDir}`,
    });
  } catch (error) {
    console.error("Export error details:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
      console.error("Error message:", error.message);
    }
    await showToast({
      style: Toast.Style.Failure,
      title: "Export Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export function generateMarkdown(
  data: BusinessLicenseResponse[],
  includeRawData: boolean
): string {
  let markdown = "# Business Information Query Results\n\n";
  markdown += `Query Time: ${new Date().toLocaleString()}\n\n`;
  markdown += `Total Records: ${data.length}\n\n`;

  data.forEach((item, index) => {
    markdown += `## ${index + 1}. ${item.name}\n\n`;
    markdown += "| Field | Content |\n";
    markdown += "|-------|---------||\n";
    markdown += `| Registration Number | ${item.regNumber} |\n`;
    markdown += `| Status | ${item.status} |\n`;
    markdown += `| Type | ${item.type} |\n`;
    markdown += `| Legal Representative | ${item.legalPerson} |\n`;
    markdown += `| Establishment Date | ${item.establishDate} |\n`;
    markdown += `| Registered Capital | ${item.regCapital} |\n`;
    markdown += `| Address | ${item.address} |\n`;
    markdown += `| Business Scope | ${item.businessScope} |\n`;
    markdown += `| Province | ${item.province} |\n`;
    markdown += `| City | ${item.city} |\n`;
    markdown += `| District | ${item.district} |\n`;
    markdown += `| Licensed Business Scope | ${item.licensedBusinessScope} |\n`;

    if (includeRawData) {
      markdown += "\n<details><summary>Raw Data</summary>\n\n";
      markdown += "```json\n";
      markdown += JSON.stringify(item, null, 2);
      markdown += "\n```\n</details>\n\n";
    }

    markdown += "\n---\n\n";
  });

  return markdown;
} 