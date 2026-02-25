# BDD Dashboard — Architecture Document

## Principal Architect: Vercel Engineering

---

## 1. Site Map (Page Hierarchy)

```
/                           → Landing / Marketing page
├── /auth
│   ├── /login              → Sign in (email + OAuth)
│   └── /register           → Sign up
├── /dashboard              → Projects overview (authed)
├── /projects
│   ├── /new                → Create new project
│   └── /:projectId
│       ├── /               → Project overview (features list, stats)
│       ├── /features
│       │   ├── /new        → Create new feature
│       │   ├── /import     → Import .feature files
│       │   └── /:featureId
│       │       ├── /       → Feature editor (scenarios, steps)
│       │       └── /board  → Board/flowchart view
│       ├── /tags           → Tag management
│       ├── /export         → Export center (single / zip)
│       └── /settings       → Project settings
├── /settings               → User settings / account
└── /404                    → Not found
```

---

## 2. User Flows (3 Journeys)

### Journey 1: New User Creates a Project & First Feature
```
Landing → Register → Dashboard (empty state)
  → "New Project" → Enter name/description → Project created
  → Project Overview → "New Feature" → Enter feature name
  → Feature Editor → Add Scenario → Add Steps (Given/When/Then)
  → Tag scenario → Save → See feature in project overview
```

### Journey 2: Developer Imports Existing Features & Exports
```
Login → Dashboard → Select project
  → "Import Features" → Drag & drop .feature files
  → Parser validates Gherkin → Features appear in list
  → Click feature → Edit scenarios (reorder, clone, tag)
  → "Export" → Choose format (single file / zip bundle)
  → Download .feature file(s) with folder structure
```

### Journey 3: Team Member Manages Scenarios Interactively
```
Login → Dashboard → Select project → Select feature
  → Switch to "Board View" → See scenarios as cards
  → Drag to reorder scenarios → Click card to expand
  → Edit steps inline → Clone scenario card
  → Add/remove tags via tag chips → Delete scenario
  → Switch to "Editor View" → See Gherkin preview
  → Export updated feature
```

---

## 3. Data Models

### Projects
| Field        | Type      | Description                |
|-------------|-----------|----------------------------|
| id          | UUID (PK) | Auto-generated             |
| name        | text      | Project name               |
| description | text      | Optional description       |
| user_id     | UUID (FK) | Owner                      |
| created_at  | timestamp | Creation date              |
| updated_at  | timestamp | Last modified              |

### Features
| Field        | Type      | Description                |
|-------------|-----------|----------------------------|
| id          | UUID (PK) | Auto-generated             |
| project_id  | UUID (FK) | Parent project             |
| name        | text      | Feature title              |
| description | text      | Feature description (As a…)|
| folder_path | text      | Virtual folder path        |
| position    | integer   | Order within project       |
| created_at  | timestamp | Creation date              |
| updated_at  | timestamp | Last modified              |

### Scenarios
| Field          | Type      | Description                |
|---------------|-----------|----------------------------|
| id            | UUID (PK) | Auto-generated             |
| feature_id    | UUID (FK) | Parent feature             |
| name          | text      | Scenario title             |
| type          | enum      | scenario / scenario_outline |
| position      | integer   | Order within feature       |
| created_at    | timestamp | Creation date              |
| updated_at    | timestamp | Last modified              |

### Steps
| Field        | Type      | Description                |
|-------------|-----------|----------------------------|
| id          | UUID (PK) | Auto-generated             |
| scenario_id | UUID (FK) | Parent scenario            |
| keyword     | enum      | Given/When/Then/And/But    |
| text        | text      | Step text                  |
| data_table  | jsonb     | Optional data table        |
| doc_string  | text      | Optional doc string        |
| position    | integer   | Order within scenario      |

### Tags
| Field      | Type      | Description                |
|-----------|-----------|----------------------------|
| id        | UUID (PK) | Auto-generated             |
| project_id| UUID (FK) | Scoped to project          |
| name      | text      | Tag name (without @)       |
| color     | text      | Hex color for UI           |

### TagAssignments (join table)
| Field        | Type      | Description                |
|-------------|-----------|----------------------------|
| id          | UUID (PK) | Auto-generated             |
| tag_id      | UUID (FK) | Tag reference              |
| target_type | enum      | feature / scenario         |
| target_id   | UUID      | Feature or Scenario ID     |

### Examples (for Scenario Outlines)
| Field        | Type      | Description                |
|-------------|-----------|----------------------------|
| id          | UUID (PK) | Auto-generated             |
| scenario_id | UUID (FK) | Parent scenario outline    |
| name        | text      | Examples block name        |
| headers     | jsonb     | Column headers array       |
| rows        | jsonb     | Array of row arrays        |
| position    | integer   | Order within scenario      |

### Background
| Field        | Type      | Description                |
|-------------|-----------|----------------------------|
| id          | UUID (PK) | Auto-generated             |
| feature_id  | UUID (FK) | Parent feature (1:1)       |
| steps       | jsonb     | Array of step objects      |

---

## 4. API Requirements

