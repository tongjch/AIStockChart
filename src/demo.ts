import { KLineChart, generateMockData, generateTickData, calcMA, calcBOLL } from './index';
import type { KLineData, TickData } from './index';
import './data/mock-api'; // hook fetch 拦截 /api/* 请求

// ========== 示例定义 ==========
interface Example {
  name: string;
  code: string;
  toolbar?: string;
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
  tickOptions: { prevClose: 50.88 },
});`,
    render: (c) => KLineChart.create({ container: c, type: 'tick', tickData, tickOptions: { prevClose: 50.88 } }),
  },
  'tick-area': {
    name: '分时面积图',
    code: `// 分时图默认以面积图展示
// 涨：蓝色渐变填充，跌：红色渐变填充
const chart = KLineChart.create({
  container: '#chart-container',
  type: 'tick',
  tickData: tickData,
  tickOptions: { prevClose: 50.88 },
  options: {
    style: {
      tickLineColor: '#42a5f5',
      tickAvgColor: '#f9a825',
    },
  },
});`,
    render: (c) => KLineChart.create({
      container: c, type: 'tick', tickData,
      tickOptions: { prevClose: 50.88 },
      options: { style: { tickLineColor: '#42a5f5', tickAvgColor: '#f9a825' } },
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
    visiblePoints: 120,
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
          chart.setTickOptions({ prevClose: 50.88, visiblePoints: parseInt((btn as HTMLElement).dataset.vp!) });
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

  'remote-kline': {
    name: '远程K线数据',
    code: `// data 传入 URL 字符串，自动 fetch 加载
const chart = KLineChart.create({
  container: '#chart-container',
  type: 'kline',
  data: '/api/kline?symbol=000001&period=day',
  indicators: [
    { type: 'ma', params: { periods: [5, 10, 20, 60] } },
  ],
  options: { visibleRange: 80 },
});

// 也可以通过方法动态加载
// chart.setData('/api/kline?symbol=600036');
// chart.loadKlineFromUrl('/api/kline');`,
    render: (c) => KLineChart.create({
      container: c, type: 'kline',
      data: '/api/kline',
      indicators: [{ type: 'ma', params: { periods: [5, 10, 20, 60] } }],
      options: { visibleRange: 80 },
    }),
  },

  'remote-tick': {
    name: '远程分时数据',
    code: `// type='tick' + data URL 自动加载分时数据
const chart = KLineChart.create({
  container: '#chart-container',
  type: 'tick',
  data: '/api/tick?symbol=000001',
  tickOptions: { prevClose: 50.88 },
});

// 也可以通过方法动态加载
// chart.setTickData('/api/tick?symbol=600036', { prevClose: 30.50 });
// chart.loadTickFromUrl('/api/tick');`,
    render: (c) => KLineChart.create({
      container: c, type: 'tick',
      data: '/api/tick',
      tickOptions: { prevClose: 50.88 },
    }),
  },

  'lazy-load': {
    name: '分段加载',
    toolbar: `<button class="period-btn active" data-period="day">日K</button>
      <button class="period-btn" data-period="week">周K</button>
      <button class="period-btn" data-period="month">月K</button>
      <button class="ind-btn active" data-ind="ma">MA</button>`,
    code: `// dataLoader 配置：拖动到左边缘自动加载更多历史数据
// dragSpeed: 3 加快拖拽速度（默认1）
const chart = KLineChart.create({
  container: '#chart-container',
  type: 'kline',
  data: generateMockData(300, 50),  // 初始加载 300 条
  indicators: [
    { type: 'ma', params: { periods: [5, 10, 20, 60] } },
  ],
  options: { visibleRange: 80 },
  interaction: { dragSpeed: 3 },
  dataLoader: {
    // 每次加载条数
    pageSize: 300,
    // 距离左边缘 20 根K线时触发
    preloadThreshold: 20,
    // 数据加载回调
    fetch: async (params) => {
      const { direction, fromTimestamp, count } = params;
      const resp = await fetch(
        \`/api/kline/page?direction=\${direction}\`
        + (fromTimestamp ? \`&fromTimestamp=\${fromTimestamp}\` : '')
        + \`&count=\${count}\`
      );
      return resp.json();
    },
  },
});

// 向左拖动图表，到达阈值后会自动加载更早的数据
// 无缝拼接，视图位置保持不变`,
    render: (c) => {
      const chart = KLineChart.create({
        container: c, type: 'kline',
        data: generateMockData(300, 50),
        indicators: [{ type: 'ma', params: { periods: [5, 10, 20, 60] } }],
        options: { visibleRange: 80 },
        interaction: { dragSpeed: 3 },
        dataLoader: {
          pageSize: 300,
          preloadThreshold: 20,
          fetch: async (params) => {
            const { direction, fromTimestamp, count } = params;
            const resp = await fetch(
              `/api/kline/page?direction=${direction}`
              + (fromTimestamp ? `&fromTimestamp=${fromTimestamp}` : '')
              + `&count=${count}`
            );
            return resp.json();
          },
        },
      });
      document.querySelectorAll('#example-toolbar .period-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#example-toolbar .period-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          chart.setPeriod((btn as HTMLElement).dataset.period as any);
        });
      });
      document.querySelectorAll('#example-toolbar .ind-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const isActive = btn.classList.toggle('active');
          chart.setIndicators(isActive ? [{ type: 'ma', params: { periods: [5, 10, 20, 60] } }] : []);
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
    document.getElementById(`page-${(tab as HTMLElement).dataset.page}`)!.classList.add('active');
  });
});

