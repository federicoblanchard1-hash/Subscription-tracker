# Recurring — subscription tracker

A minimal, black-and-white subscription tracker. Add what you pay for and see the real monthly and yearly cost, what renews next, and where the money goes.

## Features

- **Any billing cycle**: weekly, monthly, quarterly or yearly, all converted to per-month and per-year cost
- **Monthly ⇄ yearly toggle** for every total in the app (shortcut `M`)
- **Next 30 days** timeline and a **renewal calendar**, with charges due within 3 days highlighted
- **Trials**: see what you'll pay once trials convert, with a countdown to each trial's end
- **Pause** a subscription to see how much you're saving
- **Category breakdown** with a stacked bar; click a category to filter the list
- **Monthly budget** with a progress bar that warns before you go over
- **Paid to date** for everything you're subscribed to
- Search, filter (active / trial / paused) and sort
- **Export**: JSON backup and restore, CSV for spreadsheets, `.ics` to add renewals to your calendar (with a reminder 1 day before)
- Undo for deletes and pauses, light/dark theme, keyboard shortcuts (`N` new, `/` search, `Esc` close)
- Private: data lives in your browser's localStorage, with no account and no server

## Develop

```bash
npm install
npm run dev
```

`npm run build` outputs a static site to `dist/`, deployable as-is on Vercel (Vite preset).
