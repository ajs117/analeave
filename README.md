# Ana Leave Manager

Simple React + Vite app to track leave for two people (local browser storage).

Quick start:

```bash
npm install
npm run dev
```

Deployment:

```bash
npm run deploy
```

This repo deploys to the `gh-pages` branch with `npm run deploy`. GitHub Pages should be configured to serve from the `gh-pages` branch root.

Notes:
- Tailwind-powered UI with a full-year calendar view; pick year in the header.
- Data saved in browser `localStorage` under key `ana-leave`.
- Bank holidays: edit `src/data/holidays.js` to add years or adjust regions (UK/HK examples included, 2025-2028).
- Leave form defaults to adding leave for both people; switch to individual if needed.
- Adjust carryover/purchased/earned per leave-year in the Summary panel (caps applied from config).
