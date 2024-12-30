import { getPreferenceValues } from "@raycast/api";
import pLimit from "p-limit";

interface BatchProcessorPreferences {
  requestInterval: string;
  maxConcurrent: string;
  batchSize: string;
}

export class BatchProcessor {
  private requestInterval: number;
  private maxConcurrent: number;
  private batchSize: number;
  private limiter: ReturnType<typeof pLimit>;

  constructor() {
    const preferences = getPreferenceValues<BatchProcessorPreferences>();
    this.requestInterval = parseInt(preferences.requestInterval || "1000", 10);
    this.maxConcurrent = parseInt(preferences.maxConcurrent || "5", 10);
    this.batchSize = parseInt(preferences.batchSize || "10", 10);
    this.limiter = pLimit(this.maxConcurrent);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async processWithRetry<T>(
    task: () => Promise<T>,
    retries = 3,
    initialDelay = 1000
  ): Promise<T> {
    try {
      return await task();
    } catch (error) {
      if (retries === 0) throw error;
      
      // 如果是请求过快错误，增加等待时间
      const isRateLimitError = error instanceof Error && 
        error.message.includes("请求过快");
      
      const delayTime = isRateLimitError ? 
        initialDelay * 2 : initialDelay;

      await this.delay(delayTime);
      return this.processWithRetry(task, retries - 1, delayTime);
    }
  }

  public async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    onProgress?: (progress: number) => void
  ): Promise<R[]> {
    const results: R[] = [];
    const batches = [];

    // 将数据分批
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }

    let processedCount = 0;
    const totalCount = items.length;

    // 处理每一批数据
    for (const batch of batches) {
      const batchPromises = batch.map(item => 
        this.limiter(async () => {
          const result = await this.processWithRetry(() => processor(item));
          await this.delay(this.requestInterval);
          
          processedCount++;
          if (onProgress) {
            onProgress((processedCount / totalCount) * 100);
          }
          
          return result;
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }
} 