// ========== 示例切换 ==========
function loadExample(key: string) {
  const ex = examples[key];
  if (!ex) return;
  if (currentChart) currentChart.destroy();
  currentChart = null;

  document.querySelectorAll('.sidebar-item').forEach((item) => {
    item.classList.toggle('active', (item as HTMLElement).dataset.example === key);
  });

  document.getElementById('example-toolbar')!.innerHTML = ex.toolbar ?? '';
  document.getElementById('code-panel')!.innerHTML = (Prism as any).highlight(
    ex.code, (Prism as any).languages.typescript, 'typescript'
  );

  const container = document.getElementById('chart-container')!;
  container.innerHTML = '';
  currentChart = ex.render(container);
}

document.querySelectorAll('.sidebar-item').forEach((item) => {
  item.addEventListener('click', () => loadExample((item as HTMLElement).dataset.example!));
});
loadExample('kline-basic');

// ========== ECharts风格文档 ==========
const docSections: { id: string; label: string; sub?: string }[] = [
  { id: 'overview', label: '总览' },
  { id: 'quick-start', label: '快速开始' },
  { id: 'config', label: 'KLineChartConfig' },
  { id: 'config-options', label: 'ChartOptions', sub: 'config' },
  { id: 'config-style', label: 'ChartStyle', sub: 'config' },
  { id: 'config-tick', label: 'TickChartOptions', sub: 'config' },
  { id: 'config-indicator', label: 'IndicatorConfig', sub: 'config' },
  { id: 'config-interaction', label: 'Interaction', sub: 'config' },
  { id: 'data-format', label: '数据格式' },
  { id: 'remote-data', label: '远程数据加载', sub: 'data-format' },
  { id: 'lazy-load', label: '分段加载（增量数据）', sub: 'data-format' },
  { id: 'data-kline', label: 'KLineData', sub: 'data-format' },
  { id: 'data-tick', label: 'TickData', sub: 'data-format' },
  { id: 'api', label: '实例方法 & 事件' },
  { id: 'api-methods', label: '方法列表', sub: 'api' },
  { id: 'api-events', label: '事件回调', sub: 'api' },
  { id: 'utils', label: '工具函数' },
];

