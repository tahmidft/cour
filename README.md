# Cour · クール

Anime airing tracker dashboard. Track what you're watching, see countdowns to the next episode, and browse your weekly schedule.

## Stack

- [React](https://react.dev/) 18
- [Vite](https://vite.dev/) 6
- Deployed on [Vercel](https://vercel.com/)

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build

```bash
npm run build
npm run preview   # preview production build locally
```

## Deploy to Vercel

### Option A — GitHub integration (recommended)

1. Push this repo to GitHub (see below).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Vercel auto-detects Vite — leave defaults (`npm run build`, output `dist`).
4. Deploy.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel
```

## Push to GitHub (first time)

Create an empty repo on GitHub (e.g. `cour`), then from this directory:

```bash
git init
git add .
git commit -m "Initial commit: Cour anime tracker dashboard"
git branch -M main
git remote add origin git@github.com:YOUR_USERNAME/cour.git
git push -u origin main
```

Replace `YOUR_USERNAME` and the repo name with yours.

## Project structure

```
├── public/           # Static assets (favicon)
├── src/
│   ├── components/
│   │   └── Dashboard.jsx   # Main UI
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

## License

MIT
