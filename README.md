# BDD Dashboard

> **Stop wrestling with feature files.** Visually create, drag-and-drop, tag, and export production-ready Cucumber features — all in your browser, in minutes.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite)](https://vitejs.dev)

---

## What Is It?

**BDD Dashboard** is an open-source, browser-based visual editor for [Gherkin](https://cucumber.io/docs/gherkin/) feature files. No installs. No accounts. No context-switching between editors, terminals, and wikis.

Write `Given / When / Then` steps with a clean UI, organize scenarios on a kanban-style board, color-code everything with tags, then export CI-ready `.feature` files in one click.

---

## Features

### ✍️ Write Features Without the Friction
Craft Gherkin feature files using a guided visual editor. No more staring at a blank `.feature` file — just fill in steps and let the preview generate clean Gherkin in real time.

### ⚡ Import, Edit, Ship — in Minutes
Drag and drop your existing `.feature` files straight in. The Gherkin parser validates instantly. Rearrange scenarios on a board view, tweak Scenario Outlines with inline example tables, and get back to building.

### 📦 Export Clean Files Your CI Will Love
One click for a single `.feature`. One click for a ZIP with proper folder structure. No reformatting, no surprises — production-ready Cucumber files every time.

### 🗂️ More in the Box
- **Board View** — drag-and-drop scenario cards, kanban-style
- **Smart Tagging** — color-coded tags, filterable across your entire project
- **Scenario Outlines** — full support with inline Examples table editor
- **Background Steps** — define shared preconditions at the feature level
- **Gherkin Preview** — live syntax-highlighted preview as you type
- **Clone Scenarios** — duplicate and tweak in seconds

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- npm, pnpm, or yarn

### Install & Run

```bash
# Clone the repo
git clone https://github.com/SinaKarimi7/BDD-Dashboard.git
cd BDD-Dashboard

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and start writing features.

### Other Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run start` | Serve `dist/` and `GET /api/github/callback` |
| `npm run lint` | Run ESLint across the codebase |
| `npm test` | Run the OAuth callback checks |

## Install

You are putting the dashboard somewhere people can open it. Pick one way. OAuth env vars live in `.env.example`. `VITE_GITHUB_CLIENT_ID` is required in the browser for OAuth and has no default. `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are required on the API and have no default. `PORT` defaults to `3000`. `HOST` defaults to `0.0.0.0` for `npm start`.

### 1. Browser only

Serve the built HTML, CSS, and JS. There is no API, so GitHub OAuth is off. A personal access token on the GitHub screen still works.

```bash
npm install
npm run build
```

Host the `dist/` directory. Client routes such as `/projects/abc/github` must return `index.html`.

### 2. GitHub Pages + Vercel

GitHub Pages serves `dist/`. Vercel runs only `api/github/callback.js`.

On Vercel, set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `APP_ORIGIN` to the Pages origin (`https://<user>.github.io`). The GitHub OAuth callback URL is `https://<project>.vercel.app/api/github/callback`.

Build the files with the client id and that Vercel origin:

```bash
VITE_GITHUB_CLIENT_ID=your_id VITE_API_ORIGIN=https://<project>.vercel.app npm run build
```

Publish `dist/` at the site root (a GitHub user site). The app routes are `/projects/...`. `VITE_API_ORIGIN` and `APP_ORIGIN` stay empty when the site and the API share a host.

### 3. nginx + Node

nginx serves the files on your own host and forwards `/api` to the Node process. Copy `.env.example` to `.env` first. Compose reads `.env` and gives it to `api`. `PORT` is the host port in front of nginx.

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:3000`. The GitHub callback is that origin plus `/api/github/callback`. The image build is the same for every install. Set `VITE_GITHUB_CLIENT_ID` when you run `npm run build` for Pages or for the browser-only files.

---

## Project Structure

```
src/
├── pages/            # Route-level page components
│   ├── LandingPage.tsx
│   ├── DashboardPage.tsx
│   ├── ProjectPage.tsx
│   ├── FeatureEditorPage.tsx
│   ├── BoardViewPage.tsx
│   ├── TagsPage.tsx
│   ├── ExportPage.tsx
│   └── SettingsPage.tsx
├── components/
│   ├── features/     # Domain-specific components (editor, preview, tags…)
│   ├── layout/       # App shell, sidebar, breadcrumbs
│   └── ui/           # Reusable design system components
├── store/            # Zustand global state
├── lib/              # Gherkin parser, export utilities, Supabase client
├── types/            # Shared TypeScript types
└── design-system/    # Design tokens & CSS variables
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Routing | React Router v7 |
| Drag & Drop | dnd-kit |
| Animations | Framer Motion |
| Forms | React Hook Form + Zod |
| Export | JSZip + FileSaver.js |
| Icons | Lucide React |

---

## User Flows

**New user → first feature:**
Landing → Dashboard → New Project → New Feature → Add Scenarios → Tag → Export

**Developer importing existing files:**
Login → Project → Import `.feature` files → Edit on Board View → Export as ZIP

**Team member managing scenarios:**
Project → Feature Editor → Board View → Drag to reorder → Edit inline → Gherkin Preview → Export

---

## Data & Privacy

Everything runs locally in your browser. **No data is sent to any server.** State is persisted in browser local storage. You own your data, period.

---

## Contributing

Contributions are welcome! Feel free to open an issue, suggest a feature, or submit a pull request.

1. Fork the repo
2. Create your branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push and open a PR

---

## License

MIT © [Sina Karimi](https://github.com/SinaKarimi7)

---

*Built by testers, for testers. Free forever.*
