import { KLineData, TickData, ChartOptions, KLineChartConfig, IndicatorConfig, TickChartOptions, DataLoaderParams } from './types';
import { KLineRenderer } from '../renderer/KLineRenderer';
import { TickChartRenderer } from '../renderer/TickChartRenderer';
import { IndicatorResult, calcMA, calcBOLL } from '../indicator';
import { generateMockData, toWeekly, toMonthly } from '../data/mock';
import { generateTickData } from '../data/tick';

/** 指标计算工厂 */
function buildIndicator(config: IndicatorConfig, data: KLineData[]): IndicatorResult {
  switch (config.type.toLowerCase()) {
    case 'ma':
      return calcMA(data, config.params?.periods as number[] | undefined);
    case 'boll':
      return calcBOLL(
        data,
        (config.params?.period as number) ?? 20,
        (config.params?.multiplier as number) ?? 2
      );
    default:
      throw new Error(`Unknown indicator type: ${config.type}`);
  }
}

export class KLineChart {
  private klineRenderer: KLineRenderer | null = null;
  private tickRenderer: TickChartRenderer | null = null;
  private canvas: HTMLCanvasElement;
  
  private chartType: 'kline' | 'tick' = 'kline';
  
  // K线数据
  private klineData: KLineData[] = [];
  private rawKlineData: KLineData[] = [];
  private indicatorConfigs: IndicatorConfig[] = [];
  private period: 'day' | 'week' | 'month' = 'day';
  
  // 分时数据
  private tickData: TickData[] = [];
  private tickOptions: TickChartOptions | null = null;
  
  private options: Partial<ChartOptions>;

  // 交互开关
  private interaction = {
    drag: true,
    dragSpeed: 1,
    zoom: true,
    crosshair: true,
    touch: true,
  };

  // 回调
  private onLoad?: (chart: KLineChart) => void;
  private onClick?: (data: KLineData | TickData | null, index: number) => void;
  private onCrosshairMove?: (data: KLineData | TickData | null, index: number) => void;

  private dragging = false;
  private lastX = 0;

  // 分段加载
  private dataLoader: KLineChartConfig['dataLoader'] = null;
  private loading = false;
  private hasMorePrev = true;
  private hasMoreNext = true;
  private preloadThreshold = 20;
  private lastLoadedOffset = 0;

  /**
   * 构造函数
   */
  constructor(container: HTMLElement | string, options?: Partial<ChartOptions>) {
    const el = typeof container === 'string' ? document.querySelector<HTMLElement>(container)! : container;
    this.options = options ?? {};

    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    el.appendChild(this.canvas);

    this.bindEvents();
  }

  /**
   * 从 JSON 配置创建图表（推荐方式）
   */
  static create(config: KLineChartConfig): KLineChart {
    const chart = new KLineChart(config.container, config.options);

    // 交互开关
    if (config.interaction) {
      chart.interaction = { ...chart.interaction, ...config.interaction };
    }

    // 分段加载
    if (config.dataLoader) {
      chart.dataLoader = config.dataLoader;
      chart.preloadThreshold = config.dataLoader.preloadThreshold ?? 20;
    }

    // 回调
    chart.onLoad = config.onLoad;
    chart.onClick = config.onClick as any;
    chart.onCrosshairMove = config.onCrosshairMove as any;

    // 图表类型
    const chartType = config.type ?? 'kline';
    chart.chartType = chartType;

    if (chartType === 'tick') {
      // 分时图
      if (config.tickOptions) chart.tickOptions = config.tickOptions;
      if (config.tickData) {
        chart.tickData = config.tickData;
        chart.initTickRenderer();
        chart.tickRenderer!.setData(chart.tickData);
      } else if (config.data) {
        if (typeof config.data === 'string') {
          chart.loadTickFromUrl(config.data);
        } else {
          chart.tickData = config.data as TickData[];
          chart.initTickRenderer();
          chart.tickRenderer!.setData(chart.tickData);
        }
      }
    } else {
      // K线图
      if (config.period) chart.period = config.period;
      if (config.indicators) chart.indicatorConfigs = config.indicators;
      chart.initKlineRenderer();

      if (config.data) {
        if (typeof config.data === 'string') {
          chart.loadKlineFromUrl(config.data);
        } else {
          chart.rawKlineData = config.data as KLineData[];
          chart.applyPeriod();
          chart.applyIndicators();
        }
      }
    }

    if (chart.onLoad) chart.onLoad(chart);
    return chart;
  }

