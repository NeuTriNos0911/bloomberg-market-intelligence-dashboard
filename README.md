# Bloomberg Market Intelligence Dashboard

An independent Bloomberg-style market intelligence dashboard demo built with Vite, TypeScript, and synthetic market data.

## Live Demo

[Open the live auto-refresh dashboard](https://neutrinos0911.github.io/bloomberg-market-intelligence-dashboard/?v=live-refresh-1ms)

## Features

- Cross-asset ticker strip with a 1ms live auto-refresh data tick
- Lens controls for global markets, equities, rates, and commodities
- SVG performance chart with range switching
- Sortable institutional watchlist with search and CSV export
- Sector heatmap, macro calendar, sentiment tape, and desk action map
- Responsive layout for desktop and mobile screens
- GitHub Pages workflow included for a hosted demo

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

This repo includes `.github/workflows/pages.yml`. Push the repository to GitHub, enable GitHub Pages with GitHub Actions as the source, and the workflow will deploy the `dist` build.

## Data Notice

All market prices, headlines, signals, and analytics are synthetic demo data. This project is not affiliated with Bloomberg L.P. and does not use Bloomberg data, logos, APIs, or proprietary terminal assets.
