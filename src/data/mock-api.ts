import { KLineData, TickData, DataLoaderParams } from '../core/types';
import { generateMockData } from './mock';
import { generateTickData } from './tick';

// 模拟全量历史数据（用于分页加载模拟）
const allKlineData: KLineData[] = generateMockData(2000, 50);

// 模拟远程数据 API
export async function mockFetch(url: string): Promise<Response> {
  await new Promise((r) => setTimeout(r, 300)); // 模拟网络延迟

  if (url.includes('/api/kline')) {
    const data: KLineData[] = generateMockData(300, 50);
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/api/tick')) {
    const data: TickData[] = generateTickData(50.88, 240);
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 分页加载 API
  if (url.includes('/api/kline/page')) {
    const params = new URL(url).searchParams;
    const direction = params.get('direction') || 'prev';
    const fromTs = params.get('fromTimestamp') ? Number(params.get('fromTimestamp')) : undefined;
    const toTs = params.get('toTimestamp') ? Number(params.get('toTimestamp')) : undefined;
    const count = Number(params.get('count')) || 300;

    let result: KLineData[];
    if (direction === 'prev' && fromTs !== undefined) {
      // 找到 fromTimestamp 对应的索引，返回更早的数据
      const idx = allKlineData.findIndex((d) => d.timestamp >= fromTs);
      const start = Math.max(0, idx - count);
      result = allKlineData.slice(start, idx);
    } else if (direction === 'next' && toTs !== undefined) {
      const idx = allKlineData.findLastIndex((d) => d.timestamp <= toTs);
      result = allKlineData.slice(idx + 1, idx + 1 + count);
    } else {
      // 初始加载：返回最新 count 条
      result = allKlineData.slice(-count);
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Not Found', { status: 404 });
}

// Hook fetch to intercept mock API calls
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString();
  if (url.startsWith('/api/')) {
    return mockFetch(url);
  }
  return originalFetch(input, init);
};