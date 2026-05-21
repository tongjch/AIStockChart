import { KLineData } from '../core/types';

/**
 * 生成模拟K线数据
 */
export function generateMockData(count: number = 200, basePrice: number = 100): KLineData[] {
  const data: KLineData[] = [];
  let price = basePrice;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * price * 0.05;
    const open = price;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * Math.abs(change) * 0.5;
    const low = Math.min(open, close) - Math.random() * Math.abs(change) * 0.5;
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    data.push({
      timestamp: now - (count - i) * dayMs,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume,
    });

    price = close;
  }
  return data;
}

/**
 * 将数据聚合为周K
 */
export function toWeekly(data: KLineData[]): KLineData[] {
  return aggregate(data, (ts) => {
    const d = new Date(ts);
    const day = d.getDay() || 7;
    const mondayTs = d.getTime() - (day - 1) * 86400000;
    return Math.floor(mondayTs / 86400000);
  });
}

/**
 * 将数据聚合为月K
 */
export function toMonthly(data: KLineData[]): KLineData[] {
  return aggregate(data, (ts) => {
    const d = new Date(ts);
    return d.getFullYear() * 100 + d.getMonth();
  });
}

function aggregate(
  data: KLineData[],
  keyFn: (ts: number) => number
): KLineData[] {
  const map = new Map<number, KLineData[]>();
  for (const d of data) {
    const k = keyFn(d.timestamp);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(d);
  }
  return Array.from(map.entries()).map(([, items]) => ({
    timestamp: items[0].timestamp,
    open: items[0].open,
    high: Math.max(...items.map((i) => i.high)),
    low: Math.min(...items.map((i) => i.low)),
    close: items[items.length - 1].close,
    volume: items.reduce((s, i) => s + i.volume, 0),
  }));
}
