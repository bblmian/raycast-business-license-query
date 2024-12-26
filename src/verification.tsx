import { ActionPanel, Action, Form, showToast, Toast, Detail, Clipboard, open } from "@raycast/api";
import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from 'xlsx';
import { getConfig } from "./config";
import * as fs from "fs";
import * as path from "path";
import pLimit from 'p-limit';

interface FormValues {
  input: string;
  customSeparator: string;
  copyToClipboard: boolean;
  exportMd: boolean;
  exportXlsx: boolean;
  exportPath?: string[];
  dataFile?: string[];
  sheetName?: string;
  companyColumn?: string;
  regnumColumn?: string;
}

interface VerificationResult {
  company: string;
  regnum: string;
  verifyResult: boolean;
  companyMatch: boolean;
  regnumMatch: boolean;
  error?: string;
}

interface BaiduAPIResponse {
  log_id: number;
  error_code?: number;
  error_msg?: string;
  words_result?: {
    verifyresult: string;
    companymatch: string;
    regnummatch: string;
  };
}

interface CompanyPair {
  company: string;
  regnum: string;
}

export default function VerificationCommand(): React.ReactElement {
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showExportPath, setShowExportPath] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>("");
  const [customSeparator, setCustomSeparator] = useState<string>("");
  const [previewLines, setPreviewLines] = useState<CompanyPair[]>([]);
  const [showFileOptions, setShowFileOptions] = useState<boolean>(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const config = getConfig();

  // 检查API密钥配置
  useEffect(() => {
    if (!config.apiKey || !config.secretKey) {
      showToast({
        style: Toast.Style.Failure,
        title: "请先配置API密钥",
        message: "按 ⌘ + , 打开设置，填写API Key和Secret Key"
      });
      
      // 打开扩展设置
      open("raycast://extensions/zhubo/business-license-query/preferences");
    }
  }, []);

  // 监听导出选项变化
  const handleExportOptionChange = (id: string, value: boolean) => {
    if (id === "exportMd" || id === "exportXlsx") {
      setShowExportPath(value || (id === "exportMd" ? showExportPath : showExportPath));
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 解析输入文本
  const parseInput = (input: string): CompanyPair[] => {
    if (!input) return [];
    
    const lines = input.split(/\n/).filter(line => line.trim());
    return lines.map(line => {
      const [company, regnum] = line.split(/\t/).map(item => item.trim());
      return { company, regnum };
    });
  };

  // 解析Excel文件
  const parseExcelFile = async (filePath: string, sheetName: string, companyCol: string, regnumCol: string): Promise<CompanyPair[]> => {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
    
    return data.map(row => ({
      company: String(row[companyCol] || ''),
      regnum: String(row[regnumCol] || '')
    }));
  };

  // 更新预览
  useEffect(() => {
    const pairs = parseInput(inputText);
    setPreviewLines(pairs.slice(0, 5));
    setShowFileOptions(pairs.length > 100);
  }, [inputText]);

  // 处理文件选择
  const handleFileSelect = async (paths: string[]) => {
    if (paths.length > 0) {
      const workbook = XLSX.readFile(paths[0]);
      setAvailableSheets(workbook.SheetNames);
    }
  };

  async function getAccessToken(): Promise<string> {
    const url = "https://aip.baidubce.com/oauth/2.0/token";
    const params = {
      grant_type: "client_credentials",
      client_id: config.apiKey,
      client_secret: config.secretKey
    };
    
    try {
      const response = await axios.post(url, null, { params });
      return response.data.access_token;
    } catch (error) {
      console.error("获取token失败:", error);
      throw error;
    }
  }

  async function verifyCompanyInfo(company: string, regnum: string): Promise<VerificationResult> {
    const accessToken = await getAccessToken();
    const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/two_factors_verification?access_token=${accessToken}`;
    
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    };

    const data = new URLSearchParams();
    data.append('company', company);
    data.append('regnum', regnum);

    try {
      const response = await axios.post<BaiduAPIResponse>(url, data, { headers });
      
      if (response.data.error_code) {
        return {
          company,
          regnum,
          verifyResult: false,
          companyMatch: false,
          regnumMatch: false,
          error: `错误代码: ${response.data.error_code}, 错误信息: ${response.data.error_msg}`
        };
      }

      const result = response.data.words_result || {
        verifyresult: "0",
        companymatch: "0",
        regnummatch: "0"
      };
      
      return {
        company,
        regnum,
        verifyResult: result.verifyresult === "1",
        companyMatch: result.companymatch === "1",
        regnumMatch: result.regnummatch === "1"
      };
    } catch (error) {
      console.error("核验失败:", error);
      return {
        company,
        regnum,
        verifyResult: false,
        companyMatch: false,
        regnumMatch: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // 分批处理函数
  const processBatch = async (
    pairs: CompanyPair[],
    startIndex: number,
    batchSize: number,
    totalSize: number,
    limit: pLimit.Limit
  ): Promise<VerificationResult[]> => {
    const endIndex = Math.min(startIndex + batchSize, pairs.length);
    const batch = pairs.slice(startIndex, endIndex);
    
    // 显示处理进度
    showToast({
      style: Toast.Style.Animated,
      title: `批次进度: ${Math.floor((startIndex / totalSize) * 100)}%`,
      message: `处理批次 ${Math.floor(startIndex / batchSize) + 1}/${Math.ceil(totalSize / batchSize)}`
    });

    // 并发处理当前批次，确保QPS不超过10
    const promises = batch.map((pair, index) => {
      return limit(async () => {
        try {
          const result = await verifyCompanyInfo(pair.company, pair.regnum);
          // 显示单条处理进度
          showToast({
            style: Toast.Style.Animated,
            title: `总进度: ${Math.floor(((startIndex + index + 1) / totalSize) * 100)}%`,
            message: `核验: ${pair.company}`
          });
          return result;
        } catch (error) {
          console.error(`核验失败: ${pair.company}`, error);
          // 如果是请求过快的错误，等待更长时间后重试
          if (error instanceof Error && error.message.includes('请求过快')) {
            await sleep(2000); // 等待2秒后重试
            return verifyCompanyInfo(pair.company, pair.regnum);
          }
          throw error;
        }
      });
    });

    return Promise.all(promises);
  };

  function generateMarkdown(results: VerificationResult[]): string {
    return results.map(result => {
      if (result.error) {
        return `
### ${result.company}
- 统一社会信用代码: ${result.regnum}
- 核验状态: 失败
- 错误信息: ${result.error}
        `;
      }
      return `
### ${result.company}
- 统一社会信用代码: ${result.regnum}
- 核验结果: ${result.verifyResult ? '通过' : '不通过'}
- 企业名称匹配: ${result.companyMatch ? '是' : '否'}
- 注册号匹配: ${result.regnumMatch ? '是' : '否'}
      `;
    }).join('\n');
  }

  async function handleSubmit(values: FormValues): Promise<void> {
    if ((!values.input.trim() && !values.dataFile) || (values.dataFile && (!values.sheetName || !values.companyColumn || !values.regnumColumn))) {
      showToast({
        style: Toast.Style.Failure,
        title: "输入错误",
        message: "请输入企业信息或选择数据文件并指定必要的列信息"
      });
      return;
    }

    setIsLoading(true);
    try {
      let pairs: CompanyPair[];
      if (values.dataFile && values.dataFile.length > 0) {
        pairs = await parseExcelFile(
          values.dataFile[0],
          values.sheetName!,
          values.companyColumn!,
          values.regnumColumn!
        );
      } else {
        pairs = parseInput(values.input);
      }

      // 调整批处理参数，确保QPS不超过10
      const batchSize = Math.min(parseInt(config.batchSize) || 10, 10);
      const maxConcurrent = Math.min(parseInt(config.maxConcurrent) || 5, 5);
      const requestInterval = Math.max(parseInt(config.requestInterval) || 1000, 1000);
      const limit = pLimit(maxConcurrent);
      
      showToast({
        style: Toast.Style.Animated,
        title: "开始处理",
        message: `共 ${pairs.length} 条数据，每批 ${batchSize} 条，最大并发 ${maxConcurrent}`
      });

      const allResults: VerificationResult[] = [];
      
      // 分批处理
      for (let i = 0; i < pairs.length; i += batchSize) {
        const batchResults = await processBatch(
          pairs,
          i,
          batchSize,
          pairs.length,
          limit
        );
        allResults.push(...batchResults);
        
        // 批次间隔，确保不超过QPS限制
        if (i + batchSize < pairs.length) {
          await sleep(requestInterval);
        }
      }

      setResults(allResults);

      // 处理导出
      if (values.copyToClipboard) {
        const markdown = generateMarkdown(allResults);
        await Clipboard.copy(markdown);
        showToast({
          style: Toast.Style.Success,
          title: "已复制到剪贴板",
          message: "核验结果已复制为Markdown格式"
        });
      }

      if ((values.exportMd || values.exportXlsx) && values.exportPath && values.exportPath.length > 0) {
        const directory = values.exportPath[0];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        if (values.exportMd) {
          const mdPath = path.join(directory, `企业信息核验结果_${timestamp}.md`);
          const markdown = generateMarkdown(allResults);
          await exportToFile(markdown, mdPath, 'md');
        }

        if (values.exportXlsx) {
          const xlsxPath = path.join(directory, `企业信息核验结果_${timestamp}.xlsx`);
          const ws = XLSX.utils.json_to_sheet(
            allResults.map(r => ({
              '企业名称': r.company,
              '统一社会信用代码': r.regnum,
              '核验结果': r.verifyResult ? '通过' : '不通过',
              '企业名称匹配': r.companyMatch ? '是' : '否',
              '注册号匹配': r.regnumMatch ? '是' : '否',
              '错误信息': r.error || ''
            }))
          );
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "核验结果");
          const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
          await exportToFile(excelBuffer, xlsxPath, 'xlsx');
        }
      }

      showToast({
        style: Toast.Style.Success,
        title: "核验完成",
        message: `成功核验 ${allResults.length} 条记录`
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "核验失败",
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function exportToFile(content: string | Buffer, exportPath: string, type: 'md' | 'xlsx'): Promise<void> {
    try {
      const directory = path.dirname(exportPath);
      
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      
      fs.writeFileSync(exportPath, content);
      
      showToast({
        style: Toast.Style.Success,
        title: "导出成功",
        message: `文件已保存到: ${exportPath}`
      });
      
      await open(directory);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "导出失败",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="���持的输入方式"
        text="1. 文本输入：每行一对数据，企业名称和统一社会信用代码用Tab键分隔\n2. 文件导入：支持Excel文件(.xlsx)和CSV文件(.csv)"
      />
      <Form.Separator />
      
      <Form.TextArea
        id="input"
        title="文本输入"
        placeholder="请输入企业名称和统一社会信用代码，每行一对，用Tab键分隔&#10;示例：&#10;北京百度网讯科技有限公司    91110000802100433B&#10;阿里巴巴（中国）有限公司    91330100799655058B"
        value={inputText}
        onChange={setInputText}
      />
      
      <Form.Separator />
      
      <Form.FilePicker
        id="dataFile"
        title="文件导入"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        onChange={handleFileSelect}
      />
      
      {availableSheets.length > 0 && (
        <>
          <Form.Dropdown 
            id="sheetName" 
            title="工作表"
            placeholder="请选择要导入的工作表"
          >
            {availableSheets.map(sheet => (
              <Form.Dropdown.Item key={sheet} value={sheet} title={sheet} />
            ))}
          </Form.Dropdown>
          <Form.TextField
            id="companyColumn"
            title="企业名称列"
            placeholder="请输入企业名称列的标题"
          />
          <Form.TextField
            id="regnumColumn"
            title="统一社会信用代码列"
            placeholder="请输入统一社会信用代码列的标题"
          />
        </>
      )}
      
      {previewLines.length > 0 && (
        <Form.Description
          title="数据预览（前5条）"
          text={previewLines.map((pair, index) => 
            `${index + 1}. ${pair.company} - ${pair.regnum}`
          ).join('\n')}
        />
      )}
      
      <Form.Separator />
      
      <Form.Checkbox
        id="copyToClipboard"
        label="复制到剪贴板"
        defaultValue={true}
      />
      <Form.Checkbox
        id="exportMd"
        label="导出为Markdown文件"
        onChange={(value) => handleExportOptionChange("exportMd", value)}
      />
      <Form.Checkbox
        id="exportXlsx"
        label="导出为Excel文件"
        onChange={(value) => handleExportOptionChange("exportXlsx", value)}
      />
      {showExportPath && (
        <Form.FilePicker
          id="exportPath"
          title="导出目录"
          allowMultipleSelection={false}
          canChooseDirectories={true}
          canChooseFiles={false}
        />
      )}
    </Form>
  );
} 