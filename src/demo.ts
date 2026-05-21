import { KLineChart, generateMockData, generateTickData, calcMA, calcBOLL } from './index';
import type { KLineData, TickData, KLineChartConfig, TickChartOptions, ChartOptions, ChartStyle } from './index';

// ========== 示例定义 ==========
interface Example {
  name: string;
  code: string;
  toolbar?: string; // 工具栏HTML
  render: (container: HTMLDivElement) => KLineChart;
}

const klineData = generateMockData(300, 50);
const tickData = generateTickData(50.88, 240);

const examples: Record<string, Example> = {
  'kline-basic': {
    name: '基础K线图',
    code: `const chart = KLineChart.create({
  container: '#chart-container',
  type: 'kline',
  data: klineData,
  options: { visibleRange: 80 },
});`,
    render: (c) => KLineChart.create({ container: c, type: 'kline', data: klineData, options: { visibleRange: 80 } }),
  },

  'kline-ma': {
    name: 'MA均线指标',
    code: `const chart = KLineChart.create({
  container: '#chart-container',
  type: 'kline',
  data: klineData,
  indicators: [
    { type: 'ma', params: { periods: [5, 10, 20, 30, 60] } },
  ],
  options: { visibleRange: 80 },
});`,
    render: (c) => KLineChart.create({
      container: c, type: 'kline', data: klineData,
      indicators: [{ type: 'ma', params: { periods: [5, 10, 20, 30, 60] } }],
      options: { visibleRange: 80 },
    }),
  },

  'kline-boll': {
    name: 'BOLL布林带',
    code: `const chart = KLineChart.create({
  container: '#chart-container',
  type: 'kline',
  data: klineData,
  indicators: [
    { type: 'boll', params: { period: 20, multiplier: 2 } },
  ],
  options: { visibleRange: 80 },
});`,
    render: (c) => KLineChart.create({
      container: c, type: 'kline', data: klineData,
      indicators: [{ type: 'boll', params: { period: 20, multiplier: 2 } }],
      options: { visibleRange: 80 },
    }),
  },

  'kline-period': {
    name: '日K/周K/月K切换',
    toolbar: `<button class="period-btn active" data-period="day">日K</button>
      <button class="period-btn" data-period="week">周K</button>
      <button class="period-btn" data-period="month">月K</button>`,
    code: `const chart = KLineChart.create({
  container: '#chart-container',
  type: 'kline',
  data: klineData,
  period: 'day',
  options: { visibleRange: 80 },
});

// 切换周期
chart.setPeriod('week');   // 周K
chart.setPeriod('month');  // 月K
chart.setPeriod('day');    // 日K`,
    render: (c) => {
      const chart = KLineChart.create({ container: c, type: 'kline', data: klineData, period: 'day', options: { visibleRange: 80 } });
      // 绑定周期切换
      document.querySelectorAll('.period-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.period-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          chart.setPeriod((btn as HTMLElement).dataset.period as any);
        });
      });
      return chart;
    },
  },

  'tick-basic': {
    name: '基础分时图',
    code: `const chart = KLineChart.create({
  container: '#chart-container',
  type: 'tick',
  tickData: tickData,
  tickOptions: {
    prevClose: 50.88,
  },
});`,
    render: (c) => KLineChart.create({
      container: c, type: 'tick', tickData, tickOptions: { prevClose: 50.88 },
    }),
  },

  'tick-area': {
    name: '分时面积图',
    code: `// 分时图默认以面积图展示
// 涨：蓝色渐变填充
// 跌：红色渐变填充
const chart = KLineChart.create({
  container: '#chart-container',
  type: 'tick',
  tickData: tickData,
  tickOptions: {
    prevClose: 50.88,
  },
  options: {
    style: {
      tickLineColor: '#4d96ff',
      tickAvgColor: '#ffd93d',
      tickFillUpColor: 'rgba(77, 150, 255, 0.15)',
      tickFillDownColor: 'rgba(255, 107, 107, 0.15)',
    },
  },
});`,
    render: (c) => KLineChart.create({
      container: c, type: 'tick', tickData,
      tickOptions: { prevClose: 50.88 },
      options: { style: { tickLineColor: '#4d96ff', tickAvgColor: '#ffd93d' } },
    }),
  },

  'tick-visible': {
    name: '分时部分数据',
    toolbar: `<button class="vp-btn" data-vp="60">显示60点</button>
      <button class="vp-btn" data-vp="120">显示120点</button>
      <button class="vp-btn active" data-vp="0">显示全部</button>`,
    code: `// visiblePoints 控制展示数据点数量
// 0 = 显示全部，>0 = 显示最近N个点
const chart = KLineChart.create({
  container: '#chart-container',
  type: 'tick',
  tickData: tickData,
  tickOptions: {
    prevClose: 50.88,
    visiblePoints: 120,  // 仅显示最近120个点
  },
});

// 动态修改
chart.setTickOptions({ prevClose: 50.88, visiblePoints: 60 });`,
    render: (c) => {
      const chart = KLineChart.create({ container: c, type: 'tick', tickData, tickOptions: { prevClose: 50.88 } });
      document.querySelectorAll('.vp-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.vp-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          const vp = parseInt((btn as HTMLElement).dataset.vp!);
          chart.setTickOptions({ prevClose: 50.88, visiblePoints: vp });
        });
      });
      return chart;
    },
  },

  'switch': {
    name: 'K线/分时切换',
    toolbar: `<button class="switch-btn active" data-type="kline">K线图</button>
      <button class="switch-btn" data-type="tick">分时图</button>`,
    code: `const chart = KLineChart.create({
  container: '#chart-container',
  type: 'kline',
  data: klineData,
  indicators: [{ type: 'ma', params: { periods: [5, 10, 20] } }],
  options: { visibleRange: 80 },
});

// 切换到分时图
chart.setTickData(tickData, { prevClose: 50.88 });

// 切换回K线图
chart.setData(klineData);
chart.setIndicatorConfigs([
  { type: 'ma', params: { periods: [5, 10, 20] } },
]);`,
    render: (c) => {
      const chart = KLineChart.create({
        container: c, type: 'kline', data: klineData,
        indicators: [{ type: 'ma', params: { periods: [5, 10, 20] } }],
        options: { visibleRange: 80 },
      });
      document.querySelectorAll('.switch-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.switch-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          const t = (btn as HTMLElement).dataset.type!;
          if (t === 'kline') {
            chart.setData(klineData);
            chart.setIndicatorConfigs([{ type: 'ma', params: { periods: [5, 10, 20] } }]);
          } else {
            chart.setTickData(tickData, { prevClose: 50.88 });
          }
        });
      });
      return chart;
    },
  },
};