### Auth (Supabase Auth)
- `POST /auth/signup` — Register
- `POST /auth/login` — Sign in
- `POST /auth/logout` — Sign out
- `GET  /auth/user` — Current user

### Projects
- `GET    /api/projects` — List user's projects
- `POST   /api/projects` — Create project
- `GET    /api/projects/:id` — Get project details
- `PATCH  /api/projects/:id` — Update project
- `DELETE /api/projects/:id` — Delete project

### Features
- `GET    /api/projects/:projectId/features` — List features
- `POST   /api/projects/:projectId/features` — Create feature
- `GET    /api/features/:id` — Get feature with scenarios
- `PATCH  /api/features/:id` — Update feature
- `DELETE /api/features/:id` — Delete feature
- `PATCH  /api/features/reorder` — Batch reorder features

### Scenarios
- `GET    /api/features/:featureId/scenarios` — List scenarios
- `POST   /api/features/:featureId/scenarios` — Create scenario
- `GET    /api/scenarios/:id` — Get scenario with steps
- `PATCH  /api/scenarios/:id` — Update scenario
- `DELETE /api/scenarios/:id` — Delete scenario
- `POST   /api/scenarios/:id/clone` — Clone scenario
- `PATCH  /api/scenarios/reorder` — Batch reorder

### Steps
- `POST   /api/scenarios/:scenarioId/steps` — Add step
- `PATCH  /api/steps/:id` — Update step
- `DELETE /api/steps/:id` — Delete step
- `PATCH  /api/steps/reorder` — Batch reorder

### Tags
- `GET    /api/projects/:projectId/tags` — List tags
- `POST   /api/projects/:projectId/tags` — Create tag
- `PATCH  /api/tags/:id` — Update tag
- `DELETE /api/tags/:id` — Delete tag
- `POST   /api/tags/assign` — Assign tag to target
- `DELETE /api/tags/unassign` — Remove tag assignment

### Import / Export
- `POST   /api/projects/:projectId/import` — Import .feature files
- `GET    /api/features/:id/export` — Export single feature
- `GET    /api/projects/:projectId/export` — Export all as zip

---

## 5. Component Inventory (30+ Components)

### Layout (5)
1. `AppShell` — Main layout wrapper
2. `Sidebar` — Navigation sidebar with project tree
3. `TopBar` — Header with breadcrumbs, search, user menu
4. `Breadcrumbs` — Navigation breadcrumbs
5. `MobileNav` — Responsive mobile navigation

### Common UI (10)
6. `Button` — Primary, secondary, ghost, danger variants
7. `Input` — Text input with label, error states
8. `Modal` — Dialog overlay
9. `DropdownMenu` — Context menus, action menus
10. `Badge` — Tag badges with colors
11. `Card` — Content card container
12. `EmptyState` — Zero-data illustrations
13. `Toast` — Notification toasts
14. `Tooltip` — Hover tooltips
15. `SearchInput` — Search with debounce

### Project Components (4)
16. `ProjectCard` — Project preview card
17. `ProjectList` — Grid/list of projects
18. `ProjectForm` — Create/edit project form
19. `ProjectStats` — Feature/scenario counts

### Feature Components (5)
20. `FeatureCard` — Feature preview in list
21. `FeatureList` — Sortable feature list
22. `FeatureForm` — Create/edit feature
23. `FeatureEditor` — Main feature editing view
24. `GherkinPreview` — Live Gherkin syntax preview

### Scenario Components (8)
25. `ScenarioCard` — Draggable scenario card
26. `ScenarioBoard` — Kanban/flowchart board view
27. `ScenarioForm` — Create/edit scenario
28. `StepEditor` — Inline step editing (keyword + text)
29. `StepList` — Sortable step list
30. `DataTableEditor` — Edit data tables for steps
31. `ExamplesEditor` — Edit Examples for outlines
32. `ScenarioCloneDialog` — Clone confirmation

### Tag Components (3)
33. `TagChip` — Colored tag pill
34. `TagPicker` — Tag selection dropdown
35. `TagManager` — Full tag CRUD interface

### Import/Export (3)
36. `FileDropZone` — Drag & drop file upload
37. `ImportPreview` — Preview parsed features
38. `ExportDialog` — Export options & download

### Board/Interactive (3)
39. `BoardCanvas` — Main board container
40. `BoardColumn` — Feature grouping column
41. `ConnectionLine` — Visual connector between cards

---

## 6. Page Templates (Wireframes)

### Landing Page
```
┌─────────────────────────────────────────────┐
│  Logo    Features  Pricing  [Login] [Start] │
├─────────────────────────────────────────────┤
│                                             │
│   Write BDD Features                        │
│   Like Never Before                         │
│                                             │
│   [Get Started Free]  [See Demo]            │
│                                             │
│   ┌──────┐  ┌──────┐  ┌──────┐             │
│   │ Card │  │ Card │  │ Card │  ← Features  │
│   └──────┘  └──────┘  └──────┘             │
└─────────────────────────────────────────────┘
```

