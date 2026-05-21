import { TickData, TickChartOptions, ChartStyle, DEFAULT_STYLE, DEFAULT_OPTIONS } from '../core/types';
import { formatPrice, formatVolume, formatDate } from '../utils/format';

interface RenderState {
  /** 主图区域 */
  priceArea: { x: number; y: number; w: number; h: number };
  /** 成交量区域 */
  volumeArea: { x: number; y: number; w: number; h: number };
  /** 价格范围 */
  minPrice: number;
  maxPrice: number;
  /** 价格到Y坐标 */
  priceToY: (p: number) => number;
  /** 成交量到Y坐标 */
  volumeToY: (v: number) => number;
  /** 时间到X坐标 */
  timeToX: (ts: number) => number;
}

/** 默认分时配置 */
const DEFAULT_TICK_OPTIONS: Required<TickChartOptions> = {
  prevClose: 0,
  openTime: 930,    // 9:30
  closeTime: 1500,  // 15:00
  lunchStart: 1130, // 11:30
  lunchEnd: 1300,   // 13:00
  visiblePoints: 0, // 0=显示全部
};

export class TickChartRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private style: ChartStyle;
  private pixelRatio: number;

  private data: TickData[] = [];
  private allData: TickData[] = [];
  private tickOptions: Required<TickChartOptions>;
  private state: RenderState | null = null;
  private crosshair: { x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement, tickOptions?: TickChartOptions) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.style = DEFAULT_STYLE;
    this.pixelRatio = DEFAULT_OPTIONS.pixelRatio;

    this.tickOptions = { ...DEFAULT_TICK_OPTIONS, ...tickOptions };

    const dpr = this.pixelRatio;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    this.ctx.scale(dpr, dpr);
  }

  /** 设置分时图样式 */
  setStyle(style: Partial<ChartStyle>): void {
    this.style = { ...DEFAULT_STYLE, ...style };
    this.render();
  }

  /** 设置分时配置 */
  setTickOptions(options: TickChartOptions): void {
    this.tickOptions = { ...DEFAULT_TICK_OPTIONS, ...options };
    this.applyVisiblePoints();
    this.render();
  }

  /** 设置数据 */
  setData(data: TickData[]): void {
    this.allData = data;
    this.applyVisiblePoints();
    this.render();
  }

  /** 根据 visiblePoints 裁剪显示数据 */
  private applyVisiblePoints(): void {
    const vp = this.tickOptions.visiblePoints;
    if (vp > 0 && this.allData.length > vp) {
      this.data = this.allData.slice(this.allData.length - vp);
    } else {
      this.data = [...this.allData];
    }
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

  /** 获取光标对应索引 */
  getHoverIndex(canvasX: number): number {
    if (!this.state) return -1;
    const { priceArea } = this.state;
    const totalMinutes = this.getTotalMinutes();
    const minuteWidth = priceArea.w / totalMinutes;
    
    // 计算时间
    const clickedMinute = Math.floor((canvasX - priceArea.x) / minuteWidth);
    
    // 映射到实际时间
    const actualTime = this.minuteToTime(clickedMinute);
    
    // 找到最近的数据点
    for (let i = 0; i < this.data.length; i++) {
      const d = new Date(this.data[i].timestamp);
      const dataTime = d.getHours() * 100 + d.getMinutes();
      if (dataTime >= actualTime) return i;
    }
    return this.data.length - 1;
  }

  /** 获取数据 */
  getDataAt(index: number): TickData | null {
    return this.data[index] ?? null;
  }

  /** 获取总交易分钟数（扣除午休） */
  private getTotalMinutes(): number {
    const { openTime, closeTime, lunchStart, lunchEnd } = this.tickOptions;
    const morning = lunchStart - openTime;    // 9:30-11:30 = 120分钟
    const afternoon = closeTime - lunchEnd;   // 13:00-15:00 = 120分钟
    return morning + afternoon;
  }

  /** 分钟索引转实际时间 */
  private minuteToTime(minuteIndex: number): number {
    const { openTime, lunchStart, lunchEnd } = this.tickOptions;
    const morningMinutes = lunchStart - openTime;
    
    if (minuteIndex < morningMinutes) {
      // 上午时段
      const hours = Math.floor(openTime / 100) + Math.floor(minuteIndex / 60);
      const mins = (openTime % 100) + (minuteIndex % 60);
      return hours * 100 + mins;
    } else {
      // 下午时段
      const afternoonIndex = minuteIndex - morningMinutes;
      const hours = Math.floor(lunchEnd / 100) + Math.floor(afternoonIndex / 60);
      const mins = (lunchEnd % 100) + (afternoonIndex % 60);
      return hours * 100 + mins;
    }
  }

  /** 主渲染 */
  render(): void {
    if (!this.data.length) return;

    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const { ctx, style } = this;
    const yAxisWidth = 80;
    const xAxisHeight = 28;

    const chartWidth = w - yAxisWidth;
    const priceHeight = h * 0.75 - xAxisHeight;
    const volumeHeight = h * 0.25 - xAxisHeight;

    const priceArea = { x: 0, y: 0, w: chartWidth, h: priceHeight };
    const volumeArea = { x: 0, y: priceHeight, w: chartWidth, h: volumeHeight };

    // 计算价格范围（以昨日收盘为基准，上下对称）
    let maxDeviation = 0;
    for (const d of this.data) {
      const deviation = Math.abs(d.price - this.tickOptions.prevClose);
      if (deviation > maxDeviation) maxDeviation = deviation;
    }
    // 至少 1% 波动范围
    const minRange = this.tickOptions.prevClose * 0.01;
    maxDeviation = Math.max(maxDeviation, minRange);

    const minPrice = this.tickOptions.prevClose - maxDeviation;
    const maxPrice = this.tickOptions.prevClose + maxDeviation;
    const priceRange = maxPrice - minPrice;

    // 成交量范围
    let maxVol = 0;
    for (const d of this.data) maxVol = Math.max(maxVol, d.volume);

    // 坐标转换函数
    const priceToY = (p: number) => priceArea.y + priceArea.h - ((p - minPrice) / priceRange) * priceArea.h;
    const volumeToY = (v: number) => volumeArea.y + volumeArea.h - (v / maxVol) * volumeArea.h * 0.9;
    
    // 时间到X坐标
    const totalMinutes = this.getTotalMinutes();
    const timeToX = (ts: number): number => {
      const d = new Date(ts);
      const time = d.getHours() * 100 + d.getMinutes();
      const { openTime, lunchStart, lunchEnd } = this.tickOptions;
      
      let minuteIndex = 0;
      if (time < lunchStart) {
        // 上午
        minuteIndex = (time - openTime);
      } else if (time >= lunchEnd) {
        // 下午
        minuteIndex = (lunchStart - openTime) + (time - lunchEnd);
      } else {
        // 午休时间，用上午最后一个点
        minuteIndex = (lunchStart - openTime);
      }
      return priceArea.x + (minuteIndex / totalMinutes) * priceArea.w;
    };

    this.state = { priceArea, volumeArea, minPrice, maxPrice, priceToY, volumeToY, timeToX };

    // 清空
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(0, 0, w, h);

    // 网格
    this.drawGrid(priceArea, volumeArea);

    // 基准线（昨日收盘）
    this.drawBaseLine(priceArea);

    // 价格曲线 & 均价线
    this.drawPriceLines(priceArea, timeToX, priceToY);

    // 成交量
    this.drawVolume(volumeArea, timeToX, volumeToY);

    // Y轴标签
    this.drawYAxis(priceArea, minPrice, maxPrice);

    // X轴标签
    this.drawXAxis(priceArea);

    // 十字光标
    if (this.crosshair) {
      this.drawCrosshair(priceArea, volumeArea);
    }
  }

  /** 网格 */
  private drawGrid(priceArea: { x: number; y: number; w: number; h: number }, volumeArea: { x: number; y: number; w: number; h: number }): void {
    const { ctx, style } = this;
    ctx.save();
    ctx.strokeStyle = style.gridColor;
    ctx.setLineDash(style.gridDash);
    ctx.lineWidth = 0.5;

    // 横线
    for (let i = 0; i <= 4; i++) {
      const y = priceArea.y + (priceArea.h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(priceArea.x, y);
      ctx.lineTo(priceArea.x + priceArea.w, y);
      ctx.stroke();
    }

    // 分时线（时间分隔）
    const times = [930, 1000, 1030, 1100, 1130, 1300, 1330, 1400, 1430, 1500];
    const totalMinutes = this.getTotalMinutes();
    const { openTime, lunchStart, lunchEnd } = this.tickOptions;

    for (const t of times) {
      let minuteIndex = 0;
      if (t <= lunchStart) {
        minuteIndex = t - openTime;
      } else if (t >= lunchEnd) {
        minuteIndex = (lunchStart - openTime) + (t - lunchEnd);
      } else {
        continue; // 午休时间不画
      }
      const x = priceArea.x + (minuteIndex / totalMinutes) * priceArea.w;
      ctx.beginPath();
      ctx.moveTo(x, priceArea.y);
      ctx.lineTo(x, priceArea.y + priceArea.h + volumeArea.h);
      ctx.stroke();
    }

    ctx.restore();
  }

  /** 基准线（昨日收盘价） */
  private drawBaseLine(area: { x: number; y: number; w: number; h: number }): void {
    if (!this.state) return;
    const { ctx, style } = this;
    const baseY = this.state.priceToY(this.tickOptions.prevClose);

    ctx.save();
    ctx.strokeStyle = style.tickBaseColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(area.x, baseY);
    ctx.lineTo(area.x + area.w, baseY);
    ctx.stroke();
    ctx.restore();
  }

  /** 价格曲线 - 面积图 */
  private drawPriceLines(area: { x: number; y: number; w: number; h: number }, timeToX: (ts: number) => number, priceToY: (p: number) => number): void {
    const { ctx, style } = this;
    const prevClose = this.tickOptions.prevClose;
    const lastPrice = this.data[this.data.length - 1].price;
    const isUp = lastPrice >= prevClose;
    const baseY = priceToY(prevClose);

    ctx.save();

    // ========== 面积图渐变填充 ========== 
    const firstX = timeToX(this.data[0].timestamp);
    const lastX = timeToX(this.data[this.data.length - 1].timestamp);

    // 创建渐变（从上到下）
    const gradient = ctx.createLinearGradient(0, area.y, 0, area.y + area.h);
    if (isUp) {
      gradient.addColorStop(0, 'rgba(77, 150, 255, 0.35)');   // 顶部较深
      gradient.addColorStop(0.5, 'rgba(77, 150, 255, 0.15)'); // 中间渐变
      gradient.addColorStop(1, 'rgba(77, 150, 255, 0.02)');   // 底部几乎透明
    } else {
      gradient.addColorStop(0, 'rgba(255, 107, 107, 0.02)');  // 顶部几乎透明
      gradient.addColorStop(0.5, 'rgba(255, 107, 107, 0.15)'); // 中间渐变
      gradient.addColorStop(1, 'rgba(255, 107, 107, 0.35)');  // 底部较深
    }

    // 绘制填充区域（面积图）
    ctx.beginPath();
    ctx.moveTo(firstX, baseY);
    for (const d of this.data) {
      ctx.lineTo(timeToX(d.timestamp), priceToY(d.price));
    }
    ctx.lineTo(lastX, baseY);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // ========== 价格线 ========== 
    ctx.strokeStyle = isUp ? style.tickLineColor : style.downColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < this.data.length; i++) {
      const x = timeToX(this.data[i].timestamp);
      const y = priceToY(this.data[i].price);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // ========== 均价线 ========== 
    let totalVol = 0;
    let totalAmount = 0;
    const avgPrices: number[] = [];
    for (const d of this.data) {
      totalVol += d.volume;
      totalAmount += d.price * d.volume;
      avgPrices.push(totalVol > 0 ? totalAmount / totalVol : d.price);
    }

    ctx.strokeStyle = style.tickAvgColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < avgPrices.length; i++) {
      const x = timeToX(this.data[i].timestamp);
      const y = priceToY(avgPrices[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // ========== 当前价格点 ========== 
    const lastDataX = timeToX(this.data[this.data.length - 1].timestamp);
    const lastDataY = priceToY(lastPrice);
    ctx.fillStyle = isUp ? style.tickLineColor : style.downColor;
    ctx.beginPath();
    ctx.arc(lastDataX, lastDataY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /** 成交量 */
  private drawVolume(area: { x: number; y: number; w: number; h: number }, timeToX: (ts: number) => number, volumeToY: (v: number) => number): void {
    const { ctx, style } = this;
    const prevClose = this.tickOptions.prevClose;
    const barWidth = Math.max(1, area.w / this.getTotalMinutes() * 0.8);

    ctx.save();
    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i];
      const x = timeToX(d.timestamp);
      const y = volumeToY(d.volume);
      const height = area.y + area.h * 0.9 - y;

      // 根据当前价格与昨日收盘比较决定颜色
      const color = d.price >= prevClose ? style.volumeUpColor : style.volumeDownColor;
      ctx.fillStyle = color;
      ctx.fillRect(x - barWidth / 2, y, barWidth, height);
    }
    ctx.restore();
  }

  /** Y轴 */
  private drawYAxis(area: { x: number; y: number; w: number; h: number }, minP: number, maxP: number): void {
    const { ctx, style } = this;
    const prevClose = this.tickOptions.prevClose;

    ctx.save();
    ctx.fillStyle = style.textColor;
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 4; i++) {
      const price = maxP - ((maxP - minP) / 4) * i;
      const y = area.y + (area.h / 4) * i;
      
      // 标注涨跌幅
      const pct = ((price - prevClose) / prevClose * 100).toFixed(2);
      const pctColor = price >= prevClose ? style.upColor : style.downColor;
      
      ctx.fillStyle = style.textColor;
      ctx.fillText(formatPrice(price), area.w + 8, y);
      
      ctx.fillStyle = pctColor;
      ctx.fillText(`${price >= prevClose ? '+' : ''}${pct}%`, area.w + 50, y);
    }
    ctx.restore();
  }

  /** X轴 */
  private drawXAxis(area: { x: number; y: number; w: number; h: number }): void {
    const { ctx, style } = this;
    const labels = ['09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00'];
    const totalMinutes = this.getTotalMinutes();
    const { openTime, lunchStart, lunchEnd } = this.tickOptions;

    ctx.save();
    ctx.fillStyle = style.textColor;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const minuteToHourMin = (m: number): string => {
      const h = Math.floor(m / 100);
      const min = m % 100;
      return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    };

    for (const t of [930, 1000, 1030, 1100, 1130, 1300, 1330, 1400, 1430, 1500]) {
      let minuteIndex = 0;
      if (t <= lunchStart) {
        minuteIndex = t - openTime;
      } else {
        minuteIndex = (lunchStart - openTime) + (t - lunchEnd);
      }
      const x = area.x + (minuteIndex / totalMinutes) * area.w;
      ctx.fillText(minuteToHourMin(t), x, area.y + area.h + 4);
    }

    ctx.restore();
  }

  /** 十字光标 */
  private drawCrosshair(priceArea: { x: number; y: number; w: number; h: number }, volumeArea: { x: number; y: number; w: number; h: number }): void {
    if (!this.crosshair || !this.state) return;
    const { ctx, style } = this;
    const { x, y } = this.crosshair;

    ctx.save();
    ctx.strokeStyle = style.crosshairColor;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 0.5;

    // 竖线
    ctx.beginPath();
    ctx.moveTo(x, priceArea.y);
    ctx.lineTo(x, priceArea.y + priceArea.h + volumeArea.h);
    ctx.stroke();

    // 横线
    ctx.beginPath();
    ctx.moveTo(priceArea.x, y);
    ctx.lineTo(priceArea.x + priceArea.w, y);
    ctx.stroke();

    ctx.setLineDash([]);

    // 价格标签
    if (y >= priceArea.y && y <= priceArea.y + priceArea.h) {
      const price = this.state.maxPrice - ((y - priceArea.y) / priceArea.h) * (this.state.maxPrice - this.state.minPrice);
      const pct = ((price - this.tickOptions.prevClose) / this.tickOptions.prevClose * 100).toFixed(2);
      
      ctx.fillStyle = '#3a3a5c';
      ctx.fillRect(priceArea.w, y - 10, 80, 20);
      ctx.fillStyle = '#fff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${formatPrice(price)} ${pct >= 0 ? '+' : ''}${pct}%`, priceArea.w + 8, y);
    }

    ctx.restore();
  }

  /** resize */
  resize(): void {
    const dpr = this.pixelRatio;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.render();
  }
}