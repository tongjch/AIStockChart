import { KLineChart, generateMockData, generateTickData } from './index';

// ========== 演示切换 K线 / 分时 ==========
let chartType: 'kline' | 'tick' = 'kline';

const klineData = generateMockData(300, 50);
const tickData = generateTickData(50.88, 240); // 昨收 50.88

const chart = KLineChart.create({
  container: '#chart-container',
  type: 'kline',
  data: klineData,
  period: 'day',
  indicators: [{ type: 'ma', params: { periods: [5, 10, 20, 30, 60] } }],
  options: { visibleRange: 80 },
});

// 类型切换按钮
document.querySelectorAll('.type-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const t = (btn as HTMLElement).dataset.type as 'kline' | 'tick';
    if (t === chartType) return;
    chartType = t;

    document.querySelectorAll('.type-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    // 显示/隐藏相关按钮
    document.querySelectorAll('.period-btn').forEach((b) => b.style.display = t === 'kline' ? 'inline-block' : 'none');
    document.querySelectorAll('.indicator-btn').forEach((b) => b.style.display = t === 'kline' ? 'inline-block' : 'none');

    if (t === 'kline') {
      chart.setData(klineData);
      chart.setPeriod('day');
      chart.setIndicatorConfigs([{ type: 'ma', params: { periods: [5, 10, 20] } }]);
    } else {
      chart.setTickData(tickData, { prevClose: 50.88 });
    }
  });
});

// 周期切换（仅K线）
let currentPeriod = 'day';
document.querySelectorAll('.period-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (chartType !== 'kline') return;
    document.querySelectorAll('.period-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = (btn as HTMLElement).dataset.period as 'day' | 'week' | 'month';
    chart.setPeriod(currentPeriod);
  });
});

// 指标切换（仅K线）
let currentIndicator = 'ma';
document.querySelectorAll('.indicator-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (chartType !== 'kline') return;
    const ind = (btn as HTMLElement).dataset.indicator!;
    if (currentIndicator === ind) return;
    currentIndicator = ind;
    document.querySelectorAll('.indicator-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    if (ind === 'ma') {
      chart.setIndicatorConfigs([{ type: 'ma', params: { periods: [5, 10, 20, 30, 60] } }]);
    } else if (ind === 'boll') {
      chart.setIndicatorConfigs([{ type: 'boll', params: { period: 20, multiplier: 2 } }]);
    }
  });
});

// Tooltip
const container = document.getElementById('app')!;
const tooltip = document.createElement('div');
tooltip.id = 'kline-tooltip';
tooltip.style.cssText = 'display:flex;gap:12px;padding:6px 12px;font-size:12px;color:#a0a0c0;margin-bottom:8px;min-height:22px;';
container.insertBefore(tooltip, container.firstChild.nextSibling);