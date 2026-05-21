import { TickData } from '../core/types';

/**
 * 生成模拟分时数据
 * @param basePrice 基准价格（昨日收盘）
 * @param count 数据点数量（默认 240 = 4小时 * 60分钟）
 */
export function generateTickData(basePrice: number = 100, count: number = 240): TickData[] {
  const data: TickData[] = [];
  let price = basePrice;
  
  // 9:30 开始
  const baseDate = new Date();
  baseDate.setHours(9, 30, 0, 0);
  
  const morningCount = Math.floor(count * 0.5); // 上午120分钟
  const afternoonCount = count - morningCount;  // 下午120分钟

  // 上午时段 9:30-11:30
  for (let i = 0; i < morningCount; i++) {
    const change = (Math.random() - 0.48) * basePrice * 0.002;
    price += change;
    const ts = new Date(baseDate.getTime() + i * 60000).getTime();
    const volume = Math.floor(Math.random() * 50000) + 10000;
    
    data.push({
      timestamp: ts,
      price: +price.toFixed(2),
      volume,
    });
  }

  // 下午时段 13:00-15:00 (跳过午休)
  const afternoonStart = baseDate.getTime() + (120 + 90) * 60000; // 11:30 + 1.5小时 = 13:00
  for (let i = 0; i < afternoonCount; i++) {
    const change = (Math.random() - 0.48) * basePrice * 0.002;
    price += change;
    const ts = new Date(afternoonStart + i * 60000).getTime();
    const volume = Math.floor(Math.random() * 50000) + 10000;
    
    data.push({
      timestamp: ts,
      price: +price.toFixed(2),
      volume,
    });
  }

  return data;
}

/**
 * 从K线数据提取当日分时数据（简化版，假设每根K线是1分钟）
 */
export function klineToTick(klines: { timestamp: number; close: number; volume: number }[]): TickData[] {
  return klines.map((k) => ({
    timestamp: k.timestamp,
    price: k.close,
    volume: k.volume,
  }));
}