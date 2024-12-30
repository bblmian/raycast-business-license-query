import { Form, ActionPanel, Action, showToast, Toast, Clipboard, useNavigation, Icon, Color, Image } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { ProgressBar } from "../components/ProgressBar";
import { queryBusinessInfo } from "../api/baidu";
import { exportData } from "../utils/export";
import { DirectoryPicker } from "../components/DirectoryPicker";
import { ExcelImportDialog, ImportOptions } from "../components/ExcelImportDialog";
import { importFromExcel } from "../utils/excel";
import path from "path";

interface FormState {
  input: string;
  separator: string;
  exportFormats: string[];
  copyToClipboard: boolean;
  exportDirectory: string;
}

export default function QueryView() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<string[]>([]);
  const [exportDirectory, setExportDirectory] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [separatorValue, setSeparatorValue] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const { pop } = useNavigation();

  // 监听导出条件变化
  useEffect(() => {
    const handleExport = async () => {
      if (queryResults.length > 0 && selectedFormats.length > 0 && exportDirectory) {
        try {
          setIsLoading(true);
          console.log("Auto export triggered");
          console.log("Selected formats:", selectedFormats);
          console.log("Export directory:", exportDirectory);
          console.log("Query results:", queryResults);

          if (!exportDirectory.trim()) {
            throw new Error("Invalid export directory");
          }

          const directory = path.isAbsolute(exportDirectory) 
            ? exportDirectory.trim()
            : path.resolve(process.cwd(), exportDirectory.trim());

          const exportOptions = {
            formats: selectedFormats,
            includeRawData: false,
            compress: false,
            directory
          };

          console.log("Final export options:", exportOptions);
          await exportData(queryResults, exportOptions);
        } catch (error) {
          console.error("Export error details:", error);
          if (error instanceof Error) {
            console.error("Error stack:", error.stack);
          }
          await showToast({
            style: Toast.Style.Failure,
            title: "Export Failed",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleExport();
  }, [queryResults, selectedFormats, exportDirectory]);

  const updatePreview = (input: string, separator: string) => {
    if (!input.trim()) {
      setPreviewData([]);
      return;
    }

    const defaultSeparators = [
      ",",  // 英文逗号
      "，", // 中文逗号
      "\n", // 换行符
      "、", // 顿号
      "|",  // 竖线
      "/",  // 正斜杠
      "\\", // 反斜杠
      ";",  // 英文分号
      "；", // 中文分号
      "#",  // 井号
    ];

    const separators = separator ? separator.split(/\s+/) : defaultSeparators;
    const pattern = new RegExp(separators.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
    const items = input.split(pattern).filter(Boolean).map(item => item.trim());
    
    setPreviewData(items.slice(0, 5));
  };

  const handleSubmit = async (values: FormState) => {
    try {
      if (!values.input || !values.input.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Query Failed",
          message: "Please enter company names",
        });
        return;
      }

      if (selectedFormats.length > 0 && !exportDirectory) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Query Failed",
          message: "Please select an export directory",
        });
        return;
      }

      setIsLoading(true);
      setProgress(0);
      
      const separators = values.separator ? values.separator.split(/\s+/) : [",", "，", "\n"];
      const pattern = new RegExp(separators.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
      const companies = values.input.split(pattern).filter(Boolean);
      
      if (companies.length === 0) {
        throw new Error("No valid company names found");
      }

      setTotal(companies.length);
      
      const results = [];
      for (let i = 0; i < companies.length; i++) {
        const company = companies[i].trim();
        const result = await queryBusinessInfo(company);
        results.push(result);
        setProgress(i + 1);
      }
      
      setQueryResults(results);
      if (values.copyToClipboard) {
        const formattedResults = results.map(result => {
          return `公司名称: ${result.name}\n` +
                 `公司类型: ${result.type}\n` +
                 `法定代表人: ${result.legalPerson}\n` +
                 `注册资金: ${result.regCapital}\n` +
                 `成立日期: ${result.establishDate}\n` +
                 `经营状态: ${result.status}\n` +
                 `注册号: ${result.regNumber}\n` +
                 `企业地址: ${result.address}\n` +
                 `经营范围: ${result.businessScope}\n` +
                 '----------------------------------------';
        }).join('\n\n');

        await Clipboard.copy(formattedResults);
        await showToast({
          style: Toast.Style.Success,
          title: "Copied to Clipboard",
          message: "Query results have been copied to clipboard",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Query Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (options: ImportOptions) => {
    setIsImporting(true);
    try {
      const result = await importFromExcel(options.filePath, options);
      // TODO: Use the imported data (result.companyNames and result.regNumbers)
      pop();
    } catch (error) {
      // Error is already handled in importFromExcel
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm 
            title={isLoading ? `Query (${Math.round((progress / total) * 100)}%)` : "Query"}
            icon={Icon.MagnifyingGlass}
            onSubmit={(values: FormState) => {
              handleSubmit({
                ...values,
                exportDirectory
              });
            }} 
          />
          {queryResults.length > 0 && (
            <Action.CopyToClipboard
              title="Copy Results"
              icon={Icon.Clipboard}
              content={JSON.stringify(queryResults, null, 2)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          <Action.Push
            title="Import from Excel"
            icon={Icon.Document}
            target={<ExcelImportDialog onSubmit={handleImport} onCancel={pop} />}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Supported separators: \n (newline), , (English comma), ， (Chinese comma), 、 (Chinese enumeration comma), / (forward slash), \\ (backslash), | (vertical bar), ; (semicolon), ； (Chinese semicolon), # (hash)" />
      
      <Form.TextArea
        id="input"
        title="Company Names"
        placeholder="Enter company names, separated by commas or new lines"
        value={inputValue}
        onChange={(value) => {
          setInputValue(value);
          updatePreview(value, separatorValue);
        }}
      />
      
      {previewData.length > 0 && (
        <Form.Description
          title="Preview (First 5 items)"
          text={previewData.map((item, index) => `${index + 1}. ${item}`).join('\n')}
        />
      )}
      
      <Form.TextField
        id="separator"
        title="Custom Separators"
        placeholder="Enter custom separators, space separated (e.g. @ $ +)"
        info="Leave empty to use default separators"
        value={separatorValue}
        onChange={(value) => {
          setSeparatorValue(value);
          updatePreview(inputValue, value);
        }}
      />
      
      <Form.Separator />
      
      <Form.Description
        title="Export Formats"
        text="Select one or more formats to export the results"
      />
      
      <Form.Checkbox
        id="markdown"
        label="Markdown"
        info="Generate a readable markdown file"
        value={selectedFormats.includes("markdown")}
        onChange={(value) => {
          if (value) {
            setSelectedFormats([...selectedFormats, "markdown"]);
          } else {
            setSelectedFormats(selectedFormats.filter(f => f !== "markdown"));
          }
        }}
      />
      
      <Form.Checkbox
        id="excel"
        label="Excel"
        info="Generate an Excel spreadsheet"
        value={selectedFormats.includes("excel")}
        onChange={(value) => {
          if (value) {
            setSelectedFormats([...selectedFormats, "excel"]);
          } else {
            setSelectedFormats(selectedFormats.filter(f => f !== "excel"));
          }
        }}
      />
      
      <DirectoryPicker
        id="exportDirectory"
        title="Export Directory"
        value={exportDirectory}
        onChange={setExportDirectory}
      />
      
      {isLoading && (
        <Form.Description
          title="Progress"
          text={`Processing ${progress} of ${total} companies...`}
        />
      )}
    </Form>
  );
} 