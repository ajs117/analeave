# Ana Leave Manager

React + Vite app to track annual leave for two people, with a full-year calendar, per-leave-year balances and UK/HK bank holidays.

## Data storage (GitHub Gist sync)

Data is kept in a secret GitHub gist (`leave-data.json`) so iPad, Windows and any other device share one copy. Each device also caches it in `localStorage` (`ana-leave`) so it works offline and syncs when back online.

The gist ID is hard-coded in `src/utils/gistStore.js` (`GIST_ID`, `GIST_OWNER`), so any device opening the app loads the data straight away. A write token can be built in by putting it, reversed, in `.env.local` as `VITE_GIST_TOKEN_REVERSED` (gitignored; it ends up in the public bundle). Without one, open **⋯** and paste a [fine-grained token](https://github.com/settings/personal-access-tokens/new) with account permission **Gists: Read and write** and no repository access.

Edits save automatically about a second after each change. If two devices change the data at the same time, a banner asks which copy to keep. **Export JSON** / **Import JSON** in the Sync panel are for backups.

## Asking an AI agent for advice

Every sync also writes `leave-summary.json` to the gist: balances per leave year (taken, booked, remaining, at risk of being lost), all booked leave, bank holidays, and suggested bridge-the-weekend windows for taking leave together. It is refreshed whenever the data changes and at least once a day when the app is opened.

The Sync panel shows its public URL (`https://gist.githubusercontent.com/<owner>/<gist-id>/raw/leave-summary.json`). It needs no auth. **Copy prompt for agent** puts a ready-made prompt that includes the URL on the clipboard; paste it into any agent that can fetch URLs. GitHub serves that URL with `Cache-Control: max-age=300`, so an agent may see data up to 5 minutes old.

## iPad

Open the site in Safari, then Share → **Add to Home Screen**. It runs full-screen as an app, and you can tap the first and last day on the calendar to select leave.

## Development

```bash
npm install
npm run dev
npm run deploy   # builds and pushes dist/ to the gh-pages branch
```

GitHub Pages serves from the `gh-pages` branch root at `/analeave/`.

- Bank holidays: edit `src/data/holidays.js` to add years or adjust regions.
- Carry-over, purchased and earned days per leave year are edited in the Summary panel (caps come from each person's config).
