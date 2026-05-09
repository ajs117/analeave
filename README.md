# Ana Leave Manager

Simple React + Vite app to track leave for two people (local browser storage).

Quick start:

```bash
npm install
npm run dev
```

Deployment:

```bash
npm run build
```

This repo is set up for GitHub Pages via the workflow in `.github/workflows/deploy.yml`. Pushes to `main` will build and publish the `dist` output.

Notes:
- Tailwind-powered UI with a full-year calendar view; pick year in the header.
- Data saved in browser `localStorage` under key `ana-leave`.
- Bank holidays: edit `src/data/holidays.js` to add years or adjust regions (UK/HK examples included, 2025-2028).
- Leave form defaults to adding leave for both people; switch to individual if needed.
- Adjust carryover/purchased/earned per leave-year in the Summary panel (caps applied from config).