// 渲染左侧导航
const docNav = document.getElementById('doc-nav')!;
let currentNavGroup = '';
docSections.forEach((s) => {
  if (s.sub && s.sub !== currentNavGroup) {
    const title = docSections.find((d) => d.id === s.sub);
    if (title) {
      const el = document.createElement('div');
      el.className = 'doc-nav-item';
      el.style.cssText = 'padding-left:12px; font-weight:600; color:#606266; margin-top:8px; font-size:12px;';
      el.textContent = title.label;
      docNav.appendChild(el);
    }
    currentNavGroup = s.sub;
  }
  const el = document.createElement('div');
  el.className = `doc-nav-item${s.sub ? ' sub' : ''}${!s.sub ? ' active' : ''}`;
  el.textContent = s.label;
  el.dataset.target = s.id;
  el.addEventListener('click', () => {
    document.querySelectorAll('.doc-nav-item').forEach((n) => n.classList.remove('active'));
    el.classList.add('active');
    const target = document.getElementById(`doc-${s.id}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  docNav.appendChild(el);
});

// 渲染文档内容
function cfg(name: string, type: string, def: string, desc: string) {
  return `<tr><td class="cfg-name">${name}</td><td class="cfg-type">${type}</td><td class="cfg-default">${def}</td><td class="cfg-desc">${desc}</td></tr>`;
}

function renderDocCode(html: string): string {
  return html.replace(/<div class="doc-code">([\s\S]*?)<\/div>/g,
    '<div class="doc-code"><pre style="margin:0"><code class="language-typescript">$1</code></pre></div>');
}

const rawDoc = `
<!-- 总览 -->
<div id="doc-overview" class="doc-section">
  <h1>AIStockChart <span style="font-size:14px;color:#909399;font-weight:400">v1.0.0</span></h1>
  <p class="desc">基于 Canvas + TypeScript 的轻量级金融图表库，支持 K线图（蜡烛图）与分时图（面积图），提供丰富的交互与自定义能力。</p>
</div>

<!-- 快速开始 -->
<div id="doc-quick-start" class="doc-section">
  <h2>快速开始</h2>
  <div class="doc-code">npm install
npm run dev</div>
  <p>访问 <code>http://localhost:3200</code> 查看示例。</p>
  <p style="margin-top:12px">通过 JSON 配置创建图表：</p>
  <div class="doc-code">import { KLineChart, generateMockData } from './index';

const chart = KLineChart.create({
  container: '#chart-container',
  type: 'kline',
  data: generateMockData(200, 50),
  period: 'day',
  indicators: [{ type: 'ma', params: { periods: [5, 10, 20] } }],
  options: { visibleRange: 80 },
});</div>
</div>

<!-- KLineChartConfig -->
<div id="doc-config" class="doc-section">
  <h2>KLineChartConfig <span class="tag">核心配置</span></h2>
  <p>通过 <code>KLineChart.create(config)</code> 创建图表，<code>config</code> 支持以下属性：</p>
  <table class="config-table">
    <tr><th style="color:#909399;font-size:12px">属性名</th><th style="color:#909399;font-size:12px">类型</th><th style="color:#909399;font-size:12px">默认值</th><th style="color:#909399;font-size:12px">说明</th></tr>
    ${cfg('container', 'string', '—', 'CSS 选择器或 DOM 元素。<strong style="color:#1a1a1a">必填</strong>。')}
    ${cfg('type', "'kline' | 'tick'", "'kline'", '图表类型。kline=K线图，tick=分时面积图。')}
    ${cfg('data', 'KLineData[] / TickData[] / string', '—', '数据源。传入数组或数据加载 URL。K线/分时数据根据 type 自动识别。')}
    ${cfg('tickData', 'TickData[]', '—', '分时数据。仅 <code>type</code>=tick 时有效。')}
    ${cfg('tickOptions', 'TickChartOptions', '—', '分时图配置。仅 <code>type</code>=tick 时有效。')}
    ${cfg('period', "'day' | 'week' | 'month'", "'day'", 'K线周期。仅 <code>type</code>=kline 时有效。')}
    ${cfg('indicators', 'IndicatorConfig[]', '—', '技术指标配置列表。仅 <code>type</code>=kline 时有效。')}
    ${cfg('options', 'ChartOptions', '—', '图表全局选项。')}
    ${cfg('interaction', 'Interaction', '—', '交互行为开关。')}
    ${cfg('onLoad', '(chart) => void', '—', '图表创建完成回调。')}
    ${cfg('onClick', '(data, index) => void', '—', '点击数据点回调。')}
    ${cfg('onCrosshairMove', '(data, index) => void', '—', '十字光标移动回调。')}
  </table>
</div>

<!-- ChartOptions -->
<div id="doc-config-options" class="doc-section">
  <h2>ChartOptions <span class="tag">图表选项</span></h2>
  <p>通过 <code>config.options</code> 传入，控制图表布局与行为。</p>
  <table class="config-table">
    <tr><th style="color:#909399;font-size:12px">属性名</th><th style="color:#909399;font-size:12px">类型</th><th style="color:#909399;font-size:12px">默认值</th><th style="color:#909399;font-size:12px">说明</th></tr>
    ${cfg('visibleRange', 'number', '80', '默认可见的 K线根数。拖拽/缩放时会变化。')}
    ${cfg('minVisibleRange', 'number', '20', '缩放时最少可见 K线数。')}
    ${cfg('candleGap', 'number', '2', 'K线之间的间距（像素）。')}
    ${cfg('candleMinWidth', 'number', '3', 'K线最小宽度（像素）。')}
    ${cfg('candleMaxWidth', 'number', '40', 'K线最大宽度（像素）。')}
    ${cfg('priceAreaRatio', 'number', '0.75', '价格区域高度占比（0~1）。')}
    ${cfg('volumeAreaRatio', 'number', '0.25', '成交量区域高度占比（0~1）。')}
    ${cfg('rightPadding', 'number', '5', '右侧留白的 K线数量。')}
    ${cfg('showVolume', 'boolean', 'true', '是否显示成交量副图。')}
    ${cfg('showGrid', 'boolean', 'true', '是否显示背景网格线。')}
    ${cfg('yAxisWidth', 'number', '80', 'Y轴标签区域宽度（像素）。')}
    ${cfg('xAxisHeight', 'number', '28', 'X轴标签区域高度（像素）。')}
    ${cfg('pixelRatio', 'number', 'devicePixelRatio', 'Canvas 像素比，高清屏自动适配。')}
    ${cfg('style', 'ChartStyle', 'DEFAULT_STYLE', '样式配置。详见 <a href="javascript:void(0)" onclick="document.getElementById(\'doc-config-style\').scrollIntoView({behavior:\'smooth\'})" style="color:#4d96ff">ChartStyle</a>。')}
  </table>
</div>

<!-- ChartStyle -->
<div id="doc-config-style" class="doc-section">
  <h2>ChartStyle <span class="tag">样式</span></h2>
  <p>通过 <code>config.options.style</code> 传入，控制颜色、字体、线条等视觉样式。</p>

  <div class="config-group">
    <div class="config-group-header" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('open')">
      <span>全局样式</span><span class="arrow">▶</span>
    </div>
    <div class="config-group-body">
      <table class="config-table">
        ${cfg('backgroundColor', 'string', "'#ffffff'", '图表背景颜色。')}
        ${cfg('gridColor', 'string', "'#e4e7ed'", '网格线颜色。')}
        ${cfg('gridDash', 'number[]', '[4, 4]', '网格线虚线样式。设为 <code>[]</code> 为实线。')}
        ${cfg('textColor', 'string', "'#606266'", '通用文字颜色。')}
        ${cfg('crosshairColor', 'string', "'#606266'", '十字光标颜色。')}
        ${cfg('candleBorderWidth', 'number', '1', 'K线边框宽度（像素）。')}
        ${cfg('indicatorTextColor', 'string', "'#606266'", '指标文字颜色。')}
      </table>
    </div>
  </div>

  <div class="config-group">
    <div class="config-group-header" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('open')">
      <span>K线颜色</span><span class="arrow">▶</span>
    </div>
    <div class="config-group-body">
      <table class="config-table">
        ${cfg('upColor', 'string', "'#ef5350'", '阳线（涨）填充颜色。')}
        ${cfg('downColor', 'string', "'#26a69a'", '阴线（跌）填充颜色。')}
        ${cfg('volumeUpColor', 'string', "'rgba(0,184,148,0.5)'", '成交量柱——涨颜色。')}
        ${cfg('volumeDownColor', 'string', "'rgba(255,107,107,0.5)'", '成交量柱——跌颜色。')}
        ${cfg('maColors', 'string[]', '[5色]', 'MA 均线颜色数组，按顺序对应各周期。默认黄/绿/蓝/红/紫。')}
      </table>
    </div>
  </div>

  <div class="config-group">
    <div class="config-group-header" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('open')">
      <span>分时图样式</span><span class="arrow">▶</span>
    </div>
    <div class="config-group-body">
      <table class="config-table">
        ${cfg('tickLineColor', 'string', "'#42a5f5'", '分时价格曲线颜色。')}
        ${cfg('tickAvgColor', 'string', "'#f9a825'", '均价线颜色。')}
        ${cfg('tickBaseColor', 'string', "'#606266'", '基准线（昨收）颜色。')}
        ${cfg('tickFillUpColor', 'string', "'rgba(0,184,148,0.15)'", '面积图涨填充颜色。')}
        ${cfg('tickFillDownColor', 'string', "'rgba(255,107,107,0.15)'", '面积图跌填充颜色。')}
      </table>
    </div>
  </div>
</div>

<!-- TickChartOptions -->
<div id="doc-config-tick" class="doc-section">
  <h2>TickChartOptions <span class="tag">分时配置</span></h2>
  <p>通过 <code>config.tickOptions</code> 传入，控制分时图的交易时间和展示行为。</p>
  <table class="config-table">
    <tr><th style="color:#909399;font-size:12px">属性名</th><th style="color:#909399;font-size:12px">类型</th><th style="color:#909399;font-size:12px">默认值</th><th style="color:#909399;font-size:12px">说明</th></tr>
    ${cfg('prevClose', 'number', '—', '<strong style="color:#1a1a1a">必填</strong>。昨日收盘价，作为涨跌幅计算的基准线和面积图基线。')}
    ${cfg('openTime', 'number', '930', '开盘时间。格式 HHMM，如 930 表示 09:30。')}
    ${cfg('closeTime', 'number', '1500', '收盘时间。格式 HHMM。')}
    ${cfg('lunchStart', 'number', '1130', '午休开始时间。午休时段数据不显示。')}
    ${cfg('lunchEnd', 'number', '1300', '午休结束时间。')}
    ${cfg('visiblePoints', 'number', '0', '展示的最近数据点数量。<code>0</code> 表示显示全部。适合数据量大时控制渲染范围。')}
  </table>
</div>

<!-- IndicatorConfig -->
<div id="doc-config-indicator" class="doc-section">
  <h2>IndicatorConfig <span class="tag">指标配置</span></h2>
  <p>通过 <code>config.indicators</code> 传入，支持同时叠加多个技术指标。</p>
  <table class="config-table">
    <tr><th style="color:#909399;font-size:12px">属性名</th><th style="color:#909399;font-size:12px">类型</th><th style="color:#909399;font-size:12px">默认值</th><th style="color:#909399;font-size:12px">说明</th></tr>
    ${cfg('type', 'string', '—', "指标类型。<code>'ma'</code> = 移动平均线，<code>'boll'</code> = 布林带。")}
    ${cfg('params', 'object', '—', '指标参数，不同指标参数不同。详见下方。')}
  </table>

  <div class="config-group" style="margin-top:16px">
    <div class="config-group-header open" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('open')">
      <span>MA 参数 <code style="color:#909399;font-size:12px">params</code></span><span class="arrow">▶</span>
    </div>
    <div class="config-group-body open">
      <table class="config-table">
        ${cfg('periods', 'number[]', '[5, 10, 20, 30, 60]', '均线周期数组。每个值对应一条均线。')}
      </table>
      <div class="doc-code">{ type: 'ma', params: { periods: [5, 10, 20, 30, 60] } }</div>
    </div>
  </div>

  <div class="config-group">
    <div class="config-group-header" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('open')">
      <span>BOLL 参数 <code style="color:#909399;font-size:12px">params</code></span><span class="arrow">▶</span>
    </div>
    <div class="config-group-body">
      <table class="config-table">
        ${cfg('period', 'number', '20', '布林带中轨周期。')}
        ${cfg('multiplier', 'number', '2', '标准差倍数。控制上下轨宽度。')}
      </table>
      <div class="doc-code">{ type: 'boll', params: { period: 20, multiplier: 2 } }</div>
    </div>
  </div>
</div>

<!-- Interaction -->
<div id="doc-config-interaction" class="doc-section">
  <h2>Interaction <span class="tag">交互配置</span></h2>
  <p>通过 <code>config.interaction</code> 传入，控制用户交互行为。</p>
  <table class="config-table">
    <tr><th style="color:#909399;font-size:12px">属性名</th><th style="color:#909399;font-size:12px">类型</th><th style="color:#909399;font-size:12px">默认值</th><th style="color:#909399;font-size:12px">说明</th></tr>
    ${cfg('drag', 'boolean', 'true', '启用鼠标拖拽平移 K线。分时图固定不可拖拽。')}
    ${cfg('zoom', 'boolean', 'true', '启用鼠标滚轮缩放 K线。分时图固定不可缩放。')}
    ${cfg('crosshair', 'boolean', 'true', '启用十字光标。鼠标移动时显示价格/时间辅助线。')}
    ${cfg('touch', 'boolean', 'true', '启用触摸手势。单指拖拽、双指缩放。')}
    ${cfg('dragSpeed', 'number', '1', '拖拽速度倍率。值越大拖动越快（如 2 = 两倍速），默认 1。')}
  </table>
  <div class="doc-code">interaction: {
  drag: true,
  dragSpeed: 1,     // 拖拽速度倍率
  zoom: true,
  crosshair: true,
  touch: true,
}</div>
</div>

<!-- 数据格式 -->
<div id="doc-data-format" class="doc-section">
  <h2>数据格式</h2>
</div>

<div id="doc-remote-data" class="doc-section">
  <h2>远程数据加载</h2>
  <p>data 属性支持传入 URL 字符串，图表会自动 <code>fetch</code> 加载 JSON 数据。</p>
  <div class="doc-code">// 方式一：config.data 传 URL
KLineChart.create({
  container: '#chart',
  type: 'kline',
  data: '/api/kline?symbol=000001&period=day',
});

// 方式二：setData / setTickData 传 URL
chart.setData('/api/kline?symbol=600036');
chart.setTickData('/api/tick?symbol=000001', { prevClose: 50.88 });

// 方式三：显式调用
chart.loadKlineFromUrl(url);
chart.loadTickFromUrl(url);</div>
  <p style="margin-top:12px"><strong>注意：</strong></p>
  <table class="config-table">
    <tr><td class="cfg-desc">远程接口需返回 JSON 数组，格式与 KLineData[] 或 TickData[] 一致。</td></tr>
    <tr><td class="cfg-desc"><code>loadKlineFromUrl</code> 和 <code>loadTickFromUrl</code> 返回 Promise，可 await。</td></tr>
    <tr><td class="cfg-desc">加载失败时会在控制台打印错误，图表保留上次数据不变。</td></tr>
    <tr><td class="cfg-desc">URL 中可携带查询参数（股票代码、周期等），由后端解析。</td></tr>
  </table>
</div>

<!-- 分段加载 -->
<div id="doc-lazy-load" class="doc-section">
  <h2>分段加载（增量数据）</h2>
  <p>当K线数据量较大时，可通过 <code>dataLoader</code> 配置实现<strong>按需加载</strong>：初始只加载最近的数据，用户向左拖动时自动加载更早的历史数据。</p>

  <h3 style="margin-top:16px;font-size:14px">配置项</h3>
  <table class="config-table">
    <tr><th style="color:#909399;font-size:12px">属性</th><th style="color:#909399;font-size:12px">类型</th><th style="color:#909399;font-size:12px">默认值</th><th style="color:#909399;font-size:12px">说明</th></tr>
    <tr><td class="cfg-name">fetch</td><td class="cfg-type">(params) =&gt; Promise&lt;KLineData[]&gt;</td><td class="cfg-default">—</td><td class="cfg-desc"><strong>必填</strong>。数据加载回调，返回 Promise。</td></tr>
    <tr><td class="cfg-name">pageSize</td><td class="cfg-type">number</td><td class="cfg-default">300</td><td class="cfg-desc">每次请求的数据条数。</td></tr>
    <tr><td class="cfg-name">preloadThreshold</td><td class="cfg-type">number</td><td class="cfg-default">20</td><td class="cfg-desc">距离左边缘多少根K线时触发加载。</td></tr>
  </table>

  <h3 style="margin-top:16px;font-size:14px">fetch 参数（DataLoaderParams）</h3>
  <table class="config-table">
    <tr><th style="color:#909399;font-size:12px">属性</th><th style="color:#909399;font-size:12px">类型</th><th style="color:#909399;font-size:12px">说明</th></tr>
    <tr><td class="cfg-name">direction</td><td class="cfg-type">'prev' | 'next'</td><td class="cfg-desc">加载方向。'prev' = 更早的历史数据，'next' = 更新的数据。</td></tr>
    <tr><td class="cfg-name">fromTimestamp</td><td class="cfg-type">number?</td><td class="cfg-desc">当前数据首条时间戳（direction='prev' 时提供），用于后端定位分页起点。</td></tr>
    <tr><td class="cfg-name">toTimestamp</td><td class="cfg-type">number?</td><td class="cfg-desc">当前数据末条时间戳（direction='next' 时提供）。</td></tr>
    <tr><td class="cfg-name">count</td><td class="cfg-type">number</td><td class="cfg-desc">请求的数据条数（等于 pageSize）。</td></tr>
  </table>

  <h3 style="margin-top:16px;font-size:14px">工作流程</h3>
  <div class="doc-code">// 1. 初始化时加载最近 300 条数据
const chart = KLineChart.create({
  type: 'kline',
  data: initialData,       // 初始数据（如最近300条）
  dataLoader: {
    pageSize: 300,
    preloadThreshold: 20,
    fetch: async ({ direction, fromTimestamp, count }) => {
      // direction = 'prev' 时，fromTimestamp 是当前最早的数据时间戳
      // 后端据此返回更早的 count 条数据
      const url = '/api/kline/page?direction=' + direction
        + (fromTimestamp ? '&from=' + fromTimestamp : '')
        + '&count=' + count;
      const resp = await fetch(url);
      return resp.json();
    },
  },
});

// 2. 用户向左拖动，offset 接近 0 时自动触发 loadPrev()
//    → 调用 fetch({ direction: 'prev', fromTimestamp, count: 300 })
//    → 新数据拼接到头部，视图位置自动保持不变

// 3. 当 fetch 返回空数组时，标记 hasMorePrev = false，不再加载</div>

  <h3 style="margin-top:16px;font-size:14px">实例方法</h3>
  <table class="config-table">
    <tr><th style="color:#909399;font-size:12px">方法</th><th style="color:#909399;font-size:12px">说明</th></tr>
    <tr><td class="cfg-name">resetLoader()</td><td class="cfg-desc">重置加载状态（hasMorePrev / hasMoreNext 恢复为 true）。适用于切换股票代码等场景。</td></tr>
  </table>

  <p style="margin-top:12px"><strong>注意：</strong></p>
  <table class="config-table">
    <tr><td class="cfg-desc">分段加载仅支持K线图（type='kline'），分时图通常数据量不大，不需要分段。</td></tr>
    <tr><td class="cfg-desc">内置 loading 锁，同一时刻最多一个请求，避免重复加载。</td></tr>
    <tr><td class="cfg-desc">后端接口需返回 JSON 数组，按时间升序排列。</td></tr>
    <tr><td class="cfg-desc">切换股票或周期后，需调用 <code>resetLoader()</code> 重置加载状态。</td></tr>
  </table>
</div>

<div id="doc-data-kline" class="doc-section">
  <h2>KLineData <span class="tag">K线数据</span></h2>
  <table class="config-table">
    ${cfg('timestamp', 'number', '—', '时间戳（毫秒）。')}
    ${cfg('open', 'number', '—', '开盘价。')}
    ${cfg('high', 'number', '—', '最高价。')}
    ${cfg('low', 'number', '—', '最低价。')}
    ${cfg('close', 'number', '—', '收盘价。')}
    ${cfg('volume', 'number', '—', '成交量。')}
    ${cfg('turnover', 'number', '—', '成交额（可选）。')}
  </table>
  <div class="doc-code">const kline: KLineData = {
  timestamp: 1716240000000,
  open: 50.12,
  high: 51.88,
  low: 49.50,
  close: 51.20,
  volume: 125000,
};</div>
</div>

<div id="doc-data-tick" class="doc-section">
  <h2>TickData <span class="tag">分时数据</span></h2>
  <table class="config-table">
    ${cfg('timestamp', 'number', '—', '时间戳（毫秒）。')}
    ${cfg('price', 'number', '—', '当前价格。')}
    ${cfg('volume', 'number', '—', '成交量。')}
    ${cfg('avgPrice', 'number', '—', '均价（可选）。不传则自动计算。')}
  </table>
  <div class="doc-code">const tick: TickData = {
  timestamp: 1716240000000,
  price: 51.20,
  volume: 5200,
};</div>
</div>

<!-- API -->
<div id="doc-api" class="doc-section">
  <h2>实例方法 & 事件</h2>
</div>

<div id="doc-api-methods" class="doc-section">
  <h2>方法列表 <span class="tag">API</span></h2>
  <table class="method-table">
    <tr><th style="color:#909399;font-size:12px">方法</th><th style="color:#909399;font-size:12px">返回值</th><th style="color:#909399;font-size:12px">说明</th></tr>
    <tr><td class="method-name">setData(data: KLineData[] / string)</td><td class="method-ret">this / Promise</td><td class="method-desc">设置 K线数据。传数组立即生效；传 URL 异步加载（返回 Promise）。</td></tr>
    <tr><td class="method-name">setTickData(data, options?)</td><td class="method-ret">this / Promise</td><td class="method-desc">设置分时数据。传数组立即生效；传 URL 异步加载。</td></tr>
    <tr><td class="method-name">setTickOptions(options)</td><td class="method-ret">this</td><td class="method-desc">更新分时图配置（如 visiblePoints），立即重新渲染。</td></tr>
    <tr><td class="method-name">setType(type)</td><td class="method-ret">this</td><td class="method-desc">切换图表类型。'kline' 或 'tick'。</td></tr>
    <tr><td class="method-name">setPeriod(period)</td><td class="method-ret">this</td><td class="method-desc">切换 K线周期。'day' / 'week' / 'month'。</td></tr>
    <tr><td class="method-name">setIndicatorConfigs(configs)</td><td class="method-ret">this</td><td class="method-desc">通过配置对象设置指标。支持 MA、BOLL。</td></tr>
    <tr><td class="method-name">setIndicators(indicators)</td><td class="method-ret">this</td><td class="method-desc">直接设置已计算的指标结果（IndicatorResult[]）。</td></tr>
    <tr><td class="method-name">getType()</td><td class="method-ret">string</td><td class="method-desc">获取当前图表类型。</td></tr>
    <tr><td class="method-name">getKlineData()</td><td class="method-ret">KLineData[]</td><td class="method-desc">获取当前 K线数据。</td></tr>
    <tr><td class="method-name">getTickData()</td><td class="method-ret">TickData[]</td><td class="method-desc">获取当前分时数据。</td></tr>
    <tr><td class="method-name">getPeriod()</td><td class="method-ret">string</td><td class="method-desc">获取当前 K线周期。</td></tr>
    <tr><td class="method-name">destroy()</td><td class="method-ret">void</td><td class="method-desc">销毁图表实例，移除 Canvas DOM。</td></tr>
  </table>

  <p style="margin-top:16px">静态方法：</p>
  <table class="method-table">
    <tr><td class="method-name">KLineChart.create(config)</td><td class="method-ret">KLineChart</td><td class="method-desc">通过 JSON 配置创建图表实例（推荐方式）。</td></tr>
  </table>
</div>

<div id="doc-api-events" class="doc-section">
  <h2>事件回调 <span class="tag">API</span></h2>
  <p>在 <code>KLineChartConfig</code> 中配置。</p>
  <table class="event-table">
    <tr><th style="color:#909399;font-size:12px">回调名</th><th style="color:#909399;font-size:12px">参数</th><th style="color:#909399;font-size:12px">说明</th></tr>
    <tr><td class="event-name">onLoad</td><td style="color:#4d96ff">(chart: KLineChart)</td><td class="event-desc">图表创建完成时触发。</td></tr>
    <tr><td class="event-name">onClick</td><td style="color:#4d96ff">(data, index: number)</td><td class="event-desc">点击数据点时触发。data 类型根据当前图表类型为 KLineData 或 TickData。</td></tr>
    <tr><td class="event-name">onCrosshairMove</td><td style="color:#4d96ff">(data, index: number)</td><td class="event-desc">十字光标移动时触发。光标离开时 data 为 null，index 为 -1。</td></tr>
  </table>
  <div class="doc-code">KLineChart.create({
  container: '#chart',
  type: 'kline',
  data: klineData,
  onLoad: (chart) => console.log('图表就绪'),
  onClick: (data, idx) => console.log('点击:', data, idx),
  onCrosshairMove: (data, idx) => {
    if (data) console.log('光标:', data.price ?? data.close);
  },
});</div>
</div>

<!-- 工具函数 -->
<div id="doc-utils" class="doc-section">
  <h2>工具函数</h2>
  <table class="method-table">
    <tr><th style="color:#909399;font-size:12px">函数</th><th style="color:#909399;font-size:12px">参数</th><th style="color:#909399;font-size:12px">返回值</th><th style="color:#909399;font-size:12px">说明</th></tr>
    <tr><td class="method-name">generateMockData</td><td style="color:#4d96ff">(count, basePrice)</td><td class="method-ret">KLineData[]</td><td class="method-desc">生成模拟 K线数据。</td></tr>
    <tr><td class="method-name">generateTickData</td><td style="color:#4d96ff">(basePrice, count)</td><td class="method-ret">TickData[]</td><td class="method-desc">生成模拟分时数据。</td></tr>
    <tr><td class="method-name">calcMA</td><td style="color:#4d96ff">(klines, periods?)</td><td class="method-ret">IndicatorResult</td><td class="method-desc">计算 MA 均线指标。</td></tr>
    <tr><td class="method-name">calcBOLL</td><td style="color:#4d96ff">(klines, period?, mult?)</td><td class="method-ret">IndicatorResult</td><td class="method-desc">计算 BOLL 布林带指标。</td></tr>
    <tr><td class="method-name">toWeekly</td><td style="color:#4d96ff">(klines)</td><td class="method-ret">KLineData[]</td><td class="method-desc">将日K数据聚合为周K。</td></tr>
    <tr><td class="method-name">toMonthly</td><td style="color:#4d96ff">(klines)</td><td class="method-ret">KLineData[]</td><td class="method-desc">将日K数据聚合为月K。</td></tr>
  </table>
</div>
`;

document.getElementById('doc-main')!.innerHTML = renderDocCode(rawDoc);
(Prism as any).highlightAllUnder(document.getElementById('doc-main')!);