  /** 初始化K线渲染器 */
  private initKlineRenderer(): void {
    if (this.klineRenderer) return;
    this.klineRenderer = new KLineRenderer(this.canvas, this.options);
  }

  /** 初始化分时渲染器 */
  private initTickRenderer(): void {
    if (this.tickRenderer) return;
    this.tickRenderer = new TickChartRenderer(this.canvas, this.tickOptions);
  }

  /** 切换图表类型 */
  setType(type: 'kline' | 'tick'): this {
    if (this.chartType === type) return this;
    this.chartType = type;

    // 清空当前渲染器
    this.klineRenderer = null;
    this.tickRenderer = null;

    if (type === 'kline') {
      this.initKlineRenderer();
      if (this.klineData.length) {
        this.klineRenderer.setData(this.klineData);
        this.applyIndicators();
      }
    } else {
      this.initTickRenderer();
      if (this.tickData.length) {
        this.tickRenderer.setData(this.tickData);
      }
    }

    return this;
  }

  /** 设置分时数据，支持URL */
  setTickData(data: TickData[] | string, options?: TickChartOptions): this {
    if (options) this.tickOptions = options;
    this.chartType = 'tick';
    this.klineRenderer = null;
    this.tickRenderer = null;
    if (typeof data === 'string') {
      this.loadTickFromUrl(data);
    } else {
      this.tickData = data;
      this.initTickRenderer();
      if (options) this.tickRenderer!.setTickOptions(options);
      this.tickRenderer!.setData(data);
    }
    return this;
  }

  /** 设置分时配置 */
  setTickOptions(options: TickChartOptions): this {
    this.tickOptions = options;
    if (this.tickRenderer) {
      this.tickRenderer.setTickOptions(options);
    }
    return this;
  }

  /** 设置K线数据（向后兼容），支持URL */
  setData(data: KLineData[] | string): this {
    this.chartType = 'kline';
    this.klineRenderer = null;
    this.tickRenderer = null;
    if (typeof data === 'string') {
      this.loadKlineFromUrl(data);
    } else {
      this.rawKlineData = data;
      this.initKlineRenderer();
      this.applyPeriod();
      this.applyIndicators();
    }
    return this;
  }

  /** 设置指标配置 */
  setIndicatorConfigs(configs: IndicatorConfig[]): this {
    this.indicatorConfigs = configs;
    if (this.chartType === 'kline') this.applyIndicators();
    return this;
  }

  /** 设置指标（传统方式） */
  setIndicators(indicators: IndicatorResult[]): this {
    if (this.klineRenderer) this.klineRenderer.setIndicators(indicators);
    return this;
  }

  /** 切换周期 */
  setPeriod(period: 'day' | 'week' | 'month'): this {
    this.period = period;
    this.chartType = 'kline';
    this.initKlineRenderer();
    this.applyPeriod();
    this.applyIndicators();
    return this;
  }

  /** 获取当前图表类型 */
  getType(): 'kline' | 'tick' {
    return this.chartType;
  }

  /** 获取K线数据 */
  getKlineData(): KLineData[] {
    return this.klineData;
  }

  /** 获取分时数据 */
  getTickData(): TickData[] {
    return this.tickData;
  }

  /** 获取当前周期 */
  getPeriod(): string {
    return this.period;
  }

  /** 从URL加载K线数据 */
  async loadKlineFromUrl(url: string): Promise<void> {
    try {
      const resp = await fetch(url);
      const data: KLineData[] = await resp.json();
      this.rawKlineData = data;
      this.initKlineRenderer();
      this.applyPeriod();
      this.applyIndicators();
    } catch (e) {
      console.error('KLineChart: failed to load kline data', url, e);
    }
  }

  /** 从URL加载分时数据 */
  async loadTickFromUrl(url: string): Promise<void> {
    try {
      const resp = await fetch(url);
      const data: TickData[] = await resp.json();
      this.tickData = data;
      this.initTickRenderer();
      this.tickRenderer!.setData(data);
    } catch (e) {
      console.error('KLineChart: failed to load tick data', url, e);
    }
  }

  /** 应用周期 */
  private applyPeriod(): void {
    switch (this.period) {
      case 'week': this.klineData = toWeekly(this.rawKlineData); break;
      case 'month': this.klineData = toMonthly(this.rawKlineData); break;
      default: this.klineData = [...this.rawKlineData];
    }
    if (this.klineRenderer) this.klineRenderer.setData(this.klineData);
  }

