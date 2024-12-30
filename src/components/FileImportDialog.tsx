import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import React, { useState } from "react";
import * as XLSX from "xlsx";
import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

interface FileImportDialogProps {
  onImport: (data: string[]) => void;
  type: "query" | "verify";
}

interface ImportData {
  name: string;
  code?: string;
}

export const FileImportDialog: React.FC<FileImportDialogProps> = ({ onImport, type }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [filePath, setFilePath] = useState<string>("");
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedHeader, setSelectedHeader] = useState<string>("");
  const [selectedCodeHeader, setSelectedCodeHeader] = useState<string>("");
  const [preview, setPreview] = useState<string[]>([]);
  const { pop } = useNavigation();

  const handleFileSelect = async (path: string) => {
    try {
      setIsLoading(true);
      const buffer = await readFile(path);
      const workbook = XLSX.read(buffer);
      setSheets(workbook.SheetNames);
      if (workbook.SheetNames.length > 0) {
        const firstSheet = workbook.SheetNames[0];
        setSelectedSheet(firstSheet);
        const worksheet = workbook.Sheets[firstSheet];
        const headers = getWorksheetHeaders(worksheet);
        setHeaders(headers);
      }
      setFilePath(path);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "错误",
        message: "无法读取文件",
      });
      console.error("Error reading file:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getWorksheetHeaders = (worksheet: XLSX.WorkSheet): string[] => {
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
    const headers: string[] = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
      headers.push(cell?.v?.toString() || `Column ${col + 1}`);
    }
    return headers;
  };

  const updatePreview = async () => {
    if (!filePath || !selectedSheet || !selectedHeader) return;

    try {
      setIsLoading(true);
      const buffer = await readFile(filePath);
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[selectedSheet];
      const data = XLSX.utils.sheet_to_json<any>(worksheet);
      
      const previewData = data.slice(0, 5).map(row => {
        if (type === "query") {
          return row[selectedHeader];
        } else {
          return `${row[selectedHeader]} - ${row[selectedCodeHeader] || "未选择统一社会信用代码列"}`;
        }
      });
      
      setPreview(previewData);
    } catch (error) {
      console.error("Error generating preview:", error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    updatePreview();
  }, [selectedSheet, selectedHeader, selectedCodeHeader]);

  const handleImport = async () => {
    if (!filePath || !selectedSheet || !selectedHeader) {
      await showToast({
        style: Toast.Style.Failure,
        title: "错误",
        message: "请选择文件、工作表和列",
      });
      return;
    }

    try {
      setIsLoading(true);
      const buffer = await readFile(filePath);
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[selectedSheet];
      const data = XLSX.utils.sheet_to_json<any>(worksheet);
      
      const importedData = data.map(row => {
        if (type === "query") {
          return row[selectedHeader];
        } else {
          return `${row[selectedHeader]}\t${row[selectedCodeHeader]}`;
        }
      });

      onImport(importedData);
      await showToast({
        style: Toast.Style.Success,
        title: "导入成功",
        message: `已导入 ${importedData.length} 条数据`,
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "错误",
        message: "导入失败",
      });
      console.error("Error importing data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="导入" onSubmit={handleImport} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="选择文件"
        text={`请输入 Excel 文件的完整路径。

提示：
1. 您可以将文件拖放到此处
2. 或者复制文件路径后粘贴
3. 支持的格式：.xlsx, .xls
4. 文件的第一行应该是列标题`}
      />

      <Form.TextField
        id="file"
        title="文件路径"
        value={filePath}
        placeholder="/Users/您的用户名/Downloads/example.xlsx"
        onChange={async (path) => {
          setFilePath(path);
          if (path.endsWith(".xlsx") || path.endsWith(".xls")) {
            await handleFileSelect(path);
          }
        }}
      />

      {sheets.length > 0 && (
        <Form.Dropdown
          id="sheet"
          title="工作表"
          value={selectedSheet}
          onChange={setSelectedSheet}
        >
          {sheets.map((sheet) => (
            <Form.Dropdown.Item
              key={sheet}
              value={sheet}
              title={sheet}
            />
          ))}
        </Form.Dropdown>
      )}

      {headers.length > 0 && (
        <>
          <Form.Dropdown
            id="nameHeader"
            title="企业名称列"
            value={selectedHeader}
            onChange={setSelectedHeader}
          >
            {headers.map((header) => (
              <Form.Dropdown.Item
                key={header}
                value={header}
                title={header}
              />
            ))}
          </Form.Dropdown>

          {type === "verify" && (
            <Form.Dropdown
              id="codeHeader"
              title="统一社会信用代码列"
              value={selectedCodeHeader}
              onChange={setSelectedCodeHeader}
            >
              {headers.map((header) => (
                <Form.Dropdown.Item
                  key={header}
                  value={header}
                  title={header}
                />
              ))}
            </Form.Dropdown>
          )}
        </>
      )}

      {preview.length > 0 && (
        <Form.Description
          title="预览（前5条）"
          text={preview.map((item, index) => `${index + 1}. ${item}`).join("\n")}
        />
      )}
    </Form>
  );
}; 