### Dashboard
```
┌────┬────────────────────────────────────────┐
│    │  Dashboard          🔍  [+ New Project]│
│ S  ├────────────────────────────────────────┤
│ I  │  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│ D  │  │Project 1│ │Project 2│ │Project 3│  │
│ E  │  │12 feat  │ │ 5 feat  │ │ 0 feat  │  │
│ B  │  └─────────┘ └─────────┘ └─────────┘  │
│ A  │                                        │
│ R  │  Recent Activity                       │
│    │  ─────────────────────                 │
└────┴────────────────────────────────────────┘
```

### Feature Editor
```
┌────┬────────────────────────────────────────┐
│    │  Project > Feature    [Board] [Export] │
│ S  ├────────────────────────────────────────┤
│ I  │  Feature: User Login                   │
│ D  │  As a user, I want to...              │
│ E  │  Tags: [@smoke] [@auth] [+]           │
│ B  │                                        │
│ A  │  ┌─ Scenario: Valid login ─────── ⋮ ┐ │
│ R  │  │  Given I am on login page          │ │
│    │  │  When I enter valid credentials    │ │
│    │  │  Then I see the dashboard          │ │
│    │  └────────────────────────────────────┘ │
│    │  ┌─ Scenario: Invalid login ──── ⋮ ┐  │
│    │  │  Given I am on login page          │ │
│    │  │  When I enter wrong password       │ │
│    │  │  Then I see error message           │ │
│    │  └────────────────────────────────────┘ │
│    │  [+ Add Scenario]                      │
│    │                                        │
│    │  ── Gherkin Preview ──────────────     │
│    │  Feature: User Login                   │
│    │    As a user, I want to...            │
└────┴────────────────────────────────────────┘
```

### Board View
```
┌────┬────────────────────────────────────────┐
│    │  Project > Feature    [Editor] [Export]│
│ S  ├────────────────────────────────────────┤
│ I  │                                        │
│ D  │  ┌──────────┐    ┌──────────┐         │
│ E  │  │Scenario 1│───→│Scenario 2│         │
│ B  │  │@smoke    │    │@regression│        │
│ A  │  │3 steps   │    │5 steps   │         │
│ R  │  │ ✎ 🗐 🗑 │    │ ✎ 🗐 🗑 │         │
│    │  └──────────┘    └──────────┘         │
│    │       │                                │
│    │       ▼                                │
│    │  ┌──────────┐                          │
│    │  │Scenario 3│                          │
│    │  │@smoke    │                          │
│    │  │2 steps   │                          │
│    │  └──────────┘                          │
└────┴────────────────────────────────────────┘
```

---

## 7. Tech Stack

| Layer          | Technology                          |
|---------------|-------------------------------------|
| Runtime       | Bun                                 |
| Framework     | React 19 + TypeScript               |
| Build         | Vite 6                              |
| Routing       | React Router v7                     |
| State/Data    | TanStack Query v5 + Zustand         |
| Styling       | Tailwind CSS v4 + shadcn/ui         |
| Drag & Drop   | @dnd-kit/core + @dnd-kit/sortable   |
| Backend       | Supabase (Auth + PostgreSQL + RLS)   |
| File Export   | JSZip + file-saver                  |
| Gherkin Parse | @cucumber/gherkin + @cucumber/messages |
| Animations    | Framer Motion                       |
| Forms         | React Hook Form + Zod               |
| Hosting       | Vercel                              |
| Icons         | Lucide React                        |
| Testing       | Vitest + Testing Library             |

---

## 8. Performance Budgets

| Metric                  | Target    |
|------------------------|-----------|
| First Contentful Paint | < 1.2s    |
| Largest Contentful Paint | < 2.0s  |
| Time to Interactive    | < 2.5s    |
| Cumulative Layout Shift | < 0.05   |
| Total Bundle (gzipped) | < 150 KB  |
| JS (initial, gzipped)  | < 100 KB  |
| CSS (gzipped)          | < 20 KB   |
| Lighthouse Score       | > 95      |
| API Response (p95)     | < 200ms   |

### Strategies
- Code splitting per route with `React.lazy()`
- Tree-shaking with Vite
- Image optimization (WebP, lazy loading)
- Supabase connection pooling
- TanStack Query caching (stale-while-revalidate)
- Service Worker for offline Gherkin editing

---

## 9. SEO Structure

### Meta Strategy
- Dynamic `<title>` per page: `{Page} | BDD Dashboard`
- Open Graph + Twitter Card meta tags
- Canonical URLs on all pages
- robots.txt + sitemap.xml

### Page SEO
| Page       | Title                              | H1                          |
|-----------|------------------------------------|-----------------------------|
| Landing   | BDD Dashboard — Visual BDD Editor  | Write BDD Features Visually |
| Dashboard | My Projects — BDD Dashboard        | Your Projects               |
| Feature   | {name} — BDD Dashboard             | {Feature Name}              |
| Board     | Board View — BDD Dashboard         | {Feature Name} Board        |

### Technical SEO
- Server-side meta tags via React Helmet Async
- Structured data (JSON-LD) for SoftwareApplication
- Semantic HTML5 landmarks (`<main>`, `<nav>`, `<section>`)
- Accessible color contrast (WCAG AA)
- Preconnect to Supabase CDN
- `<link rel="preload">` for critical fonts
