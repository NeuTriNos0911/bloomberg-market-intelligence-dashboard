import './style.css'
import {
  Activity,
  BarChart3,
  CalendarClock,
  createIcons,
  Download,
  Globe2,
  Newspaper,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide'

type Lens = 'Global' | 'Equities' | 'Rates' | 'Commodities'
type Range = '1D' | '1W' | '1M' | 'YTD'
type SortKey = 'symbol' | 'price' | 'change' | 'volume'

type MarketItem = {
  symbol: string
  label: string
  price: number
  change: number
  unit?: string
}

type WatchItem = {
  symbol: string
  name: string
  sector: string
  price: number
  change: number
  volume: string
  signal: 'Buy' | 'Hold' | 'Trim'
  spark: number[]
}

type NewsItem = {
  source: string
  headline: string
  sentiment: number
  tag: string
}

const state = {
  lens: 'Global' as Lens,
  range: '1M' as Range,
  query: '',
  sortKey: 'change' as SortKey,
  sortDirection: -1,
  refreshCount: 0,
  lastUpdated: new Date(),
}

const AUTO_REFRESH_MS = 1000
let autoRefreshHandle: number | undefined
let renderQueued = false

const marketStrip: MarketItem[] = [
  { symbol: 'SPX', label: 'S&P 500', price: 6731.44, change: 0.42 },
  { symbol: 'NDX', label: 'Nasdaq 100', price: 24691.12, change: 0.68 },
  { symbol: 'SX5E', label: 'Euro Stoxx 50', price: 5528.09, change: -0.16 },
  { symbol: 'NKY', label: 'Nikkei 225', price: 41302.85, change: 0.21 },
  { symbol: 'DXY', label: 'Dollar Index', price: 101.37, change: -0.28 },
  { symbol: 'US10Y', label: 'US 10Y', price: 4.31, change: -0.05, unit: '%' },
  { symbol: 'BRENT', label: 'Brent Crude', price: 79.74, change: 1.12 },
  { symbol: 'XAU', label: 'Gold Spot', price: 3294.2, change: -0.34 },
  { symbol: 'BTC', label: 'Bitcoin', price: 114820, change: 1.84 },
]

const watchlist: WatchItem[] = [
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corp',
    sector: 'AI Infrastructure',
    price: 194.28,
    change: 2.74,
    volume: '63.1M',
    signal: 'Buy',
    spark: [41, 43, 42, 47, 46, 49, 53, 52, 55, 58],
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corp',
    sector: 'Cloud Software',
    price: 523.11,
    change: 0.88,
    volume: '24.7M',
    signal: 'Buy',
    spark: [71, 70, 73, 72, 75, 78, 77, 80, 83, 85],
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc',
    sector: 'Consumer Tech',
    price: 228.64,
    change: -0.41,
    volume: '42.5M',
    signal: 'Hold',
    spark: [52, 50, 51, 49, 48, 48, 47, 49, 50, 49],
  },
  {
    symbol: 'JPM',
    name: 'JPMorgan Chase',
    sector: 'Banks',
    price: 317.95,
    change: -0.76,
    volume: '11.4M',
    signal: 'Hold',
    spark: [65, 66, 64, 63, 60, 61, 59, 58, 60, 59],
  },
  {
    symbol: 'XOM',
    name: 'Exxon Mobil',
    sector: 'Energy',
    price: 117.22,
    change: 1.31,
    volume: '18.8M',
    signal: 'Buy',
    spark: [35, 36, 38, 39, 37, 40, 42, 43, 45, 46],
  },
  {
    symbol: 'TSM',
    name: 'Taiwan Semi ADR',
    sector: 'Semiconductors',
    price: 286.03,
    change: 1.96,
    volume: '15.6M',
    signal: 'Buy',
    spark: [48, 49, 51, 55, 53, 56, 59, 60, 62, 64],
  },
  {
    symbol: 'INFY',
    name: 'Infosys ADR',
    sector: 'India IT',
    price: 22.14,
    change: 0.58,
    volume: '9.3M',
    signal: 'Hold',
    spark: [30, 31, 31, 32, 34, 33, 34, 35, 35, 36],
  },
  {
    symbol: 'LVMUY',
    name: 'LVMH ADR',
    sector: 'Luxury',
    price: 151.27,
    change: -1.18,
    volume: '1.2M',
    signal: 'Trim',
    spark: [62, 60, 58, 57, 55, 54, 55, 53, 52, 50],
  },
]

