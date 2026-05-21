import { KLineData, ChartOptions, ChartStyle, DEFAULT_OPTIONS, DEFAULT_STYLE } from '../core/types';
import { IndicatorResult } from '../indicator';
import { formatPrice, formatVolume, formatDate, clamp } from '../utils/format';

/** 渲染状态 */
interface RenderState {
  /** 可见区域起始索引 */
  startIdx: number;
  /** 可见区域结束索引 */
  endIdx: number;
  /** K线宽度 (含间隙) */
  candleTotalWidth: number;
  /** K线实体宽度 */
  candleBodyWidth: number;
  /** 主图Y轴映射 (价格→像素) */
  priceToY: (price: number) => number;
  /** 副图Y轴映射 (成交量→像素) */
  volumeToY: (vol: number) => number;
  /** 主图区域 */
  priceArea: { x: number; y: number; w: number; h: number };
  /** 副图区域 */
  volumeArea: { x: number; y: number; w: number; h: number };
}

export class KLineRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: ChartOptions;
  private style: ChartStyle;
  private data: KLineData[] = [];
  private indicators: IndicatorResult[] = [];
  private state: RenderState | null = null;

  /** 可见起始索引 */
  private offset = 0;
  /** 鼠标位置 */
  private crosshair: { x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement, options?: Partial<ChartOptions>) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d')!;
    this.ctx = ctx;

    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.style = { ...DEFAULT_STYLE, ...this.options.style };

    const dpr = this.options.pixelRatio;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);
  }

  /** 更新数据 */
  setData(data: KLineData[]): void {
    this.data = data;
    // 默认从最右端显示
    this.offset = Math.max(0, data.length - this.options.visibleRange);
    this.render();
  }

  /** 设置指标 */
  setIndicators(indicators: IndicatorResult[]): void {
    this.indicators = indicators;
    this.render();
  }

  /** 向左滚动 */
  scrollLeft(count: number = 5): void {
    this.offset = Math.max(0, this.offset - count);
    this.render();
  }

  /** 向右滚动 */
  scrollRight(count: number = 5): void {
    const maxOffset = Math.max(0, this.data.length - this.options.visibleRange);
    this.offset = Math.min(maxOffset, this.offset + count);
    this.render();
  }

  /** 获取当前偏移量 */
  getOffset(): number {
    return this.offset;
  }

  /** 平移偏移量（加载历史数据后保持视图位置） */
  shiftOffset(delta: number): void {
    this.offset += delta;
    this.render();
  }

  /** 缩放 */
  zoom(delta: number): void {
    const newVisible = clamp(
      this.options.visibleRange - delta,
      this.options.minVisibleRange,
      this.data.length
    );
    this.options.visibleRange = newVisible;
    // 保持右端不变
    this.offset = Math.min(this.offset, Math.max(0, this.data.length - newVisible));
    this.render();
  }

  /** 设置十字光标 */
  setCrosshair(x: number | null, y: number | null): void {
    if (x === null || y === null) {
      this.crosshair = null;
    } else {
      this.crosshair = { x, y };
    }
    this.render();
  }

  /** 获取光标对应的K线索引 */
  getHoverIndex(canvasX: number): number {
    if (!this.state) return -1;
    const { candleTotalWidth, priceArea } = this.state;
    const idx = Math.floor((canvasX - priceArea.x) / candleTotalWidth) + this.offset;
    return clamp(idx, 0, this.data.length - 1);
  }

  /** 获取某根K线数据 */
  getDataAt(index: number): KLineData | null {
    return this.data[index] ?? null;
  }

  /** 主渲染入口 */
  render(): void {
    if (!this.data.length) return;

    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const { ctx, style } = this;
    const { yAxisWidth, xAxisHeight, showVolume } = this.options;

    // 区域划分
    const chartWidth = w - yAxisWidth;
    const priceHeight = h * this.options.priceAreaRatio - (showVolume ? 0 : xAxisHeight);
    const volumeHeight = showVolume ? h * this.options.volumeAreaRatio - xAxisHeight : 0;

    const priceArea = { x: 0, y: 0, w: chartWidth, h: priceHeight };
    const volumeArea = { x: 0, y: priceHeight, w: chartWidth, h: volumeHeight };

    // 计算可见范围
    const endIdx = Math.min(this.offset + this.options.visibleRange, this.data.length);
    const visibleData = this.data.slice(this.offset, endIdx);
    if (!visibleData.length) return;

    // K线尺寸
    const candleTotalWidth = chartWidth / this.options.visibleRange;
    const candleBodyWidth = Math.max(
      this.options.candleMinWidth,
      Math.min(this.options.candleMaxWidth, candleTotalWidth - this.options.candleGap)
    );

    // 计算价格范围
    let minPrice = Infinity, maxPrice = -Infinity, maxVol = 0;
    for (const d of visibleData) {
      if (d.low < minPrice) minPrice = d.low;
      if (d.high > maxPrice) maxPrice = d.high;
      if (d.volume > maxVol) maxVol = d.volume;
    }
    // 考虑指标
    for (const ind of this.indicators) {
      for (const key of Object.keys(ind.values)) {
        const vals = ind.values[key];
        for (let i = this.offset; i < endIdx; i++) {
          const v = vals[i];
          if (v !== null && v !== undefined) {
            if (v < minPrice) minPrice = v;
            if (v > maxPrice) maxPrice = v;
          }
        }
      }
    }
    const pricePadding = (maxPrice - minPrice) * 0.05;
    minPrice -= pricePadding;
    maxPrice += pricePadding;

    const priceRange = maxPrice - minPrice || 1;
    const volRange = maxVol || 1;

    const priceToY = (p: number) => priceArea.y + priceArea.h - ((p - minPrice) / priceRange) * priceArea.h;
    const volumeToY = (v: number) => volumeArea.y + volumeArea.h - (v / volRange) * volumeArea.h * 0.9;

    this.state = { startIdx: this.offset, endIdx, candleTotalWidth, candleBodyWidth, priceToY, volumeToY, priceArea, volumeArea };

    // 清空
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(0, 0, w, h);

    // 网格
    if (this.options.showGrid) {
      this.drawGrid(priceArea, minPrice, maxPrice);
    }

    // K线
    this.drawCandles(visibleData, priceArea, priceToY, volumeToY);

    // 指标线
    this.drawIndicators(priceArea);

    // Y轴标签
    this.drawYAxis(priceArea, minPrice, maxPrice);

    // X轴标签
    this.drawXAxis(priceArea, visibleData);

    // 十字光标
    if (this.crosshair) {
      this.drawCrosshair(priceArea, volumeArea, minPrice, maxPrice);
    }
  }

  /** 绘制网格 */
  private drawGrid(area: { x: number; y: number; w: number; h: number }, minP: number, maxP: number): void {
    const { ctx, style } = this;
    ctx.save();
    ctx.strokeStyle = style.gridColor;
    ctx.setLineDash(style.gridDash);
    ctx.lineWidth = 0.5;

    // 横线 5条
    for (let i = 0; i <= 4; i++) {
      const y = area.y + (area.h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(area.x, y);
      ctx.lineTo(area.x + area.w, y);
      ctx.stroke();
    }

    // 竖线 6条
    for (let i = 0; i <= 5; i++) {
      const x = area.x + (area.w / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x, area.y);
      ctx.lineTo(x, area.y + area.h);
      ctx.stroke();
    }

    ctx.restore();
  }

  /** 绘制K线 */
  private drawCandles(
    data: KLineData[],
    area: { x: number; y: number; w: number; h: number },
    priceToY: (p: number) => number,
    volumeToY: (v: number) => number
  ): void {
    const { ctx, style, state } = this;
    if (!state) return;

    const { candleTotalWidth, candleBodyWidth } = state;
    const halfBody = candleBodyWidth / 2;

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const isUp = d.close >= d.open;
      const color = isUp ? style.upColor : style.downColor;
      const volColor = isUp ? style.volumeUpColor : style.volumeDownColor;

      const x = area.x + i * candleTotalWidth + candleTotalWidth / 2;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1;

      // 上下影线
      ctx.beginPath();
      ctx.moveTo(x, priceToY(d.high));
      ctx.lineTo(x, priceToY(d.low));
      ctx.stroke();

      // 实体
      const bodyTop = priceToY(Math.max(d.open, d.close));
      const bodyBottom = priceToY(Math.min(d.open, d.close));
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);

      if (isUp) {
        ctx.fillStyle = style.backgroundColor;
        ctx.fillRect(x - halfBody, bodyTop, candleBodyWidth, bodyHeight);
        ctx.strokeRect(x - halfBody, bodyTop, candleBodyWidth, bodyHeight);
      } else {
        ctx.fillRect(x - halfBody, bodyTop, candleBodyWidth, bodyHeight);
      }

      // 成交量
      if (this.options.showVolume) {
        ctx.fillStyle = volColor;
        const volY = volumeToY(d.volume);
        ctx.fillRect(x - halfBody, volY, candleBodyWidth, this.state!.volumeArea.h * 0.9 - (volY - this.state!.volumeArea.y));
      }

      ctx.restore();
    }
  }

  /** 绘制指标 */
  private drawIndicators(area: { x: number; y: number; w: number; h: number }): void {
    const { ctx, state } = this;
    if (!state) return;

    const { candleTotalWidth } = state;

    for (const ind of this.indicators) {
      for (const [key, vals] of Object.entries(ind.values)) {
        const color = ind.colors[key] || '#fff';
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();

        let started = false;
        for (let i = state.startIdx; i < state.endIdx; i++) {
          const v = vals[i];
          if (v === null || v === undefined) continue;
          const x = area.x + (i - state.startIdx) * candleTotalWidth + candleTotalWidth / 2;
          const y = state.priceToY(v);
          if (!started) { ctx.moveTo(x, y); started = true; }
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  /** Y轴标签 */
  private drawYAxis(area: { x: number; y: number; w: number; h: number }, minP: number, maxP: number): void {
    const { ctx, style, options } = this;
    ctx.save();
    ctx.fillStyle = style.textColor;
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 4; i++) {
      const price = maxP - ((maxP - minP) / 4) * i;
      const y = area.y + (area.h / 4) * i;
      ctx.fillText(formatPrice(price), area.w + 8, y);
    }
    ctx.restore();
  }

  /** X轴标签 */
  private drawXAxis(area: { x: number; y: number; w: number; h: number }, data: KLineData[]): void {
    const { ctx, style, state } = this;
    if (!state) return;

    ctx.save();
    ctx.fillStyle = style.textColor;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const step = Math.max(1, Math.floor(data.length / 6));
    const { candleTotalWidth } = state;

    for (let i = 0; i < data.length; i += step) {
      const x = area.x + i * candleTotalWidth + candleTotalWidth / 2;
      ctx.fillText(formatDate(data[i].timestamp), x, area.y + area.h + 4);
    }
    ctx.restore();
  }

  /** 十字光标 */
  private drawCrosshair(
    priceArea: { x: number; y: number; w: number; h: number },
    volumeArea: { x: number; y: number; w: number; h: number },
    minP: number,
    maxP: number
  ): void {
    if (!this.crosshair || !this.state) return;
    const { ctx, style, options } = this;
    const { x, y } = this.crosshair;

    ctx.save();
    ctx.strokeStyle = style.crosshairColor;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 0.5;

    // 竖线
    ctx.beginPath();
    ctx.moveTo(x, priceArea.y);
    ctx.lineTo(x, priceArea.y + priceArea.h);
    if (options.showVolume) ctx.lineTo(x, volumeArea.y + volumeArea.h);
    ctx.stroke();

    // 横线
    ctx.beginPath();
    ctx.moveTo(priceArea.x, y);
    ctx.lineTo(priceArea.x + priceArea.w, y);
    ctx.stroke();

    ctx.setLineDash([]);

    // 价格标签
    if (y >= priceArea.y && y <= priceArea.y + priceArea.h) {
      const price = maxP - ((y - priceArea.y) / priceArea.h) * (maxP - minP);
      ctx.fillStyle = '#e4e7ed';
      ctx.fillRect(priceArea.w, y - 10, options.yAxisWidth, 20);
      ctx.fillStyle = '#333';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatPrice(price), priceArea.w + 8, y);
    }

    // 日期标签
    const hoverIdx = this.getHoverIndex(x);
    if (hoverIdx >= 0 && hoverIdx < this.data.length) {
      const dateStr = formatDate(this.data[hoverIdx].timestamp);
      const labelW = 80;
      ctx.fillStyle = '#e4e7ed';
      ctx.fillRect(x - labelW / 2, priceArea.y + priceArea.h + 2, labelW, 18);
      ctx.fillStyle = '#333';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(dateStr, x, priceArea.y + priceArea.h + 4);
    }

    ctx.restore();
  }

  /** resize处理 */
  resize(): void {
    const dpr = this.options.pixelRatio;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.render();
  }
}
