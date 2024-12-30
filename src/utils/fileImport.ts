import * as XLSX from "xlsx";
import { readFileSync } from "fs";

export interface ImportResult {
  data: string[];
  error?: string;
}

export async function importFile(filePath: string): Promise<ImportResult> {
  try {
    const fileExt = filePath.split(".").pop()?.toLowerCase();
    
    switch (fileExt) {
      case "xlsx":
      case "xls":
        return importExcel(filePath);
      case "csv":
        return importCSV(filePath);
      case "txt":
        return importText(filePath);
      default:
        return {
          data: [],
          error: "不支持的文件格式",
        };
    }
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : "文件导入失败",
    };
  }
}

function importExcel(filePath: string): ImportResult {
  const workbook = XLSX.readFile(filePath);
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];
  
  // 过滤空行并扁平化数据
  const flatData = data
    .filter(row => row.some(cell => cell?.toString().trim()))
    .map(row => row.filter(cell => cell?.toString().trim()).join("\t"));
  
  return {
    data: flatData,
  };
}

function importCSV(filePath: string): ImportResult {
  const content = readFileSync(filePath, "utf-8");
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  
  return {
    data: lines,
  };
}

function importText(filePath: string): ImportResult {
  const content = readFileSync(filePath, "utf-8");
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  
  return {
    data: lines,
  };
} 