  /** 检查是否需要加载更多数据 */
  private checkLoadMore(): void {
    if (!this.dataLoader || this.loading || this.chartType !== 'kline' || !this.klineRenderer) return;

    const offset = this.klineRenderer.getOffset();
    const visible = this.klineData.length;
    const threshold = this.preloadThreshold;

    // 向左滚动接近数据起点 → 加载更早的数据
    if (this.hasMorePrev && offset <= threshold) {
      this.loadPrev();
    }
  }

  /** 加载更早的数据（向左/历史方向） */
  private async loadPrev(): Promise<void> {
    if (this.loading || !this.hasMorePrev || !this.dataLoader) return;
    this.loading = true;

    const count = this.dataLoader.pageSize ?? 300;
    const firstTimestamp = this.rawKlineData[0]?.timestamp;

    try {
      const newData = await this.dataLoader.fetch({
        direction: 'prev',
        fromTimestamp: firstTimestamp,
        count,
      });

      if (!newData.length) {
        this.hasMorePrev = false;
        return;
      }

      // 合并到头部
      this.rawKlineData = [...newData, ...this.rawKlineData];

      // 保持当前滚动位置（加上新数据的偏移量）
      const addedCount = newData.length;
      this.applyPeriod();
      this.applyIndicators();
      if (this.klineRenderer) {
        this.klineRenderer.shiftOffset(addedCount);
      }

      this.lastLoadedOffset = this.klineRenderer?.getOffset() ?? 0;
    } catch (e) {
      console.error('KLineChart: failed to load prev page', e);
    } finally {
      this.loading = false;
    }
  }

  /** 加载更新的数据（向右/未来方向） */
  async loadNext(): Promise<void> {
    if (this.loading || !this.hasMoreNext || !this.dataLoader) return;
    this.loading = true;

    const count = this.dataLoader.pageSize ?? 300;
    const lastTimestamp = this.rawKlineData[this.rawKlineData.length - 1]?.timestamp;

    try {
      const newData = await this.dataLoader.fetch({
        direction: 'next',
        toTimestamp: lastTimestamp,
        count,
      });

      if (!newData.length) {
        this.hasMoreNext = false;
        return;
      }

      this.rawKlineData = [...this.rawKlineData, ...newData];
      this.applyPeriod();
      this.applyIndicators();
    } catch (e) {
      console.error('KLineChart: failed to load next page', e);
    } finally {
      this.loading = false;
    }
  }

  /** 重置分段加载状态 */
  resetLoader(): void {
    this.hasMorePrev = true;
    this.hasMoreNext = true;
    this.loading = false;
  }

  /** 应用指标 */
  private applyIndicators(): void {
    if (!this.indicatorConfigs.length || !this.klineRenderer) return;
    const results = this.indicatorConfigs.map((cfg) => buildIndicator(cfg, this.klineData));
    this.klineRenderer.setIndicators(results);
  }

  /** 绑定事件 */
  private bindEvents(): void {
    const getRenderer = () => this.chartType === 'kline' ? this.klineRenderer : this.tickRenderer;

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const renderer = getRenderer();

      if (this.dragging && this.interaction.drag && this.chartType === 'kline' && renderer) {
        const dx = e.clientX - this.lastX;
        this.lastX = e.clientX;
        const candleWidth = this.canvas.clientWidth / 80;
        const shift = Math.round(dx / candleWidth * this.interaction.dragSpeed);
        if (shift > 0) {
          (renderer as KLineRenderer).scrollLeft(shift);
          this.checkLoadMore();
        }
        else if (shift < 0) (renderer as KLineRenderer).scrollRight(-shift);
      } else if (this.interaction.crosshair && renderer) {
        renderer.setCrosshair(x, y);
        this.showTooltip(x);

        if (this.onCrosshairMove) {
          const idx = renderer.getHoverIndex(x);
          const d = renderer.getDataAt(idx);
          this.onCrosshairMove(d, idx);
        }
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      const renderer = getRenderer();
      if (renderer) renderer.setCrosshair(null, null);
      this.hideTooltip();
      if (this.onCrosshairMove) this.onCrosshairMove(null, -1);
    });

