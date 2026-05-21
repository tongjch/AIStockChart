# KLineChart

基于 Canvas + TypeScript 的金融图表库，支持 K线图与分时图。

## 功能特性

- 📊 **K线图** — 蜡烛图、成交量、MA/BOLL 指标、日K/周K/月K
- 📈 **分时图** — 价格曲线、均价线、涨跌幅、成交量柱
- 🖱 **交互操作** — 十字光标、拖拽平移、滚轮缩放
- 📱 **触摸支持** — 单指拖拽、双指缩放
- 🌙 **暗色主题** — 默认深色主题，可自定义样式
- ⚙️ **JSON 配置** — 一份配置定义整个图表

## 快速开始

```bash
npm install
npm run dev
```

## 使用方式

### 方式1：JSON 配置（推荐）

**K线图：**
```typescript
const chart = KLineChart.create({
  container: '#chart-container',
  type: 'kline',
  data: [...],                    // K线数据
  period: 'day',                  // day | week | month
  indicators: [
    { type: 'ma', params: { periods: [5, 10, 20] } },
    { type: 'boll', params: { period: 20, multiplier: 2 } },
  ],
  options: { visibleRange: 80 },
});
```

**分时图：**
```typescript
const chart = KLineChart.create({
  container: '#chart-container',
  type: 'tick',
  tickData: [...],                // 分时数据
  tickOptions: {
    prevClose: 50.88,             // 昨日收盘价（必填）
    openTime: 930,                // 开盘时间（可选）
    closeTime: 1500,              // 收盘时间（可选）
  },
});
```

### 方式2：传统构造

```typescript
const chart = new KLineChart('#container');
chart.setData(klineData);
chart.setIndicators([calcMA(data)]);
```

## 动态切换

```typescript
// 切换图表类型
chart.setType('kline');          // K线图
chart.setType('tick');           // 分时图

// 设置分时数据
chart.setTickData(tickData, { prevClose: 50.88 });

// 切换周期（仅K线）
chart.setPeriod('week');
```

## 数据格式

**K线数据：**
```typescript
interface KLineData {
  timestamp: number;   // 时间戳
  open: number;        // 开盘价
  high: number;        // 最高价
  low: number;         // 最低价
  close: number;       // 收盘价
  volume: number;      // 成交量
}
```

**分时数据：**
```typescript
interface TickData {
  timestamp: number;   // 时间戳
  price: number;       // 当前价格
  volume: number;      // 成交量
  avgPrice?: number;   // 均价（可选）
}
```

## 模拟数据

```typescript
import { generateMockData, generateTickData } from 'kline-chart';

const klineData = generateMockData(200, 100);    // 200根K线，基准价100
const tickData = generateTickData(50.88, 240);   // 240个分钟点，昨收50.88
```

## 自定义样式

```typescript
const chart = KLineChart.create({
  container: '#container',
  options: {
    style: {
      backgroundColor: '#ffffff',
      upColor: '#ef5350',
      downColor: '#26a69a',
      tickLineColor: '#4d96ff',
      tickAvgColor: '#ffd93d',
      tickFillUpColor: 'rgba(239, 83, 80, 0.1)',
      tickFillDownColor: 'rgba(38, 166, 154, 0.1)',
    },
  },
});
```

## 项目结构

```
src/
├── core/types.ts           # 类型定义
├── core/KLineChart.ts      # 主类
├── renderer/
│   ├── KLineRenderer.ts    # K线渲染器
│   └── TickChartRenderer.ts # 分时渲染器
├── indicator/index.ts      # 指标计算
├── data/mock.ts            # K线模拟数据
├── data/tick.ts            # 分时模拟数据
├── utils/format.ts         # 格式化工具
├── demo.ts                 # 演示入口
└── index.ts                # 库导出
```

## License

MIT