const sectors = [
  { name: 'AI Infra', value: 2.8 },
  { name: 'Semis', value: 2.1 },
  { name: 'Cloud', value: 1.6 },
  { name: 'Copper', value: 1.9 },
  { name: 'India IT', value: 1.4 },
  { name: 'Industrials', value: 0.7 },
  { name: 'Biotech', value: 0.4 },
  { name: 'Luxury', value: -0.3 },
  { name: 'Utilities', value: -0.5 },
  { name: 'Banks', value: -0.8 },
  { name: 'Airlines', value: -1.1 },
  { name: 'Energy Majors', value: -1.2 },
]

const macroEvents = [
  { time: '08:30 NY', event: 'US CPI YoY', impact: 'High', actual: '3.1%', estimate: '3.2%', prior: '3.2%' },
  { time: '10:00 LD', event: 'Euro Area Industrial Output', impact: 'Medium', actual: '+0.4%', estimate: '+0.2%', prior: '-0.1%' },
  { time: '12:00 MU', event: 'India CPI', impact: 'High', actual: '4.6%', estimate: '4.7%', prior: '4.8%' },
  { time: '14:00 NY', event: 'FOMC Minutes', impact: 'High', actual: 'Due', estimate: 'Watch', prior: 'Hawkish' },
  { time: '23:50 TK', event: 'Japan GDP QoQ', impact: 'Medium', actual: 'Due', estimate: '+0.3%', prior: '+0.1%' },
]

const newsItems: NewsItem[] = [
  {
    source: 'Markets Desk',
    headline: 'US yields fade as growth data softens and duration demand returns',
    sentiment: 38,
    tag: 'Rates',
  },
  {
    source: 'Equity Strategy',
    headline: 'Semiconductor supply chain guides above consensus into next quarter',
    sentiment: 82,
    tag: 'Equities',
  },
  {
    source: 'FX Radar',
    headline: 'Dollar momentum weakens as real-rate differentials compress',
    sentiment: 44,
    tag: 'Global',
  },
  {
    source: 'Commodities',
    headline: 'Energy spreads widen after refinery outages tighten prompt barrels',
    sentiment: 71,
    tag: 'Commodities',
  },
]

const lensSummaries: Record<Lens, { regime: string; conviction: string; note: string; color: string }> = {
  Global: {
    regime: 'Risk-On',
    conviction: 'Moderate',
    note: 'Breadth improved, dollar pressure faded, and cyclical leadership widened.',
    color: '#23d18b',
  },
  Equities: {
    regime: 'Growth Lead',
    conviction: 'High',
    note: 'Mega-cap tech is firm, but small-cap participation still trails.',
    color: '#7dd3fc',
  },
  Rates: {
    regime: 'Bull Steepen',
    conviction: 'Medium',
    note: 'Front-end yields eased while inflation breakevens stayed contained.',
    color: '#c084fc',
  },
  Commodities: {
    regime: 'Supply Tight',
    conviction: 'Medium',
    note: 'Crude structure is firmer while metals retain China beta support.',
    color: '#f5a623',
  },
}

const chartData: Record<Lens, Record<Range, number[]>> = {
  Global: {
    '1D': [50, 51, 50, 53, 54, 55, 54, 56, 58, 59, 60, 61],
    '1W': [47, 49, 48, 51, 52, 54, 55, 56, 58, 59, 61, 62],
    '1M': [42, 44, 43, 46, 48, 51, 49, 52, 54, 57, 59, 63],
    YTD: [35, 37, 42, 40, 44, 46, 49, 53, 55, 56, 60, 64],
  },
  Equities: {
    '1D': [52, 53, 54, 53, 56, 57, 59, 58, 61, 62, 63, 65],
    '1W': [48, 50, 52, 51, 55, 58, 59, 60, 62, 64, 66, 68],
    '1M': [43, 46, 45, 49, 52, 56, 55, 59, 62, 63, 66, 69],
    YTD: [32, 36, 39, 43, 47, 51, 55, 56, 60, 63, 67, 71],
  },
  Rates: {
    '1D': [59, 57, 56, 55, 53, 51, 52, 50, 49, 48, 47, 46],
    '1W': [63, 61, 59, 58, 56, 55, 53, 51, 50, 48, 47, 45],
    '1M': [66, 63, 64, 60, 59, 56, 57, 53, 51, 50, 47, 44],
    YTD: [72, 70, 67, 65, 61, 59, 56, 54, 51, 49, 46, 43],
  },
  Commodities: {
    '1D': [45, 47, 49, 48, 50, 52, 55, 54, 56, 59, 58, 61],
    '1W': [42, 44, 46, 47, 49, 53, 52, 55, 57, 58, 61, 63],
    '1M': [38, 41, 40, 43, 45, 48, 51, 54, 53, 57, 60, 62],
    YTD: [31, 34, 37, 39, 42, 46, 47, 51, 55, 56, 59, 64],
  },
}

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('App root not found')
}

