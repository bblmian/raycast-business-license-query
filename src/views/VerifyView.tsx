import { Form, ActionPanel, Action, showToast, Toast, Clipboard, Icon } from "@raycast/api";
import React, { useState } from "react";
import { ExportDialog, ExportOptions } from "../components/ExportDialog";
import { ProgressBar } from "../components/ProgressBar";
import { verifyTwoFactors } from "../api/baidu";
import { exportData } from "../utils/export";
import { DirectoryPicker } from "../components/DirectoryPicker";

interface FormState {
  company: string;
  regnum: string;
  separator: string;
  exportFormats: string[];
  copyToClipboard: boolean;
  exportDirectory: string;
}

export default function VerifyView() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [showExport, setShowExport] = useState(false);
  const [verifyResults, setVerifyResults] = useState<any[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<Array<{company: string; regnum: string}>>([]);
  const [exportDirectory, setExportDirectory] = useState("");
  const [companyValue, setCompanyValue] = useState("");
  const [regnumValue, setRegnumValue] = useState("");
  const [separatorValue, setSeparatorValue] = useState("");

  const updatePreview = (company: string, regnum: string, separator: string) => {
    if (!company.trim() || !regnum.trim()) {
      setPreviewData([]);
      return;
    }

    const separators = separator ? separator.split(/\s+/) : [",", "，", "\n"];
    const pattern = new RegExp(separators.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
    const companies = company.split(pattern).filter(Boolean).map(item => item.trim());
    const regnums = regnum.split(pattern).filter(Boolean).map(item => item.trim());
    
    const pairs = companies.map((comp, index) => ({
      company: comp,
      regnum: regnums[index] || "Missing registration number"
    })).slice(0, 5);
    
    setPreviewData(pairs);
  };

  const handleSubmit = async (values: FormState) => {
    try {
      if (!values.company || !values.regnum) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Verification Failed",
          message: "Please enter both company names and registration numbers",
        });
        return;
      }

      if (selectedFormats.length > 0 && !values.exportDirectory) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Verification Failed",
          message: "Please select an export directory",
        });
        return;
      }

      setIsLoading(true);
      setProgress(0);
      
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

      const separators = values.separator ? values.separator.split(/\s+/) : defaultSeparators;
      const pattern = new RegExp(separators.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
      const companies = values.company.split(pattern).filter(Boolean);
      const regnums = values.regnum.split(pattern).filter(Boolean);
      
      if (companies.length !== regnums.length) {
        throw new Error("Number of companies and registration numbers do not match");
      }
      
      setTotal(companies.length);
      
      const results = [];
      for (let i = 0; i < companies.length; i++) {
        const company = companies[i].trim();
        const regnum = regnums[i].trim();
        const result = await verifyTwoFactors(company, regnum);
        results.push(result);
        setProgress(i + 1);
      }
      
      setVerifyResults(results);
      if (values.copyToClipboard) {
        const formattedResults = results.map(result => {
          return `公司名称: ${result.company}\n` +
                 `注册号: ${result.regnum}\n` +
                 `验证结果: ${result.verifyResult.status}\n` +
                 `名称匹配: ${result.verifyResult.nameMatch ? "是" : "否"}\n` +
                 `注册号匹配: ${result.verifyResult.codeMatch ? "是" : "否"}\n` +
                 '----------------------------------------';
        }).join('\n\n');

        await Clipboard.copy(formattedResults);
        await showToast({
          style: Toast.Style.Success,
          title: "Copied to Clipboard",
          message: "Verification results have been copied to clipboard",
        });
      }
      
      if (selectedFormats.length > 0) {
        setSelectedFormats(values.exportFormats);
        setExportDirectory(values.exportDirectory);
        setShowExport(true);
      }
      
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Verification Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (options: ExportOptions) => {
    try {
      if (!verifyResults || verifyResults.length === 0) {
        throw new Error("No results to export");
      }

      setIsLoading(true);
      console.log("Export options:", options);
      console.log("Verify results:", verifyResults);
      
      if (!exportDirectory) {
        throw new Error("Please select an export directory");
      }

      const exportOptions = {
        formats: selectedFormats,
        includeRawData: options.includeRawData,
        compress: options.compress,
        directory: exportDirectory
      };

      console.log("Final export options:", exportOptions);
      await exportData(verifyResults, exportOptions);
      
      setShowExport(false);
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
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm 
            title={isLoading ? `Verify (${Math.round((progress / total) * 100)}%)` : "Verify"}
            icon={Icon.CheckCircle}
            onSubmit={handleSubmit} 
          />
          {verifyResults.length > 0 && (
            <>
              <Action.CopyToClipboard
                title="Copy Results"
                icon={Icon.Clipboard}
                content={JSON.stringify(verifyResults, null, 2)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              {showExport && (
                <Action.Push
                  title="Export Options"
                  icon={Icon.Download}
                  target={
                    <ExportDialog
                      onSubmit={handleExport}
                      onCancel={() => setShowExport(false)}
                      initialDirectory={exportDirectory}
                      initialFormats={selectedFormats}
                    />
                  }
                />
              )}
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.Description text="Supported separators: \n (newline), , (English comma), ， (Chinese comma), 、 (Chinese enumeration comma), / (forward slash), \\ (backslash), | (vertical bar), ; (semicolon), ； (Chinese semicolon), # (hash)" />
      
      <Form.TextArea
        id="company"
        title="Company Names"
        placeholder="Enter company names, separated by commas or new lines"
        value={companyValue}
        onChange={(value) => {
          setCompanyValue(value);
          updatePreview(value, regnumValue, separatorValue);
        }}
      />
      
      <Form.TextArea
        id="regnum"
        title="Registration Numbers"
        placeholder="Enter registration numbers, separated by commas or new lines, must match company names"
        value={regnumValue}
        onChange={(value) => {
          setRegnumValue(value);
          updatePreview(companyValue, value, separatorValue);
        }}
      />
      
      {previewData.length > 0 && (
        <Form.Description
          title="Preview (First 5 pairs)"
          text={previewData.map((pair, index) => 
            `${index + 1}. ${pair.company} - ${pair.regnum}`
          ).join('\n')}
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
          updatePreview(companyValue, regnumValue, value);
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
      
      <Form.Separator />
      
      <DirectoryPicker
        id="exportDirectory"
        title="Export Directory"
        value={exportDirectory}
        onChange={setExportDirectory}
      />
      
      <Form.Checkbox
        id="copyToClipboard"
        label="Copy to Clipboard"
        defaultValue={true}
      />
      
      {isLoading && progress > 0 && (
        <Form.Description
          title={`Verifying... ${progress}/${total}`}
          text={`Progress: ${Math.round((progress / total) * 100)}%`}
        />
      )}
    </Form>
  );
} 