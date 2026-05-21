import { KLineData, TickData } from './core/types';
import { generateMockData, generateTickData } from './mock';

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