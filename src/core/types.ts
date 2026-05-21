/** K线数据项 */
export interface KLineData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover?: number;
}

/** 分时数据项 */
export interface TickData {
  /** 时间戳 */
  timestamp: number;
  /** 当前价格 */
  price: number;
  /** 成交量（累计或单笔） */
  volume: number;
  /** 均价（可选，可由计算得出） */
  avgPrice?: number;
}

/** 分时图配置 */
export interface TickChartOptions {
  /** 昨日收盘价（基准线） */
  prevClose: number;
  /** 开盘时间（分钟），默认 930 = 9:30 */
  openTime?: number;
  /** 收盘时间（分钟），默认 1500 = 15:00 */
  closeTime?: number;
  /** 午休开始时间（分钟），默认 1130 = 11:30 */
  lunchStart?: number;
  /** 午休结束时间（分钟），默认 1300 = 13:00 */
  lunchEnd?: number;
  /** 默认展示的数据点数量（0=显示全部，默认 0） */
  visiblePoints?: number;
}

/** 图表样式配置 */
export interface ChartStyle {
  /** 背景 */
  backgroundColor: string;
  /** 网格线 */
  gridColor: string;
  /** 网格线虚线 */
  gridDash: number[];
  /** 涨 - 阳线颜色 */
  upColor: string;
  /** 跌 - 阴线颜色 */
  downColor: string;
  /** 文字颜色 */
  textColor: string;
  /** 十字光标线颜色 */
  crosshairColor: string;
  /** MA均线颜色 */
  maColors: string[];
  /** 成交量涨色 */
  volumeUpColor: string;
  /** 成交量跌色 */
  volumeDownColor: string;
  /** K线边框宽度 */
  candleBorderWidth: number;
  /** 指标文字颜色 */
  indicatorTextColor: string;
  /** 分时图价格线颜色 */
  tickLineColor: string;
  /** 分时图均价线颜色 */
  tickAvgColor: string;
  /** 分时图基准线颜色（昨日收盘） */
  tickBaseColor: string;
  /** 分时图填充区域颜色（涨） */
  tickFillUpColor: string;
  /** 分时图填充区域颜色（跌） */
  tickFillDownColor: string;
}

/** 图表配置 */
export interface ChartOptions {
  /** 样式 */
  style: ChartStyle;
  /** 默认可见K线数量 */
  visibleRange: number;
  /** 最小可见K线数量 */
  minVisibleRange: number;
  /** K线间距 */
  candleGap: number;
  /** K线最小宽度 */
  candleMinWidth: number;
  /** K线最大宽度 */
  candleMaxWidth: number;
  /** 价格区域高度占比 */
  priceAreaRatio: number;
  /** 成交量区域高度占比 */
  volumeAreaRatio: number;
  /** 右侧留白K线数 */
  rightPadding: number;
  /** 是否显示成交量 */
  showVolume: boolean;
  /** 是否显示网格 */
  showGrid: boolean;
  /** Y轴标签宽度 */
  yAxisWidth: number;
  /** X轴标签高度 */
  xAxisHeight: number;
  /** 像素比（默认使用 devicePixelRatio） */
  pixelRatio: number;
}

/** 指标配置项 */
export interface IndicatorConfig {
  /** 指标类型: ma | boll */
  type: string;
  /** 指标参数 */
  params?: Record<string, number | number[]>;
}

/** JSON 配置 — 一份配置定义整个图表 */
export interface KLineChartConfig {
  /** 容器选择器或元素（必填） */
  container: string;
  /** 图表类型: kline | tick（默认 kline） */
  type?: 'kline' | 'tick';
  /** 数据源: K线数据数组 或 数据URL */
  data?: KLineData[] | TickData[] | string;
  /** 分时数据（仅 type=tick 时使用） */
  tickData?: TickData[];
  /** 分时图配置（仅 type=tick 时使用） */
  tickOptions?: TickChartOptions;
  /** 周期: day | week | month（仅 type=kline 时使用） */
  period?: 'day' | 'week' | 'month';
  /** 指标列表（仅 type=kline 时使用） */
  indicators?: IndicatorConfig[];
  /** 图表选项 */
  options?: Partial<ChartOptions>;
  /** 交互开关 */
  interaction?: {
    /** 启用拖拽平移（默认 true） */
    drag?: boolean;
    /** 启用滚轮缩放（默认 true） */
    zoom?: boolean;
    /** 启用十字光标（默认 true） */
    crosshair?: boolean;
    /** 启用触摸手势（默认 true） */
    touch?: boolean;
  };
  /** 数据加载回调 */
  onLoad?: (chart: KLineChart) => void;
  /** 点击K线/分时点回调 */
  onClick?: (data: KLineData | TickData | null, index: number) => void;
  /** 十字光标移动回调 */
  onCrosshairMove?: (data: KLineData | TickData | null, index: number) => void;
  /** 分段加载配置（K线图） */
  dataLoader?: {
    /** 加载数据的回调函数 */
    fetch: (params: DataLoaderParams) => Promise<KLineData[]>;
    /** 每页数据量（默认 300） */
    pageSize?: number;
    /** 提前加载阈值（距离边缘多少根K线时触发，默认 20） */
    preloadThreshold?: number;
  };
}

/** 数据加载器参数 */
export interface DataLoaderParams {
  /** 加载方向 */
  direction: 'prev' | 'next';
  /** 当前数据首条时间戳（direction='prev'时提供） */
  fromTimestamp?: number;
  /** 当前数据末条时间戳（direction='next'时提供） */
  toTimestamp?: number;
  /** 请求的数据条数 */
  count: number;
}

/** 默认样式（暗色主题） */
export const DEFAULT_STYLE: ChartStyle = {
  backgroundColor: '#ffffff',
  gridColor: '#e4e7ed',
  gridDash: [4, 4],
  upColor: '#ef5350',
  downColor: '#26a69a',
  textColor: '#606266',
  crosshairColor: '#909399',
  maColors: ['#f9a825', '#66bb6a', '#42a5f5', '#ef5350', '#ab47bc'],
  volumeUpColor: 'rgba(239, 83, 80, 0.5)',
  volumeDownColor: 'rgba(38, 166, 154, 0.5)',
  candleBorderWidth: 1,
  indicatorTextColor: '#606266',
  // 分时图样式
  tickLineColor: '#42a5f5',
  tickAvgColor: '#f9a825',
  tickBaseColor: '#909399',
  tickFillUpColor: 'rgba(66, 165, 245, 0.15)',
  tickFillDownColor: 'rgba(239, 83, 80, 0.15)',
};

/** 默认配置 */
export const DEFAULT_OPTIONS: ChartOptions = {
  style: DEFAULT_STYLE,
  visibleRange: 80,
  minVisibleRange: 20,
  candleGap: 2,
  candleMinWidth: 3,
  candleMaxWidth: 40,
  priceAreaRatio: 0.75,
  volumeAreaRatio: 0.25,
  rightPadding: 5,
  showVolume: true,
  showGrid: true,
  yAxisWidth: 80,
  xAxisHeight: 28,
  pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
};
