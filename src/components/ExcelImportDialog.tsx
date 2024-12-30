import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import React, { useState, useEffect } from "react";
import ExcelJS from "exceljs";

interface FormValues {
  excelFile: string[];
  sheetName: string;
  headerRow: string;
  companyNameColumn: string;
  regNumberColumn: string;
}

export interface ImportOptions {
  filePath: string;
  sheetName: string;
  headerRow: number;
  companyNameColumn: string;
  regNumberColumn: string;
  skipEmptyRows: boolean;
  trimWhitespace: boolean;
}

interface PreviewData {
  companyName: string;
  regNumber: string;
  rowNumber: number;
}

interface ExcelImportDialogProps {
  onSubmit: (options: ImportOptions) => void;
  onCancel: () => void;
}

export function ExcelImportDialog({ onSubmit, onCancel }: ExcelImportDialogProps) {
  const [excelFile, setExcelFile] = useState<string[]>([]);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [headerRow, setHeaderRow] = useState("1");
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [companyNameColumn, setCompanyNameColumn] = useState("");
  const [regNumberColumn, setRegNumberColumn] = useState("");
  const [skipEmptyRows, setSkipEmptyRows] = useState(true);
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadExcelInfo() {
      if (excelFile.length > 0) {
        setIsLoading(true);
        try {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.readFile(excelFile[0]);
          
          // Get sheet names
          const sheets = workbook.worksheets.map(sheet => sheet.name);
          setAvailableSheets(sheets);
          setSelectedSheet(sheets[0] || "");

          // Get columns from first sheet
          if (sheets.length > 0) {
            const firstSheet = workbook.getWorksheet(sheets[0]);
            if (firstSheet) {
              const headerRowNum = parseInt(headerRow) || 1;
              const headers: string[] = [];
              firstSheet.getRow(headerRowNum).eachCell((cell) => {
                headers.push(cell.text.toString());
              });
              setAvailableColumns(headers);
              
              // Try to auto-select company name and reg number columns
              const nameCol = headers.find(h => /公司|企业|名称/i.test(h)) || "";
              const regCol = headers.find(h => /注册号|登记号|执照号/i.test(h)) || "";
              setCompanyNameColumn(nameCol);
              setRegNumberColumn(regCol);

              // Load preview data
              await updatePreview(firstSheet, headerRowNum, nameCol, regCol);
            }
          }
        } catch (error) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to read Excel file",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        } finally {
          setIsLoading(false);
        }
      }
    }
    loadExcelInfo();
  }, [excelFile, headerRow]);

  useEffect(() => {
    async function updatePreviewOnColumnChange() {
      if (excelFile.length > 0 && selectedSheet && companyNameColumn && regNumberColumn) {
        setIsLoading(true);
        try {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.readFile(excelFile[0]);
          const sheet = workbook.getWorksheet(selectedSheet);
          if (sheet) {
            const headerRowNum = parseInt(headerRow) || 1;
            await updatePreview(sheet, headerRowNum, companyNameColumn, regNumberColumn);
          }
        } catch (error) {
          console.error("Preview update error:", error);
        } finally {
          setIsLoading(false);
        }
      }
    }
    updatePreviewOnColumnChange();
  }, [selectedSheet, companyNameColumn, regNumberColumn]);

  async function updatePreview(
    sheet: ExcelJS.Worksheet, 
    headerRowNum: number, 
    nameCol: string, 
    regCol: string
  ) {
    const preview: PreviewData[] = [];
    const headerRow = sheet.getRow(headerRowNum);
    const values = headerRow.values as (string | undefined)[];
    if (!values) return;

    const nameColIndex = values.findIndex((v) => v === nameCol);
    const regColIndex = values.findIndex((v) => v === regCol);
    
    if (nameColIndex > -1 && regColIndex > -1) {
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > headerRowNum && preview.length < 5) {
          const name = row.getCell(nameColIndex).text.toString();
          const reg = row.getCell(regColIndex).text.toString();
          if (!skipEmptyRows || (name && reg)) {
            preview.push({
              companyName: trimWhitespace ? name.trim() : name,
              regNumber: trimWhitespace ? reg.trim() : reg,
              rowNumber,
            });
          }
        }
      });
    }
    
    setPreviewData(preview);
  }

  const handleSubmit = (values: FormValues) => {
    if (!values.excelFile || values.excelFile.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Import Failed",
        message: "Please select an Excel file",
      });
      return;
    }

    const headerRowNum = parseInt(headerRow);
    if (isNaN(headerRowNum) || headerRowNum < 1) {
      showToast({
        style: Toast.Style.Failure,
        title: "Import Failed",
        message: "Please enter a valid header row number",
      });
      return;
    }

    if (!companyNameColumn || !regNumberColumn) {
      showToast({
        style: Toast.Style.Failure,
        title: "Import Failed",
        message: "Please select both company name and registration number columns",
      });
      return;
    }

    onSubmit({
      filePath: values.excelFile[0],
      sheetName: selectedSheet,
      headerRow: headerRowNum,
      companyNameColumn,
      regNumberColumn,
      skipEmptyRows,
      trimWhitespace,
    });
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={onCancel} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="excelFile"
        title="Excel File"
        info="Select an Excel file (.xlsx or .xls)"
        allowMultipleSelection={false}
        value={excelFile}
        onChange={setExcelFile}
      />
      
      {availableSheets.length > 0 && (
        <Form.Dropdown
          id="sheetName"
          title="Sheet Name"
          info="Select the sheet containing your data"
          value={selectedSheet}
          onChange={setSelectedSheet}
        >
          {availableSheets.map(sheet => (
            <Form.Dropdown.Item key={sheet} value={sheet} title={sheet} />
          ))}
        </Form.Dropdown>
      )}
      
      <Form.TextField
        id="headerRow"
        title="Header Row Number"
        info="Enter the row number containing column headers"
        placeholder="e.g., 1"
        value={headerRow}
        onChange={setHeaderRow}
      />
      
      {availableColumns.length > 0 && (
        <Form.Dropdown
          id="companyNameColumn"
          title="Company Name Column"
          info="Select the column containing company names"
          value={companyNameColumn}
          onChange={setCompanyNameColumn}
        >
          {availableColumns.map(col => (
            <Form.Dropdown.Item key={col} value={col} title={col} />
          ))}
        </Form.Dropdown>
      )}
      
      {availableColumns.length > 0 && (
        <Form.Dropdown
          id="regNumberColumn"
          title="Registration Number Column"
          info="Select the column containing registration numbers"
          value={regNumberColumn}
          onChange={setRegNumberColumn}
        >
          {availableColumns.map(col => (
            <Form.Dropdown.Item key={col} value={col} title={col} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Checkbox
        id="skipEmptyRows"
        label="Skip Empty Rows"
        info="Skip rows where company name or registration number is empty"
        value={skipEmptyRows}
        onChange={setSkipEmptyRows}
      />

      <Form.Checkbox
        id="trimWhitespace"
        label="Trim Whitespace"
        info="Remove leading and trailing spaces from values"
        value={trimWhitespace}
        onChange={setTrimWhitespace}
      />

      {previewData.length > 0 && previewData.map((item, index) => (
        <Form.Description
          key={index}
          title={`Preview Row ${item.rowNumber}`}
          text={`${item.companyName} - ${item.regNumber}`}
        />
      ))}
    </Form>
  );
} 