const appRoot = app

function signed(value: number, digits = 2) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`
}

function formatTimestamp(date: Date) {
  const datePart = date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })
  const timePart = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0')

  return `${datePart}, ${timePart}.${milliseconds}`
}

function liveStatusText() {
  return `Auto 1s / Tick ${state.refreshCount.toLocaleString('en-US')} / Updated ${formatTimestamp(state.lastUpdated)}`
}

function escapeAttribute(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function formatPrice(item: MarketItem | WatchItem) {
  const unit = 'unit' in item ? item.unit : undefined
  if (unit === '%') return `${item.price.toFixed(2)}%`
  if (item.price > 999) return item.price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return item.price.toFixed(2)
}

function jitter(value: number, index = 0, scale = 0.04) {
  const wave = Math.sin((state.refreshCount + 1) * (index + 2.7)) * scale
  return value + wave
}

function trendClass(value: number) {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'neutral'
}

function sparkline(points: number[]) {
  const width = 104
  const height = 34
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const d = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width
      const y = height - ((point - min) / span) * height
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return `
    <svg class="sparkline" viewBox="0 0 ${width} ${height}" role="img" aria-label="Price sparkline">
      <path d="${d}" />
    </svg>
  `
}

function mainChart() {
  const points = chartData[state.lens][state.range].map((point, index) => point + jitter(0, index, 1.2))
  const width = 720
  const height = 270
  const min = Math.min(...points) - 3
  const max = Math.max(...points) + 3
  const span = max - min || 1
  const coords = points.map((point, index) => {
    const x = 24 + (index / (points.length - 1)) * (width - 48)
    const y = height - 30 - ((point - min) / span) * (height - 62)
    return { x, y }
  })
  const path = coords.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
  const area = `${path} L${coords.at(-1)?.x.toFixed(1)},${height - 30} L${coords[0].x.toFixed(1)},${height - 30} Z`
  const yGuides = [0.2, 0.4, 0.6, 0.8]
    .map((ratio) => {
      const y = 18 + ratio * (height - 54)
      return `<line x1="24" x2="${width - 24}" y1="${y}" y2="${y}" />`
    })
    .join('')

  return `
    <svg class="main-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${state.lens} ${state.range} performance chart">
      <defs>
        <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${lensSummaries[state.lens].color}" stop-opacity="0.4" />
          <stop offset="100%" stop-color="${lensSummaries[state.lens].color}" stop-opacity="0" />
        </linearGradient>
      </defs>
      <g class="chart-grid">${yGuides}</g>
      <path class="chart-area" d="${area}" />
      <path class="chart-line" d="${path}" style="stroke:${lensSummaries[state.lens].color}" />
      ${coords
        .map((point, index) =>
          index % 3 === 0 || index === coords.length - 1
            ? `<circle cx="${point.x}" cy="${point.y}" r="4" style="fill:${lensSummaries[state.lens].color}" />`
            : '',
        )
        .join('')}
    </svg>
  `
}

function heatColor(value: number) {
  const intensity = Math.min(Math.abs(value) / 3, 1)
  if (value >= 0) {
    return `background: color-mix(in srgb, #14211c ${Math.round((1 - intensity) * 100)}%, #23d18b);`
  }
  return `background: color-mix(in srgb, #24161a ${Math.round((1 - intensity) * 100)}%, #ff5c7a);`
}