// ========== 页面导航 ==========
let currentChart: KLineChart | null = null;

document.querySelectorAll('.nav-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    const pageId = `page-${(tab as HTMLElement).dataset.page}`;
    document.getElementById(pageId)!.classList.add('active');
  });
});

// ========== 示例切换 ==========
function loadExample(key: string) {
  const ex = examples[key];
  if (!ex) return;

  // 销毁旧图表
  if (currentChart) currentChart.destroy();
  currentChart = null;

  // 高亮侧边栏
  document.querySelectorAll('.sidebar-item').forEach((item) => {
    item.classList.toggle('active', (item as HTMLElement).dataset.example === key);
  });

  // 工具栏
  const toolbar = document.getElementById('example-toolbar')!;
  toolbar.innerHTML = ex.toolbar ?? '';

  // 代码面板
  document.getElementById('code-panel')!.textContent = ex.code;

  // 渲染图表
  const container = document.getElementById('chart-container')!;
  container.innerHTML = '';
  currentChart = ex.render(container);
}

document.querySelectorAll('.sidebar-item').forEach((item) => {
  item.addEventListener('click', () => {
    loadExample((item as HTMLElement).dataset.example!);
  });
});

// 默认加载第一个
loadExample('kline-basic');

// ========== 文档页内容 ==========
document.getElementById('doc-content')!.innerHTML = `
<h1>AIStockChart 技术文档</h1>
<p>基于 Canvas + TypeScript 的金融图表库，支持 K线图与分时图。</p>

<h2>快速开始</h2>
<pre>npm install
npm run dev</pre>

<h2>KLineChart.create(config)</h2>
<p>通过 JSON 配置创建图表实例（推荐方式）。</p>
<pre>import { KLineChart, generateMockData } from 'ai-stock-chart';

const chart = KLineChart.create({
  container: '#chart',
  type: 'kline',
  data: klineData,
  options: { visibleRange: 80 },
});</pre>

<h3>KLineChartConfig 配置项</h3>
<table>
  <tr><th>属性</th><th>类型</th><th>默认值</th><th>说明</th></tr>
  <tr><td><code>container</code></td><td><span class="type-tag">string</span></td><td><em>必填</em></td><td>容器选择器</td></tr>
  <tr><td><code>type</code></td><td><span class="type-tag">'kline' | 'tick'</span></td><td><code>'kline'</code></td><td>图表类型</td></tr>
  <tr><td><code>data</code></td><td><span class="type-tag">KLineData[] | TickData[] | string</span></td><td>-</td><td>数据源或数据URL</td></tr>
  <tr><td><code>tickData</code></td><td><span class="type-tag">TickData[]</span></td><td>-</td><td>分时数据（type=tick时）</td></tr>
  <tr><td><code>tickOptions</code></td><td><span class="type-tag">TickChartOptions</span></td><td>-</td><td>分时图配置</td></tr>
  <tr><td><code>period</code></td><td><span class="type-tag">'day' | 'week' | 'month'</span></td><td><code>'day'</code></td><td>K线周期</td></tr>
  <tr><td><code>indicators</code></td><td><span class="type-tag">IndicatorConfig[]</span></td><td>-</td><td>指标列表</td></tr>
  <tr><td><code>options</code></td><td><span class="type-tag">Partial&lt;ChartOptions&gt;</span></td><td>-</td><td>图表选项</td></tr>
  <tr><td><code>interaction</code></td><td><span class="type-tag">object</span></td><td>-</td><td>交互开关</td></tr>
  <tr><td><code>onLoad</code></td><td><span class="type-tag">function</span></td><td>-</td><td>数据加载回调</td></tr>
  <tr><td><code>onClick</code></td><td><span class="type-tag">function</span></td><td>-</td><td>点击回调</td></tr>
  <tr><td><code>onCrosshairMove</code></td><td><span class="type-tag">function</span></td><td>-</td><td>十字光标移动回调</td></tr>
</table>

<h2>ChartOptions 图表选项</h2>
<table>
  <tr><th>属性</th><th>类型</th><th>默认值</th><th>说明</th></tr>
  <tr><td><code>visibleRange</code></td><td><span class="type-tag">number</span></td><td><code>80</code></td><td>K线默认可见数量</td></tr>
  <tr><td><code>minVisibleRange</code></td><td><span class="type-tag">number</span></td><td><code>20</code></td><td>最小可见K线数量</td></tr>
  <tr><td><code>candleGap</code></td><td><span class="type-tag">number</span></td><td><code>2</code></td><td>K线间距(px)</td></tr>
  <tr><td><code>candleMinWidth</code></td><td><span class="type-tag">number</span></td><td><code>3</code></td><td>K线最小宽度(px)</td></tr>
  <tr><td><code>candleMaxWidth</code></td><td><span class="type-tag">number</span></td><td><code>40</code></td><td>K线最大宽度(px)</td></tr>
  <tr><td><code>priceAreaRatio</code></td><td><span class="type-tag">number</span></td><td><code>0.75</code></td><td>价格区域高度占比</td></tr>
  <tr><td><code>volumeAreaRatio</code></td><td><span class="type-tag">number</span></td><td><code>0.25</code></td><td>成交量区域高度占比</td></tr>
  <tr><td><code>rightPadding</code></td><td><span class="type-tag">number</span></td><td><code>5</code></td><td>右侧留白K线数</td></tr>
  <tr><td><code>showVolume</code></td><td><span class="type-tag">boolean</span></td><td><code>true</code></td><td>是否显示成交量</td></tr>
  <tr><td><code>showGrid</code></td><td><span class="type-tag">boolean</span></td><td><code>true</code></td><td>是否显示网格</td></tr>
  <tr><td><code>yAxisWidth</code></td><td><span class="type-tag">number</span></td><td><code>80</code></td><td>Y轴标签宽度(px)</td></tr>
  <tr><td><code>xAxisHeight</code></td><td><span class="type-tag">number</span></td><td><code>28</code></td><td>X轴标签高度(px)</td></tr>
  <tr><td><code>pixelRatio</code></td><td><span class="type-tag">number</span></td><td><code>devicePixelRatio</code></td><td>像素比</td></tr>
  <tr><td><code>style</code></td><td><span class="type-tag">ChartStyle</span></td><td>-</td><td>样式配置</td></tr>
</table>

<h2>ChartStyle 样式配置</h2>
<table>
  <tr><th>属性</th><th>类型</th><th>默认值</th><th>说明</th></tr>
  <tr><td><code>backgroundColor</code></td><td><span class="type-tag">string</span></td><td><code>'#1a1a2e'</code></td><td>背景色</td></tr>
  <tr><td><code>gridColor</code></td><td><span class="type-tag">string</span></td><td><code>'#2a2a4a'</code></td><td>网格线颜色</td></tr>
  <tr><td><code>gridDash</code></td><td><span class="type-tag">number[]</span></td><td><code>[4, 4]</code></td><td>网格线虚线</td></tr>
  <tr><td><code>upColor</code></td><td><span class="type-tag">string</span></td><td><code>'#00b894'</code></td><td>涨（阳线）颜色</td></tr>
  <tr><td><code>downColor</code></td><td><span class="type-tag">string</span></td><td><code>'#ff6b6b'</code></td><td>跌（阴线）颜色</td></tr>
  <tr><td><code>textColor</code></td><td><span class="type-tag">string</span></td><td><code>'#8888aa'</code></td><td>文字颜色</td></tr>
  <tr><td><code>crosshairColor</code></td><td><span class="type-tag">string</span></td><td><code>'#8888aa'</code></td><td>十字光标颜色</td></tr>
  <tr><td><code>maColors</code></td><td><span class="type-tag">string[]</span></td><td><code>[5色]</code></td><td>MA均线颜色</td></tr>
  <tr><td><code>volumeUpColor</code></td><td><span class="type-tag">string</span></td><td><code>'rgba(0,184,148,0.5)'</code></td><td>成交量涨色</td></tr>
  <tr><td><code>volumeDownColor</code></td><td><span class="type-tag">string</span></td><td><code>'rgba(255,107,107,0.5)'</code></td><td>成交量跌色</td></tr>
  <tr><td><code>candleBorderWidth</code></td><td><span class="type-tag">number</span></td><td><code>1</code></td><td>K线边框宽度</td></tr>
  <tr><td><code>tickLineColor</code></td><td><span class="type-tag">string</span></td><td><code>'#4d96ff'</code></td><td>分时价格线颜色</td></tr>
  <tr><td><code>tickAvgColor</code></td><td><span class="type-tag">string</span></td><td><code>'#ffd93d'</code></td><td>分时均价线颜色</td></tr>
  <tr><td><code>tickBaseColor</code></td><td><span class="type-tag">string</span></td><td><code>'#8888aa'</code></td><td>分时基准线颜色</td></tr>
  <tr><td><code>tickFillUpColor</code></td><td><span class="type-tag">string</span></td><td><code>'rgba(0,184,148,0.15)'</code></td><td>分时涨填充色</td></tr>
  <tr><td><code>tickFillDownColor</code></td><td><span class="type-tag">string</span></td><td><code>'rgba(255,107,107,0.15)'</code></td><td>分时跌填充色</td></tr>
</table>

<h2>TickChartOptions 分时图配置</h2>
<table>
  <tr><th>属性</th><th>类型</th><th>默认值</th><th>说明</th></tr>
  <tr><td><code>prevClose</code></td><td><span class="type-tag">number</span></td><td>-</td><td>昨日收盘价（必填，基准线）</td></tr>
  <tr><td><code>openTime</code></td><td><span class="type-tag">number</span></td><td><code>930</code></td><td>开盘时间（如 930 = 9:30）</td></tr>
  <tr><td><code>closeTime</code></td><td><span class="type-tag">number</span></td><td><code>1500</code></td><td>收盘时间</td></tr>
  <tr><td><code>lunchStart</code></td><td><span class="type-tag">number</span></td><td><code>1130</code></td><td>午休开始时间</td></tr>
  <tr><td><code>lunchEnd</code></td><td><span class="type-tag">number</span></td><td><code>1300</code></td><td>午休结束时间</td></tr>
  <tr><td><code>visiblePoints</code></td><td><span class="type-tag">number</span></td><td><code>0</code></td><td>展示数据点数（0=全部）</td></tr>
</table>

<h2>IndicatorConfig 指标配置</h2>
<table>
  <tr><th>属性</th><th>类型</th><th>说明</th></tr>
  <tr><td><code>type</code></td><td><span class="type-tag">'ma' | 'boll'</span></td><td>指标类型</td></tr>
  <tr><td><code>params</code></td><td><span class="type-tag">object</span></td><td>指标参数</td></tr>
</table>
<h3>MA 参数</h3>
<pre>{ type: 'ma', params: { periods: [5, 10, 20, 30, 60] } }</pre>
<h3>BOLL 参数</h3>
<pre>{ type: 'boll', params: { period: 20, multiplier: 2 } }</pre>

<h2>数据格式</h2>
<h3>KLineData</h3>
<pre>interface KLineData {
  timestamp: number;   // 时间戳(ms)
  open: number;        // 开盘价
  high: number;        // 最高价
  low: number;         // 最低价
  close: number;       // 收盘价
  volume: number;      // 成交量
}</pre>
<h3>TickData</h3>
<pre>interface TickData {
  timestamp: number;   // 时间戳(ms)
  price: number;       // 当前价格
  volume: number;      // 成交量
  avgPrice?: number;   // 均价（可选）
}</pre>

<h2>交互开关 interaction</h2>
<table>
  <tr><th>属性</th><th>类型</th><th>默认值</th><th>说明</th></tr>
  <tr><td><code>drag</code></td><td><span class="type-tag">boolean</span></td><td><code>true</code></td><td>拖拽平移</td></tr>
  <tr><td><code>zoom</code></td><td><span class="type-tag">boolean</span></td><td><code>true</code></td><td>滚轮缩放</td></tr>
  <tr><td><code>crosshair</code></td><td><span class="type-tag">boolean</span></td><td><code>true</code></td><td>十字光标</td></tr>
  <tr><td><code>touch</code></td><td><span class="type-tag">boolean</span></td><td><code>true</code></td><td>触摸手势</td></tr>
</table>

<h2>实例方法</h2>
<table>
  <tr><th>方法</th><th>返回</th><th>说明</th></tr>
  <tr><td><code>setData(data)</code></td><td><span class="type-tag">this</span></td><td>设置K线数据</td></tr>
  <tr><td><code>setTickData(data, options?)</code></td><td><span class="type-tag">this</span></td><td>设置分时数据</td></tr>
  <tr><td><code>setTickOptions(options)</code></td><td><span class="type-tag">this</span></td><td>更新分时配置</td></tr>
  <tr><td><code>setType(type)</code></td><td><span class="type-tag">this</span></td><td>切换图表类型</td></tr>
  <tr><td><code>setPeriod(period)</code></td><td><span class="type-tag">this</span></td><td>切换K线周期</td></tr>
  <tr><td><code>setIndicatorConfigs(configs)</code></td><td><span class="type-tag">this</span></td><td>设置指标配置</td></tr>
  <tr><td><code>setIndicators(indicators)</code></td><td><span class="type-tag">this</span></td><td>设置指标（传统方式）</td></tr>
  <tr><td><code>getType()</code></td><td><span class="type-tag">string</span></td><td>获取当前图表类型</td></tr>
  <tr><td><code>getKlineData()</code></td><td><span class="type-tag">KLineData[]</span></td><td>获取K线数据</td></tr>
  <tr><td><code>getTickData()</code></td><td><span class="type-tag">TickData[]</span></td><td>获取分时数据</td></tr>
  <tr><td><code>destroy()</code></td><td><span class="type-tag">void</span></td><td>销毁图表</td></tr>
</table>

<h2>模拟数据工具</h2>
<pre>import { generateMockData, generateTickData } from 'ai-stock-chart';

const klineData = generateMockData(200, 100);    // 200根K线，基准价100
const tickData = generateTickData(50.88, 240);   // 240个分钟点，昨收50.88</pre>
`;