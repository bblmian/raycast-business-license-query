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
}

interface QueryResult {
  name: string;
  regNum: string;
  address: string;
  type: string;
  legalPerson: string;
  status: string;
  capital: string;
  scope: string;
  error?: string;
}

interface BaiduAPIResponse {
  log_id: number;
  error_code?: number;
  error_msg?: string;
  words_result?: {
    companyname?: string;
    companytype?: string;
    legalperson?: string;
    capital?: string;
    companycode?: string;
    companyaddress?: string;
    businessscope?: string;
    companystatus?: string;
    creditno?: string;
  };
}

export default function QueryCommand(): React.ReactElement {
  const [results, setResults] = useState<QueryResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showExportPath, setShowExportPath] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>("");
  const [customSeparator, setCustomSeparator] = useState<string>("");
  const [previewLines, setPreviewLines] = useState<string[]>([]);
  const config = getConfig();

  const defaultSeparators = [
    { symbol: "\\n", description: "换行" },
    { symbol: ",", description: "英文逗号" },
    { symbol: "，", description: "中文逗号" },
    { symbol: "、", description: "顿号" },
    { symbol: "/", description: "正斜杠" },
    { symbol: "\\", description: "反斜杠" },
    { symbol: ";", description: "英文分号" },
    { symbol: "；", description: "中文分号" },
    { symbol: "#", description: "井号" },
    { symbol: "|", description: "竖线" }
  ];

  // 监听导出选项变化
  const handleExportOptionChange = (id: string, value: boolean) => {
    if (id === "exportMd" || id === "exportXlsx") {
      setShowExportPath(value || (id === "exportMd" ? showExportPath : showExportPath));
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 分割输入文本的函数
  const splitInput = (input: string, separator?: string): string[] => {
    if (!input) return [];
    
    let pattern: string | RegExp;
    if (separator) {
      // 如果提供了自定义分隔符，将其转换为正则表达式安全的形式
      pattern = separator.split('').map(char => {
        return char === '\\n' ? '\n' : // 处理换行符特殊情况
               /[.*+?^${}()|[\]\\]/.test(char) ? `\\${char}` : // 转义正则表达式特殊字符
               char;
      }).join('|');
    } else {
      pattern = '[,，、\n\\\/;|；#]';
    }
    
    const regex = new RegExp(pattern);
    return input.split(regex)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  };

  // 更新预览
  useEffect(() => {
    const lines = splitInput(inputText, customSeparator);
    setPreviewLines(lines.slice(0, 5));
  }, [inputText, customSeparator]);

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
      console.error("获取token��败:", error);
      throw error;
    }
  }

  async function queryBusinessInfo(keyword: string): Promise<QueryResult> {
    const accessToken = await getAccessToken();
    const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/businesslicense_verification_standard?access_token=${accessToken}`;
    
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    };

    const data = new URLSearchParams();
    data.append('verifynum', keyword);

    try {
      const response = await axios.post<BaiduAPIResponse>(url, data, { headers });
      
      if (response.data.error_code) {
        return {
          name: keyword,
          regNum: '查询失败',
          address: '',
          type: '',
          legalPerson: '',
          status: '',
          capital: '',
          scope: '',
          error: `错误代码: ${response.data.error_code}, 错误信息: ${response.data.error_msg}`
        };
      }

      const result = response.data.words_result || {};
      
      return {
        name: result.companyname || keyword,
        regNum: result.creditno || result.companycode || '未知',
        address: result.companyaddress || '未知',
        type: result.companytype || '未知',
        legalPerson: result.legalperson || '未知',
        status: result.companystatus || '未知',
        capital: result.capital || '未知',
        scope: result.businessscope || '未知'
      };
    } catch (error) {
      console.error("查询失败:", error);
      return {
        name: keyword,
        regNum: '查询失败',
        address: '',
        type: '',
        legalPerson: '',
        status: '',
        capital: '',
        scope: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  function generateMarkdown(results: QueryResult[]): string {
    return results.map(result => {
      if (result.error) {
        return `
### ${result.name}
- 查询状态: 失败
- 错误信息: ${result.error}
        `;
      }
      return `
### ${result.name}
- 统一社会信用代码/注册号: ${result.regNum}
- 地址: ${result.address}
- 企业类型: ${result.type}
- 法人代表: ${result.legalPerson}
- 经营状态: ${result.status}
- 注册资本: ${result.capital}
- 经营范围: ${result.scope}
      `;
    }).join('\n');
  }

  async function exportToFile(content: string | Buffer, exportPath: string, type: 'md' | 'xlsx'): Promise<void> {
    try {
      const directory = path.dirname(exportPath);
      
      // 确保目录存在
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

  // 分批处理函数
  const processBatch = async (
    keywords: string[],
    startIndex: number,
    batchSize: number,
    totalSize: number,
    limit: pLimit.Limit
  ): Promise<QueryResult[]> => {
    const endIndex = Math.min(startIndex + batchSize, keywords.length);
    const batch = keywords.slice(startIndex, endIndex);
    
    // 显示批次进度
    showToast({
      style: Toast.Style.Animated,
      title: `处理批次 ${Math.floor(startIndex / batchSize) + 1}/${Math.ceil(totalSize / batchSize)}`,
      message: `正在处理 ${startIndex + 1} 到 ${endIndex} 条数据`
    });

    // 并发处理当前批次
    const promises = batch.map((keyword, index) => {
      return limit(async () => {
        const result = await queryBusinessInfo(keyword);
        // 显示单条进度
        showToast({
          style: Toast.Style.Animated,
          title: `进度 ${startIndex + index + 1}/${totalSize}`,
          message: `处理: ${keyword}`
        });
        return result;
      });
    });

    return Promise.all(promises);
  };

  async function handleSubmit(values: FormValues): Promise<void> {
    if (!values.input.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "输入错误",
        message: "请输入企业名称或注册号"
      });
      return;
    }

    setIsLoading(true);
    try {
      const keywords = splitInput(values.input, values.customSeparator);
      const batchSize = parseInt(config.batchSize);
      const maxConcurrent = parseInt(config.maxConcurrent);
      const limit = pLimit(maxConcurrent);
      
      showToast({
        style: Toast.Style.Animated,
        title: "开始处理",
        message: `共 ${keywords.length} 条数据，每批 ${batchSize} 条，最大并发 ${maxConcurrent}`
      });

      const allResults: QueryResult[] = [];
      
      // 分批处理
      for (let i = 0; i < keywords.length; i += batchSize) {
        const batchResults = await processBatch(
          keywords,
          i,
          batchSize,
          keywords.length,
          limit
        );
        allResults.push(...batchResults);
        
        // 批次间隔
        if (i + batchSize < keywords.length) {
          await sleep(parseInt(config.requestInterval));
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
          message: "查询结果已复制为Markdown格式"
        });
      }

      if ((values.exportMd || values.exportXlsx) && values.exportPath && values.exportPath.length > 0) {
        const directory = values.exportPath[0];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        if (values.exportMd) {
          const mdPath = path.join(directory, `企业信息查询结果_${timestamp}.md`);
          const markdown = generateMarkdown(allResults);
          await exportToFile(markdown, mdPath, 'md');
        }

        if (values.exportXlsx) {
          const xlsxPath = path.join(directory, `企业信息查询结果_${timestamp}.xlsx`);
          const ws = XLSX.utils.json_to_sheet(
            allResults.map(r => ({
              '企业名称': r.name,
              '统一社会信用代码/注册号': r.regNum,
              '地址': r.address,
              '企业类型': r.type,
              '法人代表': r.legalPerson,
              '经营状态': r.status,
              '注册资本': r.capital,
              '经营范围': r.scope,
              '错误信息': r.error || ''
            }))
          );
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "查询结果");
          const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
          await exportToFile(excelBuffer, xlsxPath, 'xlsx');
        }
      }

      showToast({
        style: Toast.Style.Success,
        title: "查询完成",
        message: `成功查询 ${allResults.length} 条记录`
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "查询失败",
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
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
        title="支持的分隔符"
        text={defaultSeparators.map(s => `${s.symbol} (${s.description})`).join('、')}
      />
      <Form.TextArea
        id="input"
        title="企业信息"
        placeholder="请输入企业名称、注册号或统一社会信用代码"
        value={inputText}
        onChange={setInputText}
      />
      <Form.TextField
        id="customSeparator"
        title="自定义分隔符"
        placeholder="可输入自定义分隔符，多个分隔符用空格分开，如: @ $ +"
        value={customSeparator}
        onChange={setCustomSeparator}
      />
      {previewLines.length > 0 && (
        <Form.Description
          title="分割预览（前5条）"
          text={previewLines.map((line, index) => `${index + 1}. ${line}`).join('\n')}
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