function sortWatchlist(items: WatchItem[]) {
  return [...items].sort((a, b) => {
    const direction = state.sortDirection
    if (state.sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * direction
    if (state.sortKey === 'volume') return parseFloat(a.volume) > parseFloat(b.volume) ? direction : -direction
    return (a[state.sortKey] - b[state.sortKey]) * direction
  })
}

function filteredWatchlist() {
  const query = state.query.trim().toLowerCase()
  const filtered = query
    ? watchlist.filter((item) =>
        [item.symbol, item.name, item.sector, item.signal].some((value) => value.toLowerCase().includes(query)),
      )
    : watchlist

  return sortWatchlist(filtered)
}

function confidenceBars() {
  const metrics = [
    { label: 'Breadth', value: 68, tone: 'positive' },
    { label: 'Liquidity', value: 61, tone: 'positive' },
    { label: 'Vol Pressure', value: 34, tone: 'negative' },
    { label: 'Credit Stress', value: 27, tone: 'neutral' },
  ]

  return metrics
    .map(
      (metric) => `
        <div class="metric-row">
          <div>
            <span>${metric.label}</span>
            <strong>${metric.value}</strong>
          </div>
          <div class="meter ${metric.tone}">
            <span style="width:${metric.value}%"></span>
          </div>
        </div>
      `,
    )
    .join('')
}

function refreshSnapshot() {
  state.refreshCount += 1
  state.lastUpdated = new Date()
}

function renderLiveData() {
  const ticker = document.querySelector<HTMLElement>('.ticker-strip')
  const chart = document.querySelector<SVGElement>('.main-chart')
  const watchRows = document.querySelector<HTMLTableSectionElement>('.watch-panel tbody')
  const timestamp = document.querySelector<HTMLElement>('.timestamp')

  if (ticker) ticker.innerHTML = marketTicker()
  if (chart) chart.outerHTML = mainChart()
  if (watchRows) watchRows.innerHTML = watchlistRows()
  if (timestamp) timestamp.textContent = liveStatusText()
}

function queueRender() {
  if (renderQueued) return

  renderQueued = true
  window.requestAnimationFrame(() => {
    renderQueued = false
    renderLiveData()
  })
}

function startAutoRefresh() {
  if (autoRefreshHandle !== undefined) return

  autoRefreshHandle = window.setInterval(() => {
    refreshSnapshot()
    queueRender()
  }, AUTO_REFRESH_MS)
}

function marketTicker() {
  return marketStrip
    .map((item, index) => {
      const change = jitter(item.change, index, 0.07)
      const price = { ...item, price: item.price + jitter(0, index, item.price > 1000 ? 8 : 0.06) }
      return `
        <article class="ticker-item ${trendClass(change)}">
          <div>
            <strong>${item.symbol}</strong>
            <span>${item.label}</span>
          </div>
          <div>
            <b>${formatPrice(price)}</b>
            <em>${signed(change)}%</em>
          </div>
        </article>
      `
    })
    .join('')
}

function watchlistRows() {
  const rows = filteredWatchlist()

  if (!rows.length) {
    return `<tr><td class="empty-row" colspan="7">No instruments match this filter.</td></tr>`
  }

  return rows
    .map((item, index) => {
      const change = jitter(item.change, index, 0.11)
      const price = item.price + jitter(0, index, item.price > 100 ? 0.9 : 0.08)
      return `
        <tr>
          <td>
            <strong>${item.symbol}</strong>
            <span>${item.name}</span>
          </td>
          <td>${item.sector}</td>
          <td>${price.toFixed(price > 100 ? 2 : 3)}</td>
          <td class="${trendClass(change)}">${signed(change)}%</td>
          <td>${item.volume}</td>
          <td><span class="signal ${item.signal.toLowerCase()}">${item.signal}</span></td>
          <td>${sparkline(item.spark)}</td>
        </tr>
      `
    })
    .join('')
}

function macroRows() {
  return macroEvents
    .map(
      (event) => `
        <tr>
          <td>${event.time}</td>
          <td>${event.event}</td>
          <td><span class="impact ${event.impact.toLowerCase()}">${event.impact}</span></td>
          <td>${event.actual}</td>
          <td>${event.estimate}</td>
          <td>${event.prior}</td>
        </tr>
      `,
    )
    .join('')
}

function newsFeed() {
  return newsItems
    .filter((item) => state.lens === 'Global' || item.tag === state.lens || item.tag === 'Global')
    .map(
      (item) => `
        <article class="news-card">
          <div class="news-meta">
            <span>${item.source}</span>
            <b>${item.tag}</b>
          </div>
          <h3>${item.headline}</h3>
          <div class="sentiment">
            <span style="width:${item.sentiment}%"></span>
          </div>
        </article>
      `,
    )
    .join('')
}

function heatmap() {
  return sectors
    .map(
      (sector) => `
        <button class="heat-tile ${trendClass(sector.value)}" style="${heatColor(sector.value)}" title="${sector.name} ${signed(sector.value)}%">
          <span>${sector.name}</span>
          <strong>${signed(sector.value)}%</strong>
        </button>
      `,
    )
    .join('')
}

function sortLabel(key: SortKey) {
  if (state.sortKey !== key) return ''
  return state.sortDirection === 1 ? ' asc' : ' desc'
}

function render() {
  const summary = lensSummaries[state.lens]
  const activeSearchInput =
    document.activeElement instanceof HTMLInputElement && document.activeElement.id === 'searchInput'
      ? document.activeElement
      : null
  const searchSelection = activeSearchInput
    ? {
        start: activeSearchInput.selectionStart ?? activeSearchInput.value.length,
        end: activeSearchInput.selectionEnd ?? activeSearchInput.value.length,
      }
    : null

  appRoot.innerHTML = `
    <header class="topbar">
      <div class="brand-block">
        <div class="terminal-mark" aria-hidden="true">MI</div>
        <div>
          <p class="eyebrow">Independent Demo Workspace</p>
          <h1>Bloomberg Market Intelligence Dashboard</h1>
        </div>
      </div>
      <div class="top-actions">
        <label class="search-box" aria-label="Search instruments">
          <i data-lucide="search"></i>
          <input id="searchInput" type="search" placeholder="Search symbol, sector, signal" value="${escapeAttribute(state.query)}" />
        </label>
        <button id="refreshButton" class="icon-button" type="button" title="Refresh snapshot">
          <i data-lucide="refresh-cw"></i>
          <span>Refresh</span>
        </button>
        <button id="exportButton" class="icon-button accent" type="button" title="Export watchlist CSV">
          <i data-lucide="download"></i>
          <span>Export</span>
        </button>
      </div>
    </header>

    <main class="dashboard-shell">
      <section class="ticker-strip" aria-label="Market ticker">
        ${marketTicker()}
      </section>

      <section class="command-row">
        <div class="segmented" aria-label="Market lens">
          ${(['Global', 'Equities', 'Rates', 'Commodities'] as Lens[])
            .map(
              (lens) => `
                <button class="${state.lens === lens ? 'active' : ''}" data-lens="${lens}" type="button">
                  ${lens}
                </button>
              `,
            )
            .join('')}
        </div>
        <div class="status-pill">
          <span style="background:${summary.color}"></span>
          ${summary.regime} / ${summary.conviction}
        </div>
        <div class="timestamp">${liveStatusText()}</div>
      </section>

      <section class="grid-layout">
        <article class="panel chart-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow"><i data-lucide="activity"></i> Cross-Asset Monitor</p>
              <h2>${state.lens} Performance Pulse</h2>
            </div>
            <div class="range-tabs">
              ${(['1D', '1W', '1M', 'YTD'] as Range[])
                .map(
                  (range) => `
                    <button class="${state.range === range ? 'active' : ''}" data-range="${range}" type="button">
                      ${range}
                    </button>
                  `,
                )
                .join('')}
            </div>
          </div>
          ${mainChart()}
          <div class="chart-caption">
            <strong>${summary.note}</strong>
            <span>Demo index values use a synthetic normalized scale.</span>
          </div>
        </article>

        <aside class="panel pulse-panel">
          <div class="panel-heading compact">
            <div>
              <p class="eyebrow"><i data-lucide="sliders-horizontal"></i> Market Pulse</p>
              <h2>Regime Signal</h2>
            </div>
          </div>
          <div class="regime-card" style="border-color:${summary.color}">
            <span style="background:${summary.color}"></span>
            <div>
              <strong>${summary.regime}</strong>
              <p>${summary.conviction} conviction</p>
            </div>
          </div>
          ${confidenceBars()}
        </aside>

        <article class="panel watch-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow"><i data-lucide="bar-chart-3"></i> Securities</p>
              <h2>Institutional Watchlist</h2>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th><button data-sort="symbol" type="button">Ticker${sortLabel('symbol')}</button></th>
                  <th>Sector</th>
                  <th><button data-sort="price" type="button">Price${sortLabel('price')}</button></th>
                  <th><button data-sort="change" type="button">Chg${sortLabel('change')}</button></th>
                  <th><button data-sort="volume" type="button">Vol${sortLabel('volume')}</button></th>
                  <th>Signal</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>${watchlistRows()}</tbody>
            </table>
          </div>
        </article>

        <article class="panel heat-panel">
          <div class="panel-heading compact">
            <div>
              <p class="eyebrow"><i data-lucide="globe-2"></i> Sector Heatmap</p>
              <h2>Relative Moves</h2>
            </div>
          </div>
          <div class="heatmap">${heatmap()}</div>
        </article>

        <article class="panel macro-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow"><i data-lucide="calendar-clock"></i> Macro Calendar</p>
              <h2>Event Risk</h2>
            </div>
          </div>
          <div class="table-wrap compact-table">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Impact</th>
                  <th>Actual</th>
                  <th>Est</th>
                  <th>Prior</th>
                </tr>
              </thead>
              <tbody>${macroRows()}</tbody>
            </table>
          </div>
        </article>

        <article class="panel news-panel">
          <div class="panel-heading compact">
            <div>
              <p class="eyebrow"><i data-lucide="newspaper"></i> Intelligence Feed</p>
              <h2>Sentiment Tape</h2>
            </div>
          </div>
          <div class="news-stack">${newsFeed()}</div>
        </article>

        <article class="panel thesis-panel">
          <div class="panel-heading compact">
            <div>
              <p class="eyebrow"><i data-lucide="trending-up"></i> Desk Notes</p>
              <h2>Action Map</h2>
            </div>
          </div>
          <div class="thesis-grid">
            <div>
              <span>Overweight</span>
              <strong>AI Infra, Quality Growth</strong>
            </div>
            <div>
              <span>Neutral</span>
              <strong>Banks, Industrials</strong>
            </div>
            <div>
              <span>Underweight</span>
              <strong>Low Margin Cyclicals</strong>
            </div>
          </div>
        </article>
      </section>
    </main>

    <footer class="app-footer">
      Independent demo with synthetic data. No affiliation with Bloomberg L.P.
    </footer>
  `

  createIcons({
    icons: {
      Activity,
      BarChart3,
      CalendarClock,
      Download,
      Globe2,
      Newspaper,
      RefreshCw,
      Search,
      SlidersHorizontal,
      TrendingUp,
    },
  })

  bindEvents()

  if (searchSelection) {
    const nextInput = document.querySelector<HTMLInputElement>('#searchInput')
    nextInput?.focus({ preventScroll: true })
    nextInput?.setSelectionRange(searchSelection.start, searchSelection.end)
  }
}

function bindEvents() {
  document.querySelectorAll<HTMLButtonElement>('[data-lens]').forEach((button) => {
    button.addEventListener('click', () => {
      state.lens = button.dataset.lens as Lens
      render()
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-range]').forEach((button) => {
    button.addEventListener('click', () => {
      state.range = button.dataset.range as Range
      render()
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-sort]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.sort as SortKey
      if (state.sortKey === key) {
        state.sortDirection *= -1
      } else {
        state.sortKey = key
        state.sortDirection = key === 'symbol' ? 1 : -1
      }
      render()
    })
  })

  document.querySelector<HTMLInputElement>('#searchInput')?.addEventListener('input', (event) => {
    const input = event.target as HTMLInputElement
    const caret = input.selectionStart ?? input.value.length
    state.query = input.value
    render()
    const nextInput = document.querySelector<HTMLInputElement>('#searchInput')
    nextInput?.focus()
    nextInput?.setSelectionRange(caret, caret)
  })

  document.querySelector<HTMLButtonElement>('#refreshButton')?.addEventListener('click', () => {
    refreshSnapshot()
    render()
  })

  document.querySelector<HTMLButtonElement>('#exportButton')?.addEventListener('click', exportWatchlist)
}

function exportWatchlist() {
  const headers = ['Symbol', 'Name', 'Sector', 'Price', 'Change %', 'Volume', 'Signal']
  const rows = filteredWatchlist().map((item) => [
    item.symbol,
    item.name,
    item.sector,
    item.price.toFixed(2),
    item.change.toFixed(2),
    item.volume,
    item.signal,
  ])
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'market-intelligence-watchlist.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

render()
startAutoRefresh()