    this.canvas.addEventListener('click', (e) => {
      if (!this.onClick) return;
      const rect = this.canvas.getBoundingClientRect();
      const renderer = getRenderer();
      if (!renderer) return;
      
      const idx = renderer.getHoverIndex(e.clientX - rect.left);
      const d = renderer.getDataAt(idx);
      if (d) this.onClick(d, idx);
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.interaction.drag || this.chartType !== 'kline') return;
      this.dragging = true;
      this.lastX = e.clientX;
      this.canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mouseup', () => {
      this.dragging = false;
      this.canvas.style.cursor = this.interaction.crosshair ? 'crosshair' : 'default';
    });

    this.canvas.addEventListener('wheel', (e) => {
      if (!this.interaction.zoom || this.chartType !== 'kline' || !this.klineRenderer) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -5 : 5;
      this.klineRenderer.zoom(delta);
    }, { passive: false });

    // 触摸
    let touchStartX = 0;
    let lastTouchDist = 0;

    this.canvas.addEventListener('touchstart', (e) => {
      if (!this.interaction.touch) return;
      if (e.touches.length === 1) touchStartX = e.touches[0].clientX;
      else if (e.touches.length === 2 && this.chartType === 'kline') {
        lastTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (!this.interaction.touch) return;
      e.preventDefault();

      if (e.touches.length === 1 && this.interaction.drag && this.chartType === 'kline' && this.klineRenderer) {
        const dx = e.touches[0].clientX - touchStartX;
        touchStartX = e.touches[0].clientX;
        const candleWidth = this.canvas.clientWidth / 80;
        const shift = Math.round(dx / candleWidth * this.interaction.dragSpeed);
        if (shift > 0) {
          this.klineRenderer.scrollLeft(shift);
          this.checkLoadMore();
        }
        else if (shift < 0) this.klineRenderer.scrollRight(-shift);
      } else if (e.touches.length === 2 && this.interaction.zoom && this.klineRenderer) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const delta = Math.round((dist - lastTouchDist) / 10);
        lastTouchDist = dist;
        this.klineRenderer.zoom(delta);
      }
    }, { passive: false });

    window.addEventListener('resize', () => {
      const renderer = getRenderer();
      if (renderer) renderer.resize();
    });

    this.canvas.style.cursor = 'crosshair';
  }

  private showTooltip(canvasX: number): void {
    const renderer = this.chartType === 'kline' ? this.klineRenderer : this.tickRenderer;
    if (!renderer) return;

    const idx = renderer.getHoverIndex(canvasX);
    const d = renderer.getDataAt(idx);
    if (!d) return;

    const el = document.getElementById('kline-tooltip');
    if (!el) return;

    if (this.chartType === 'tick') {
      const tick = d as TickData;
      const prevClose = this.tickOptions?.prevClose ?? tick.price;
      const isUp = tick.price >= prevClose;
      const color = isUp ? '#ef5350' : '#26a69a';
      const pct = ((tick.price - prevClose) / prevClose * 100).toFixed(2);
      const time = new Date(tick.timestamp);
      const timeStr = `${time.getHours().toString().padStart(2,'0')}:${time.getMinutes().toString().padStart(2,'0')}`;
      
      el.innerHTML = `
        <span style="color:#8888aa">${timeStr}</span>
        <span>价 <b style="color:${color}">${tick.price}</b></span>
        <span>涨跌 <b style="color:${color}">${pct >= 0 ? '+' : ''}${pct}%</b></span>
        <span>量 <b>${formatVolume(tick.volume)}</b></span>
      `;
    } else {
      const kline = d as KLineData;
      const isUp = kline.close >= kline.open;
      const color = isUp ? '#ef5350' : '#26a69a';
      el.innerHTML = `
        <span style="color:#8888aa">${new Date(kline.timestamp).toLocaleDateString()}</span>
        <span>开 <b style="color:${color}">${kline.open}</b></span>
        <span>高 <b style="color:${color}">${kline.high}</b></span>
        <span>低 <b style="color:${color}">${kline.low}</b></span>
        <span>收 <b style="color:${color}">${kline.close}</b></span>
        <span>量 <b>${formatVolume(kline.volume)}</b></span>
      `;
    }
  }

  private hideTooltip(): void {
    const el = document.getElementById('kline-tooltip');
    if (el) el.innerHTML = '';
  }

  destroy(): void {
    this.canvas.remove();
  }
}

function formatVolume(vol: number): string {
  if (vol >= 1e8) return (vol / 1e8).toFixed(2) + '亿';
  if (vol >= 1e4) return (vol / 1e4).toFixed(2) + '万';
  return vol.toString();
}