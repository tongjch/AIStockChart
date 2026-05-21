import { KLineData } from '../core/types';

/** 指标计算结果 */
export interface IndicatorResult {
  name: string;
  /** key=指标名, value=每根K线对应的值(可能为null) */
  values: Record<string, (number | null)[]>;
  /** 绘制线条颜色 */
  colors: Record<string, string>;
}

/** 简单移动平均 */
function sma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j];
      result.push(+(sum / period).toFixed(2));
    }
  }
  return result;
}

/** 标准差 */
function stddev(data: number[], period: number): (number | null)[] {
  const avg = sma(data, period);
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += (data[j] - (avg[i] as number)) ** 2;
    result.push(+Math.sqrt(sum / period).toFixed(2));
  }
  return result;
}

/** MA指标 */
export function calcMA(klines: KLineData[], periods: number[] = [5, 10, 20, 30, 60]): IndicatorResult {
  const closes = klines.map((k) => k.close);
  const values: Record<string, (number | null)[]> = {};
  const colors: Record<string, string> = {};
  const colorPalette = ['#ffd93d', '#6bcb77', '#4d96ff', '#ff6b6b', '#9b59b6'];

  periods.forEach((p, i) => {
    const key = `MA${p}`;
    values[key] = sma(closes, p);
    colors[key] = colorPalette[i % colorPalette.length];
  });

  return { name: 'MA', values, colors };
}

/** BOLL指标 */
export function calcBOLL(klines: KLineData[], period: number = 20, multiplier: number = 2): IndicatorResult {
  const closes = klines.map((k) => k.close);
  const mid = sma(closes, period);
  const std = stddev(closes, period);

  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (mid[i] === null || std[i] === null) {
      upper.push(null);
      lower.push(null);
    } else {
      upper.push(+(mid[i]! + multiplier * std[i]!).toFixed(2));
      lower.push(+(mid[i]! - multiplier * std[i]!).toFixed(2));
    }
  }

  return {
    name: 'BOLL',
    values: { MID: mid, UPPER: upper, LOWER: lower },
    colors: { MID: '#ffd93d', UPPER: '#4d96ff', LOWER: '#ff6b6b' },
  };
}
