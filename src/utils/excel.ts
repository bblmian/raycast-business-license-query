import ExcelJS from "exceljs";
import { showToast, Toast } from "@raycast/api";
import { BusinessLicenseResponse } from "../api/baidu";
import fs from "fs/promises";
import path from "path";

export interface ExcelImportResult {
  companyNames: string[];
  regNumbers: string[];
}

export async function importFromExcel(
  filePath: string,
  options: {
    sheetName: string;
    headerRow: number;
    companyNameColumn: string;
    regNumberColumn: string;
    skipEmptyRows: boolean;
    trimWhitespace: boolean;
  }
): Promise<ExcelImportResult> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const sheet = workbook.getWorksheet(options.sheetName);
    if (!sheet) {
      throw new Error(`Sheet "${options.sheetName}" not found`);
    }

    const headerRow = sheet.getRow(options.headerRow);
    const values = headerRow.values as (string | undefined)[];
    if (!values) {
      throw new Error("Header row is empty");
    }

    const nameColIndex = values.findIndex((v) => v === options.companyNameColumn);
    const regColIndex = values.findIndex((v) => v === options.regNumberColumn);
    
    if (nameColIndex === -1 || regColIndex === -1) {
      throw new Error("Could not find specified columns");
    }

    const companyNames: string[] = [];
    const regNumbers: string[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > options.headerRow) {
        const name = row.getCell(nameColIndex).text.toString();
        const reg = row.getCell(regColIndex).text.toString();
        
        const processedName = options.trimWhitespace ? name.trim() : name;
        const processedReg = options.trimWhitespace ? reg.trim() : reg;

        if (!options.skipEmptyRows || (processedName && processedReg)) {
          companyNames.push(processedName);
          regNumbers.push(processedReg);
        }
      }
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Import Successful",
      message: `Imported ${companyNames.length} records`,
    });

    return { companyNames, regNumbers };
  } catch (error) {
    console.error("Excel import error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Import Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function exportToExcel(
  data: BusinessLicenseResponse[],
  filePath: string,
  includeRawData = false
): Promise<void> {
  try {
    console.log("Starting Excel export...");
    console.log("File path:", filePath);
    console.log("Include raw data:", includeRawData);
    console.log("Number of records:", data.length);

    // Validate input data
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error("Invalid or empty data provided for export");
    }

    // Validate file path
    if (!filePath) {
      throw new Error("No file path provided for export");
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Business Information");

    console.log("Setting up columns...");
    // Set headers
    worksheet.columns = [
      { header: "Company Name", key: "name", width: 30 },
      { header: "Registration Number", key: "regNumber", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Type", key: "type", width: 20 },
      { header: "Legal Representative", key: "legalPerson", width: 15 },
      { header: "Establishment Date", key: "establishDate", width: 15 },
      { header: "Registered Capital", key: "regCapital", width: 15 },
      { header: "Address", key: "address", width: 40 },
      { header: "Business Scope", key: "businessScope", width: 50 },
      { header: "Province", key: "province", width: 15 },
      { header: "City", key: "city", width: 15 },
      { header: "District", key: "district", width: 15 },
      { header: "Licensed Business Scope", key: "licensedBusinessScope", width: 50 },
    ];

    console.log("Adding data rows...");
    let successfulRows = 0;
    let failedRows = 0;

    // Add data
    for (const [index, item] of data.entries()) {
      try {
        if (!item || typeof item !== 'object') {
          console.error(`Invalid data item at index ${index}:`, item);
          failedRows++;
          continue;
        }

        worksheet.addRow({
          name: item.name || "",
          regNumber: item.regNumber || "",
          status: item.status || "",
          type: item.type || "",
          legalPerson: item.legalPerson || "",
          establishDate: item.establishDate || "",
          regCapital: item.regCapital || "",
          address: item.address || "",
          businessScope: item.businessScope || "",
          province: item.province || "",
          city: item.city || "",
          district: item.district || "",
          licensedBusinessScope: item.licensedBusinessScope || "",
        });
        successfulRows++;
      } catch (rowError) {
        console.error(`Error adding row ${index}:`, rowError);
        console.error("Row data:", item);
        failedRows++;
      }
    }

    // Add raw data sheet if needed
    if (includeRawData) {
      console.log("Adding raw data sheet...");
      const rawDataSheet = workbook.addWorksheet("Raw Data");
      rawDataSheet.columns = [
        { header: "Company Name", key: "name", width: 30 },
        { header: "Raw Data", key: "rawData", width: 100 },
      ];

      for (const [index, item] of data.entries()) {
        try {
          rawDataSheet.addRow({
            name: item.name || "",
            rawData: JSON.stringify(item),
          });
        } catch (rowError) {
          console.error(`Error adding raw data row ${index}:`, rowError);
          console.error("Row data:", item);
        }
      }
    }

    console.log("Writing Excel file...");
    await workbook.xlsx.writeFile(filePath);
    console.log("Excel file written successfully");

    const message = failedRows > 0 
      ? `Exported ${successfulRows} records (${failedRows} failed)`
      : `Exported ${successfulRows} records`;

    await showToast({
      style: Toast.Style.Success,
      title: "Excel Export Successful",
      message,
    });
  } catch (error) {
    console.error("Excel export error details:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
      console.error("Error message:", error.message);
    }
    await showToast({
      style: Toast.Style.Failure,
      title: "Excel Export Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
} 