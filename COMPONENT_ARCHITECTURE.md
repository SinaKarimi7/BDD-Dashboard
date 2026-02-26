# Component Architecture — Frontend Logic Design

> **Stack alignment**: React 19, TypeScript, Zustand, TanStack Query v5, React Hook Form + Zod, Framer Motion, Tailwind CSS v4, Supabase, React Router v7

---

## 1. Multi-Step Form (Validation, Progress, States)

### 1.1 State Machine

```
                ┌──────────────────────────────────────────────┐
                │              MULTI-STEP FORM                 │
                └──────────────────────────────────────────────┘

  ┌─────────┐   validate   ┌─────────┐   validate   ┌─────────┐   submit    ┌───────────┐
  │  STEP_1 │ ──────────►  │  STEP_2 │ ──────────►  │  STEP_3 │ ────────►  │SUBMITTING │
  │ (idle)  │              │ (idle)  │              │ (idle)  │            │ (loading) │
  └────┬────┘              └────┬────┘              └────┬────┘            └─────┬─────┘
       │                        │                        │                       │
       │  ◄── back ────────────►│  ◄── back ────────────►│                       │
       │                        │                        │                  ┌────┴────┐
       ▼                        ▼                        ▼                  │         │
  ┌─────────┐              ┌─────────┐              ┌─────────┐      ┌─────▼──┐ ┌────▼───┐
  │  ERROR  │              │  ERROR  │              │  ERROR  │      │SUCCESS │ │ ERROR  │
  │(field)  │              │(field)  │              │(field)  │      │(done)  │ │(submit)│
  └─────────┘              └─────────┘              └─────────┘      └────────┘ └────────┘
                                                                                     │
                                                                              retry  │
                                                                              ───────┘

  States: IDLE → VALIDATING → VALID → SUBMITTING → SUCCESS | SUBMIT_ERROR
  Each step: PRISTINE → DIRTY → VALIDATING → VALID | INVALID
```

### 1.2 Data Flow

```
Props In:
  ├── steps: StepConfig[]           // { id, title, schema, component }
  ├── initialValues?: Partial<T>    // Pre-fill data (edit mode)
  ├── onSubmit: (data: T) => Promise<void>
  └── onCancel?: () => void

Events Out:
  ├── onStepChange(step: number)    // Analytics / URL sync
  ├── onSubmit(data: T)             // Final submission
  └── onDirtyChange(dirty: boolean) // Unsaved changes guard

Internal State (Zustand slice or useReducer):
  ├── currentStep: number
  ├── stepData: Record<string, unknown>    // Accumulated form values
  ├── stepStatus: Record<number, 'pristine' | 'dirty' | 'valid' | 'invalid'>
  ├── isSubmitting: boolean
  ├── submitError: string | null
  └── visitedSteps: Set<number>

API Calls:
  └── POST /api/resource — Final submission via TanStack useMutation
```

### 1.3 React Structure

```tsx
// ─── Types ─────────────────────────────────────────────
interface StepConfig<T extends z.ZodType = z.ZodType> {
  id: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  schema: T;                               // Zod schema for this step
  component: React.ComponentType<StepProps>;
}

interface MultiStepFormProps<T> {
  steps: StepConfig[];
  initialValues?: Partial<T>;
  onSubmit: (data: T) => Promise<void>;
  onCancel?: () => void;
}

// ─── State Machine ─────────────────────────────────────
type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

interface FormState {
  currentStep: number;
  formData: Record<string, unknown>;
  stepValidity: Record<number, boolean>;
  visitedSteps: Set<number>;
  status: FormStatus;
  submitError: string | null;
}

type FormAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GO_TO_STEP'; step: number }
  | { type: 'SET_STEP_DATA'; step: number; data: Record<string, unknown> }
  | { type: 'SET_STEP_VALID'; step: number; valid: boolean }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'RESET' };

// ─── Component Tree ────────────────────────────────────
<MultiStepForm steps={steps} onSubmit={handleSubmit}>
  <ProgressBar
    steps={steps}
    currentStep={state.currentStep}
    stepValidity={state.stepValidity}
    visitedSteps={state.visitedSteps}
  />
  <FormContainer>
    <AnimatePresence mode="wait">
      <motion.div key={state.currentStep}>       {/* Slide transition */}
        <StepRenderer
          config={steps[state.currentStep]}
          data={state.formData}
          onDataChange={(data) => dispatch({ type: 'SET_STEP_DATA', ... })}
        >
          {/* Internally uses react-hook-form + zod resolver */}
          <StepComponent />
        </StepRenderer>
      </motion.div>
    </AnimatePresence>
  </FormContainer>
  <StepNavigation
    currentStep={state.currentStep}
    totalSteps={steps.length}
    isFirstStep={state.currentStep === 0}
    isLastStep={state.currentStep === steps.length - 1}
    isSubmitting={state.status === 'submitting'}
    canGoNext={state.stepValidity[state.currentStep]}
    onPrev={() => dispatch({ type: 'PREV_STEP' })}
    onNext={() => dispatch({ type: 'NEXT_STEP' })}
    onSubmit={handleFinalSubmit}
  />
</MultiStepForm>
```

### 1.4 Error Handling

| Error Type | Handling | UI Treatment |
|---|---|---|
| Field validation | Zod schema per step, real-time via `mode: 'onBlur'` | Inline red text below field, field border highlight |
| Step validation gate | Validate entire step schema before `NEXT_STEP` | Toast + scroll to first invalid field |
| Submit error (network) | TanStack `useMutation.onError` catch | Banner at top of form + retry button |
| Submit error (409 conflict) | Server returns duplicate | Field-level error on conflicting field |
| Timeout | `AbortController` with 30s timeout | "Request timed out" banner + retry |

### 1.5 Loading / Empty States

| State | Behavior |
|---|---|
| Initial load (edit mode) | Skeleton for each field, progress bar greyed out |
| Step transition | `AnimatePresence` slide animation (150ms) |
| Submitting | Disable all navigation, spinner on submit button, `aria-busy` |
| Success | Redirect or success panel with confetti/checkmark |
| Empty initial values | Show form with placeholder text and helper descriptions |

### 1.6 Edge Cases

- **Browser back button**: Sync `currentStep` to URL `?step=2` via `useSearchParams`
- **Unsaved changes**: `beforeunload` listener + React Router `useBlocker` when `dirty && !submitted`
- **Re-hydration**: Persist `formData` to `sessionStorage` so refresh doesn't lose progress
- **Double submit**: Disable button + `useRef` guard flag
- **Async validation**: Debounced uniqueness checks (e.g., project name) via `onBlur` + API
- **Step skip**: Only allow jumping to step N if steps 0..N-1 are all valid (visited + validated)
- **Accessibility**: Focus trap within step, `aria-current="step"` on progress, announce step change via `aria-live`

---

## 2. Dynamic Pricing Calculator (Real-Time)

### 2.1 State Machine

```
  ┌──────────┐  select_plan   ┌───────────┐  toggle_addon   ┌───────────┐
  │  INITIAL │ ─────────────► │ PLAN_SET  │ ──────────────► │ CUSTOMIZED│
  │ (no plan)│                │ (base)    │                 │ (addons)  │
  └──────────┘                └─────┬─────┘                 └─────┬─────┘
                                    │                             │
                              change_billing                change_billing
                              (monthly/annual)              toggle_addon
                                    │                             │
                                    ▼                             ▼
                              ┌───────────┐                 ┌───────────┐
                              │ RECALC    │                 │ RECALC    │
                              │ (debounce)│                 │ (debounce)│
                              └─────┬─────┘                 └─────┬─────┘
                                    │                             │
                                    ▼                             ▼
                              ┌─────────────────────────────────────┐
                              │           PRICE_READY               │
                              │ (total computed, breakdown visible) │
                              └──────────────────┬──────────────────┘
                                                 │
                                           checkout
                                                 │
                                                 ▼
                              ┌───────────┐  success  ┌───────────┐
                              │ CHECKOUT  │ ────────► │ CONFIRMED │
                              │ (loading) │           │ (receipt) │
                              └─────┬─────┘           └───────────┘
                                    │ error
                                    ▼
                              ┌───────────┐
                              │   ERROR   │
                              └───────────┘
```

### 2.2 Data Flow

```
Props In:
  ├── plans: Plan[]                  // { id, name, basePrice, features }
  ├── addons: Addon[]                // { id, name, price, unit }
  ├── discounts?: Discount[]         // { code, type: 'percent' | 'fixed', value }
  └── currency?: CurrencyCode        // Default: 'USD'

Events Out:
  ├── onPlanSelect(planId: string)
  ├── onPriceChange(breakdown: PriceBreakdown)
  └── onCheckout(config: PricingConfig)

Internal State:
  ├── selectedPlan: Plan | null
  ├── billingCycle: 'monthly' | 'annual'
  ├── selectedAddons: Map<string, { quantity: number }>
  ├── seats: number                  // For per-seat pricing
  ├── promoCode: string | null
  ├── promoStatus: 'idle' | 'validating' | 'valid' | 'invalid'
  └── breakdown: PriceBreakdown      // Derived (useMemo)

Derived (useMemo — pure computation, no API):
  └── PriceBreakdown {
        basePrice, addonTotal, subtotal,
        discount, tax, total,
        savingsVsMonthly (for annual)
      }

API Calls:
  ├── GET  /api/pricing/plans     — Fetch plan catalog
  ├── POST /api/pricing/validate  — Validate promo code
  └── POST /api/checkout          — Initiate checkout
```

### 2.3 React Structure

```tsx
// ─── Types ─────────────────────────────────────────────
interface Plan {
  id: string;
  name: string;
  basePrice: number;           // Monthly base
  annualDiscount: number;      // e.g., 0.2 = 20% off
  maxSeats: number;
  features: string[];
}

interface Addon {
  id: string;
  name: string;
  unitPrice: number;
  unit: 'per_seat' | 'flat' | 'per_unit';
  min?: number;
  max?: number;
}

interface PriceBreakdown {
  basePrice: number;
  addonTotal: number;
  subtotal: number;
  discount: { label: string; amount: number } | null;
  tax: number;
  total: number;
  billingCycle: 'monthly' | 'annual';
  savingsVsMonthly: number;
}

// ─── Component Tree ────────────────────────────────────
<PricingCalculator plans={plans} addons={addons}>
  <BillingToggle
    cycle={billingCycle}
    onToggle={setBillingCycle}
    annualSavingsPercent={20}
  />
  <PlanSelector
    plans={plans}
    selectedPlan={selectedPlan}
    billingCycle={billingCycle}
    onSelect={setSelectedPlan}
  >
    <PlanCard plan={plan} isSelected={...} priceDisplay={...} />
  </PlanSelector>
  <SeatsSlider
    value={seats}
    min={1}
    max={selectedPlan?.maxSeats}
    onChange={setSeats}
    pricePerSeat={selectedPlan?.basePrice}
  />
  <AddonPicker
    addons={addons}
    selectedAddons={selectedAddons}
    onToggle={toggleAddon}
    onQuantityChange={setAddonQuantity}
  >
    <AddonCard addon={addon} isActive={...} quantity={...} />
  </AddonPicker>
  <PromoCodeInput
    code={promoCode}
    status={promoStatus}
    onApply={validatePromo}
    onClear={clearPromo}
  />
  <PriceSummary breakdown={breakdown}>         {/* Sticky sidebar */}
    <LineItem label="Base plan" amount={...} />
    <LineItem label="Addons" amount={...} />
    <LineItem label="Discount" amount={...} negative />
    <LineItem label="Tax" amount={...} />
    <Divider />
    <TotalLine amount={breakdown.total} cycle={billingCycle} />
    <SavingsBadge amount={breakdown.savingsVsMonthly} />
  </PriceSummary>
  <CheckoutButton
    disabled={!selectedPlan}
    isLoading={isCheckingOut}
    onClick={handleCheckout}
  />
</PricingCalculator>
```

### 2.4 Error Handling

| Error Type | Handling | UI Treatment |
|---|---|---|
| Invalid promo code | API returns 404/400 | Shake animation + "Invalid code" under input |
| Expired promo code | API returns 410 | "Code has expired" with red badge |
| Checkout failure | `useMutation.onError` | Modal with error + retry |
| Plan fetch error | `useQuery` retry(3) | "Unable to load plans" + retry button |
| Seats exceeds max | Clamp via `Math.min` | Tooltip warning on slider |
| Price mismatch (stale) | Server returns different price | "Price updated" toast + refresh breakdown |

### 2.5 Loading / Empty States

| State | Behavior |
|---|---|
| Plans loading | 3 skeleton `PlanCard` shimmer boxes |
| Promo validating | Spinner inside input, button disabled |
| Checkout in progress | Full-page overlay with progress spinner |
| No plans available | `EmptyState` with "No plans available" |
| Breakdown updating | Number morph animation (Framer Motion `useSpring`) |

### 2.6 Edge Cases

- **Currency formatting**: `Intl.NumberFormat` with locale + currency awareness
- **Floating point**: Compute all prices in cents (integers), display with `/100`
- **Annual toggle with promo**: Ensure discount stacks correctly (apply promo after annual discount)
- **Max quantity overflow**: Clamp addon quantities to `addon.max` and debounce slider
- **Rapid plan switching**: Cancel previous promo validation via `AbortController` when plan changes
- **Tax calculation**: Defer to server if tax rules are complex; show "estimated" label
- **Responsive**: Stack plan cards vertically on mobile, sticky summary becomes bottom sheet
- **Accessibility**: Plan selection via arrow keys, `role="radiogroup"` for plan selector

---

## 3. Search with Filters (Faceted, Sort, Pagination)

### 3.1 State Machine

```
  ┌──────────┐   type/clear    ┌──────────┐   fetch    ┌──────────┐
  │   IDLE   │ ──────────────► │ DEBOUNCE │ ────────►  │ LOADING  │
  │ (empty)  │                 │ (300ms)  │            │ (fetch)  │
  └──────────┘                 └──────────┘            └────┬─────┘
       ▲                            ▲                       │
       │                            │                  ┌────┴─────┐
       │ clear_all             type_more               │          │
       │                            │            ┌─────▼──┐  ┌────▼───┐
       │                            │            │RESULTS │  │ ERROR  │
       │                            │            │(data)  │  │(retry) │
       │                            │            └────┬───┘  └────────┘
       │                            │                 │
       │                       ┌────┴─────┐           │
       └───────────────────────│ FILTERED │◄──────────┘
                               │(refine)  │
                               └────┬─────┘
                                    │
                         ┌──────────┼──────────┐
                         ▼          ▼          ▼
                    sort_change  page_nav  facet_toggle
                         │          │          │
                         └──────────┼──────────┘
                                    ▼
                               ┌─────────┐
                               │RELOADING│  (keep stale results visible)
                               │(stale)  │
                               └─────────┘

  URL ↔ State sync via useSearchParams:
    ?q=login&tags=smoke,auth&sort=name_asc&page=2
```

### 3.2 Data Flow

```
Props In:
  ├── endpoint: string                    // API base URL
  ├── facetConfig: FacetConfig[]          // { key, label, type: 'checkbox' | 'range' }
  ├── sortOptions: SortOption[]           // { value, label }
  ├── pageSize?: number                   // Default: 20
  └── renderItem: (item: T) => ReactNode  // Render delegate

Events Out:
  ├── onResultsChange(results: T[], total: number)
  ├── onFilterChange(filters: ActiveFilters)
  └── onSearchChange(query: string)

URL State (useSearchParams — source of truth):
  ├── q: string                           // Search query
  ├── sort: string                        // Sort key
  ├── page: number                        // Current page
  └── [facetKey]: string                  // Comma-separated values per facet

Derived:
  ├── queryKey: ['search', endpoint, filters, sort, page]
  ├── hasActiveFilters: boolean
  └── totalPages: Math.ceil(total / pageSize)

API Calls:
  └── GET /api/search?q=...&tags=...&sort=...&page=...&limit=...
      Response: { items: T[], total: number, facets: FacetCounts[] }
```

### 3.3 React Structure

```tsx
// ─── Types ─────────────────────────────────────────────
interface FacetConfig {
  key: string;
  label: string;
  type: 'checkbox' | 'radio' | 'range' | 'date_range';
}

interface FacetCounts {
  key: string;
  buckets: { value: string; label: string; count: number }[];
}

interface ActiveFilters {
  query: string;
  facets: Record<string, string[]>;
  sort: string;
  page: number;
}

interface SortOption {
  value: string;
  label: string;        // e.g., "Name (A-Z)"
}

// ─── Hook: useSearchFilters ────────────────────────────
function useSearchFilters(config: {
  endpoint: string;
  pageSize: number;
  facetConfig: FacetConfig[];
  sortOptions: SortOption[];
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  // Parse URL → ActiveFilters
  // Return: { filters, setQuery, toggleFacet, setSort, setPage, clearAll }
  // Debounce query changes (300ms)
  // useQuery({ queryKey: ['search', ...], queryFn: fetchResults })
}

// ─── Component Tree ────────────────────────────────────
<SearchPage>
  <SearchHeader>
    <SearchInput
      value={filters.query}
      onChange={debouncedSetQuery}
      placeholder="Search features..."
      isLoading={isFetching}
    />
    <SortDropdown
      options={sortOptions}
      value={filters.sort}
      onChange={setSort}
    />
    <ViewToggle mode={viewMode} onChange={setViewMode} />  {/* grid / list */}
  </SearchHeader>

  <SearchLayout>                              {/* CSS Grid: sidebar + main */}
    <FilterSidebar>
      <ActiveFilterChips
        filters={filters.facets}
        onRemove={toggleFacet}
        onClearAll={clearAll}
      />
      {facetConfig.map(facet => (
        <FacetGroup
          key={facet.key}
          config={facet}
          counts={data?.facets[facet.key]}
          selected={filters.facets[facet.key]}
          onToggle={(value) => toggleFacet(facet.key, value)}
        >
          <FacetCheckbox />          {/* or FacetRange, FacetDateRange */}
          <FacetShowMore />          {/* Expand truncated list */}
        </FacetGroup>
      ))}
    </FilterSidebar>

    <ResultsArea>
      <ResultsCount total={data?.total} query={filters.query} />
      <AnimatePresence mode="popLayout">
        {data?.items.map(item => (
          <motion.div key={item.id} layout>
            {renderItem(item)}
          </motion.div>
        ))}
      </AnimatePresence>
      <Pagination
        currentPage={filters.page}
        totalPages={totalPages}
        onPageChange={setPage}
        siblingCount={1}
      />
    </ResultsArea>
  </SearchLayout>
</SearchPage>
```

### 3.4 Error Handling

| Error Type | Handling | UI Treatment |
|---|---|---|
| Search API error | TanStack retry(2), exponential backoff | "Failed to search" with retry button in results area |
| Empty query + no filters | Prevent API call, show default/popular | "Try searching or browse categories" |
| Rate limit (429) | Respect `Retry-After` header, pause debounce | "Too many requests, please wait" toast |
| Invalid facet combo (0 results) | Still show facets with `count: 0`, grey out | "No results match your filters" with clear button |
| URL tampering (?page=9999) | Clamp page to `[1, totalPages]` | Redirect to last valid page |
| XSS in query | Sanitize before display (React auto-escapes, but also for API) | N/A — handled by framework |

### 3.5 Loading / Empty States

| State | Behavior |
|---|---|
| Initial load | Skeleton grid: 6 shimmer cards |
| Filtering / refetching | Keep stale results visible with 40% opacity overlay + spinner |
| Empty results | `EmptyState` with illustration: "No features match your search" + "Clear filters" CTA |
| No features in project | Different `EmptyState`: "Create your first feature" + CTA button |
| Facet loading | Skeleton lines (4 rows per facet group) |
| Pagination disabled | Grey out prev/next when at bounds |

### 3.6 Edge Cases

- **URL as source of truth**: All filter state lives in `searchParams`; back/forward buttons work natively
- **Debounce cancel**: If user navigates away mid-debounce, cancel pending request via `AbortController`
- **Facet count updates**: After applying filter A, facets for filter B update their counts (cross-faceting)
- **Mobile**: Filter sidebar collapses into bottom sheet modal with "Apply" button
- **Deep linking**: Share URL with embedded filters — state fully reconstructed from URL
- **Keyboard**: `Esc` clears search input; arrow keys navigate results; `Enter` opens result
- **Result highlighting**: Bold matched query substring in result titles
- **Infinite scroll alternative**: Offer `useInfiniteQuery` with intersection observer for mobile view mode
- **Stale while revalidate**: `TanStack Query staleTime: 60_000` so re-filtering is instant for recent data
- **Filter persistence**: Optional localStorage for "last used sort" preference

---

## 4. User Dashboard (Visualization, CRUD)

### 4.1 State Machine

```
  ┌──────────┐   fetch    ┌──────────┐  success  ┌──────────────┐
  │   INIT   │ ────────►  │ LOADING  │ ────────► │   LOADED     │
  │          │            │          │           │ (data ready) │
  └──────────┘            └────┬─────┘           └──────┬───────┘
                               │ error                  │
                               ▼                        │
                          ┌─────────┐                   │
                          │  ERROR  │                   │
                          └─────────┘                   │
                                                        │
              ┌─────────────────────────────────────────┤
              │                    │                     │
              ▼                    ▼                     ▼
       ┌────────────┐     ┌────────────┐        ┌────────────┐
       │  CREATING  │     │  EDITING   │        │  DELETING  │
       │  (modal)   │     │  (modal)   │        │ (confirm)  │
       └──────┬─────┘     └──────┬─────┘        └──────┬─────┘
              │                  │                      │
         ┌────┴────┐       ┌────┴────┐            ┌────┴────┐
         │         │       │         │            │         │
    ┌────▼──┐ ┌────▼──┐ ┌──▼───┐ ┌───▼──┐   ┌────▼──┐ ┌────▼──┐
    │  OK   │ │FAILED │ │  OK  │ │FAILED│   │  OK   │ │FAILED │
    │(toast)│ │(toast)│ │(toast│ │(toast│   │(toast)│ │(toast)│
    └───────┘ └───────┘ └──────┘ └──────┘   └───────┘ └───────┘
         │                  │                     │
         └──────────┬───────┘                     │
                    ▼                             ▼
              ┌──────────────┐             ┌──────────────┐
              │  INVALIDATE  │             │  INVALIDATE  │
              │  + REFETCH   │             │  + REFETCH   │
              └──────────────┘             └──────────────┘

  Concurrent states: Main view can be LOADED while overlay is CREATING/EDITING/DELETING
```

### 4.2 Data Flow

```
Props In:
  └── (none — page-level component, reads from route params)

Route Params:
  └── /dashboard — no params, fetches all user projects

Internal State (Zustand store — already exists):
  ├── projects: Project[]
  ├── features: Feature[]          // Per-project, loaded on demand
  └── tags: Tag[]

Server State (TanStack Query):
  ├── useQuery(['projects'])                      → Project list
  ├── useQuery(['project', id])                   → Single project detail
  ├── useQuery(['project', id, 'stats'])          → Aggregated stats
  └── useMutation(['createProject' | 'updateProject' | 'deleteProject'])

Derived (useMemo):
  ├── projectStats: { totalFeatures, totalScenarios, totalSteps } per project
  ├── recentActivity: last 10 modified features across projects
  ├── chartData: { labels: string[], datasets: number[] }  — for viz
  └── searchFilteredProjects: filtered by dashboard search input

API Calls:
  ├── GET    /api/projects
  ├── POST   /api/projects
  ├── PATCH  /api/projects/:id
  ├── DELETE /api/projects/:id
  └── GET    /api/projects/:id/stats
```

### 4.3 React Structure

```tsx
// ─── Component Tree ────────────────────────────────────
<DashboardPage>
  <DashboardHeader>
    <h1>Your Projects</h1>
    <SearchInput
      value={searchQuery}
      onChange={setSearchQuery}
      placeholder="Filter projects..."
    />
    <Button onClick={() => setShowCreateModal(true)}>
      <Plus /> New Project
    </Button>
  </DashboardHeader>

  <StatsOverview>                              {/* Top summary cards */}
    <StatCard
      icon={FolderOpen}
      label="Projects"
      value={projects.length}
      trend={+2}                               {/* vs last month */}
    />
    <StatCard icon={FileText} label="Features" value={totalFeatures} />
    <StatCard icon={ListChecks} label="Scenarios" value={totalScenarios} />
    <StatCard icon={GitBranch} label="Steps" value={totalSteps} />
  </StatsOverview>

  <DashboardGrid>
    <ChartSection>                             {/* Visualization */}
      <FeaturesByProjectChart data={chartData} />
      <ActivityTimeline events={recentActivity} />
    </ChartSection>

    <ProjectGrid>
      <AnimatePresence>
        {filteredProjects.map(project => (
          <motion.div key={project.id} layout>
            <ProjectCard
              project={project}
              stats={projectStats[project.id]}
              onEdit={() => openEditModal(project)}
              onDelete={() => openDeleteConfirm(project)}
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <Badge>{stats.features} features</Badge>
              <DropdownMenu>
                <DropdownItem onClick={onEdit}>Edit</DropdownItem>
                <DropdownItem onClick={onDelete} destructive>Delete</DropdownItem>
              </DropdownMenu>
            </ProjectCard>
          </motion.div>
        ))}
      </AnimatePresence>
    </ProjectGrid>
  </DashboardGrid>

  {/* ─── Modals ─── */}
  <Modal open={showCreateModal} onClose={closeCreateModal}>
    <ProjectForm                               {/* react-hook-form + zod */}
      mode="create"
      onSubmit={handleCreate}
      isSubmitting={createMutation.isPending}
    />
  </Modal>

  <Modal open={showEditModal} onClose={closeEditModal}>
    <ProjectForm
      mode="edit"
      initialValues={editingProject}
      onSubmit={handleUpdate}
      isSubmitting={updateMutation.isPending}
    />
  </Modal>

  <Modal open={showDeleteConfirm} onClose={closeDeleteConfirm}>
    <ConfirmDialog
      title="Delete project?"
      description={`This will permanently delete "${deletingProject?.name}" and all its features.`}
      confirmLabel="Delete"
      variant="destructive"
      onConfirm={handleDelete}
      isLoading={deleteMutation.isPending}
    />
  </Modal>
</DashboardPage>
```

### 4.4 Error Handling

| Error Type | Handling | UI Treatment |
|---|---|---|
| Projects fetch failure | `useQuery` retry(1), then error state | Full-page error with "Retry" button |
| Create project failure | `useMutation.onError` | Toast error + keep modal open with data |
| Update project failure | `useMutation.onError` | Toast error + keep modal open |
| Delete project failure | `useMutation.onError` | Toast "Failed to delete" |
| Optimistic update rollback | `onMutate` saves previous state, `onError` rolls back | Item flickers back; toast explains |
| Stale data after mutation | `queryClient.invalidateQueries(['projects'])` | Refetch seamlessly in background |

### 4.5 Loading / Empty States

| State | Behavior |
|---|---|
| Initial load | 4 `StatCard` skeletons + 6 `ProjectCard` skeletons (shimmer) |
| Zero projects | `EmptyState`: illustration + "Create your first project" + CTA |
| Search no results | "No projects match your search" + clear search link |
| Deleting project | Card has `opacity: 0.5` + spinner overlay (optimistic remove) |
| Charts loading | Chart area shows skeleton pulse |
| Refetching | Subtle top loading bar (not full skeleton re-render) |

### 4.6 Edge Cases

- **Optimistic updates**: For create/delete, optimistically update Zustand store, rollback on error
- **Concurrent edits**: If two tabs edit same project, last write wins; TanStack refetch syncs
- **Large project count**: Virtualized list with `react-window` if > 50 projects
- **Real-time sync**: Supabase Realtime subscription for `projects` table → auto-invalidate queries
- **Sort preference**: Persist "sort by: recent / name / features" in `localStorage`
- **Bulk actions**: Checkbox selection on cards → bulk delete with confirmation count
- **Responsive grid**: 3 columns desktop, 2 tablet, 1 mobile via CSS Grid `auto-fill`
- **Keyboard**: Cards focusable, `Enter` to navigate, `Delete` to trigger confirm, `n` for new

---

## 5. Auth Flow (Login / Signup / Password Reset)

### 5.1 State Machine

```
                      ┌────────────────────────────┐
                      │        AUTH ROUTER          │
                      └────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
             ┌───────────┐  ┌───────────┐  ┌───────────────┐
             │   LOGIN   │  │  SIGNUP   │  │ RESET_REQUEST │
             └─────┬─────┘  └─────┬─────┘  └───────┬───────┘
                   │              │                 │
                   ▼              ▼                 ▼
             ┌───────────┐  ┌───────────┐  ┌───────────────┐
             │SUBMITTING │  │SUBMITTING │  │  SUBMITTING   │
             └─────┬─────┘  └─────┬─────┘  └───────┬───────┘
                   │              │                 │
              ┌────┴────┐   ┌────┴────┐      ┌─────┴─────┐
              │         │   │         │      │           │
         ┌────▼──┐ ┌────▼──┐┌───▼──┐┌──▼──┐┌──▼───┐ ┌────▼──┐
         │  OK   │ │ ERROR ││  OK  ││ERROR││ SENT │ │ ERROR │
         └───┬───┘ └───────┘└──┬───┘└─────┘└──┬───┘ └───────┘
             │                 │               │
             ▼                 ▼               ▼
  ┌──────────────────┐  ┌──────────┐  ┌───────────────┐
  │ REDIRECT to      │  │ EMAIL    │  │ CHECK_EMAIL   │
  │ /dashboard       │  │ VERIFY   │  │  (message)    │
  └──────────────────┘  │ PENDING  │  └───────────────┘
                        └────┬─────┘
                             │ confirm
                             ▼               ┌────────────────┐
                        ┌─────────┐          │  RESET_CONFIRM │
                        │VERIFIED │          │  (new password)│
                        │→ login  │          └───────┬────────┘
                        └─────────┘                  │
                                                     ▼
                                               ┌───────────┐
                                               │ PASSWORD  │
                                               │ UPDATED   │
                                               │ → login   │
                                               └───────────┘

  OAuth parallel path:
    LOGIN/SIGNUP → OAUTH_REDIRECT → OAUTH_CALLBACK → REDIRECT to /dashboard | ERROR
```

### 5.2 Data Flow

```
Props In:
  └── (none — page-level routes under /auth/*)

Global Auth State (Zustand + Supabase listener):
  ├── user: User | null
  ├── session: Session | null
  ├── isLoading: boolean              // Initial session check
  ├── isAuthenticated: boolean         // Derived
  └── authError: string | null

Events/Methods:
  ├── signInWithEmail(email, password)
  ├── signUpWithEmail(email, password, metadata)
  ├── signInWithOAuth(provider: 'github' | 'google')
  ├── resetPassword(email)
  ├── updatePassword(newPassword)
  ├── signOut()
  └── refreshSession()

API Calls (Supabase Auth SDK):
  ├── supabase.auth.signInWithPassword({ email, password })
  ├── supabase.auth.signUp({ email, password, options: { data: metadata } })
  ├── supabase.auth.signInWithOAuth({ provider })
  ├── supabase.auth.resetPasswordForEmail(email)
  ├── supabase.auth.updateUser({ password })
  ├── supabase.auth.signOut()
  └── supabase.auth.onAuthStateChange(callback)    // Listener
```

### 5.3 React Structure

```tsx
// ─── Auth Store (Zustand) ──────────────────────────────
interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;          // Check existing session
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// ─── Route Guard ───────────────────────────────────────
<ProtectedRoute>                            {/* Wraps authed routes */}
  {isLoading ? <FullPageSpinner /> : null}
  {!isAuthenticated ? <Navigate to="/auth/login" /> : <Outlet />}
</ProtectedRoute>

<GuestRoute>                                {/* Wraps auth pages */}
  {isAuthenticated ? <Navigate to="/dashboard" /> : <Outlet />}
</GuestRoute>

// ─── Component Tree ────────────────────────────────────
<AuthLayout>                                {/* Split layout: form + branding */}
  <BrandPanel>                              {/* Left side — illustration */}
    <Logo />
    <Tagline />
    <FeatureHighlights />
  </BrandPanel>

  <FormPanel>                               {/* Right side — forms */}
    <Routes>
      <Route path="/auth/login" element={<LoginForm />} />
      <Route path="/auth/register" element={<SignupForm />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordForm />} />
      <Route path="/auth/reset-password" element={<ResetPasswordForm />} />
      <Route path="/auth/verify-email" element={<EmailVerifyPending />} />
    </Routes>
  </FormPanel>
</AuthLayout>

// ─── Login Form ────────────────────────────────────────
<LoginForm>
  <form onSubmit={handleSubmit(onLogin)}>   {/* react-hook-form */}
    <Input
      label="Email"
      type="email"
      {...register('email', emailSchema)}
      error={errors.email?.message}
    />
    <Input
      label="Password"
      type="password"
      {...register('password', passwordSchema)}
      error={errors.password?.message}
    />
    <div className="flex justify-between">
      <Checkbox label="Remember me" {...register('rememberMe')} />
      <Link to="/auth/forgot-password">Forgot password?</Link>
    </div>
    <Button type="submit" isLoading={isSubmitting} fullWidth>
      Sign In
    </Button>
  </form>
  <Divider label="or continue with" />
  <OAuthButtons>
    <OAuthButton provider="github" onClick={handleGitHubOAuth} />
    <OAuthButton provider="google" onClick={handleGoogleOAuth} />
  </OAuthButtons>
  <p>Don't have an account? <Link to="/auth/register">Sign up</Link></p>
</LoginForm>

// ─── Signup Form ───────────────────────────────────────
<SignupForm>
  <form onSubmit={handleSubmit(onSignup)}>
    <Input label="Full Name" {...register('name')} />
    <Input label="Email" type="email" {...register('email')} />
    <Input label="Password" type="password" {...register('password')} />
    <PasswordStrengthMeter password={watchedPassword} />
    <Input label="Confirm Password" type="password" {...register('confirmPassword')} />
    <Checkbox label="I agree to Terms of Service" {...register('acceptTerms')} />
    <Button type="submit" isLoading={isSubmitting} fullWidth>
      Create Account
    </Button>
  </form>
  <Divider label="or continue with" />
  <OAuthButtons />
  <p>Already have an account? <Link to="/auth/login">Sign in</Link></p>
</SignupForm>

// ─── Forgot Password ──────────────────────────────────
<ForgotPasswordForm>
  {emailSent ? (
    <SuccessMessage>
      <MailIcon />
      <p>Check your email for a reset link</p>
      <Button variant="ghost" onClick={resend}>Resend email</Button>
    </SuccessMessage>
  ) : (
    <form onSubmit={handleSubmit(onRequestReset)}>
      <Input label="Email" type="email" {...register('email')} />
      <Button type="submit" isLoading={isSubmitting} fullWidth>
        Send Reset Link
      </Button>
    </form>
  )}
  <Link to="/auth/login">Back to login</Link>
</ForgotPasswordForm>
```

### 5.4 Zod Validation Schemas

```tsx
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms' }),
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
```

### 5.5 Error Handling

| Error Type | Handling | UI Treatment |
|---|---|---|
| Invalid credentials | Supabase returns `invalid_grant` | "Invalid email or password" below form |
| Email already registered | Supabase returns `user_already_exists` | "An account with this email already exists" + login link |
| Weak password (server) | Supabase password policy | Inline error on password field |
| OAuth popup blocked | `window.open` returns null | Toast: "Please allow popups for this site" |
| OAuth denied | Callback with `error=access_denied` | "Authentication was cancelled" + retry |
| Email not verified | `email_not_confirmed` | Redirect to `/auth/verify-email` with resend option |
| Reset link expired | Supabase `otp_expired` on password update | "Reset link expired" + "Request new link" button |
| Rate limit | 429 on login/signup | "Too many attempts. Try again in X minutes" |
| Network error | `fetch` failure | "Unable to connect. Check your internet" with retry |
| Session expired | `onAuthStateChange` fires `TOKEN_REFRESHED` failure | Redirect to login with "Session expired" toast |

### 5.6 Loading / Empty States

| State | Behavior |
|---|---|
| Session check (app init) | Full-page spinner with logo (prevents flash of login form) |
| Form submitting | Button shows spinner + text "Signing in..." / "Creating account..." |
| OAuth redirect | "Redirecting to {provider}..." message with spinner |
| Email verification pending | Checkmark illustration + "Check your inbox" + resend timer (60s cooldown) |
| Password reset sent | Envelope illustration + instructions |
| Password strength | Real-time strength meter: weak (red) → fair (orange) → strong (green) |

### 5.7 Edge Cases

- **Session persistence**: Supabase stores session in `localStorage`; `onAuthStateChange` syncs across tabs
- **Tab sync**: `BroadcastChannel` or `storage` event listener to sync logout across tabs
- **OAuth redirect race**: Save `returnTo` URL in `sessionStorage` before OAuth redirect
- **Remember me**: Toggle between `localStorage` (persistent) and `sessionStorage` (session-only) for tokens
- **Password visibility toggle**: Eye icon on password fields, accessible label "Show/hide password"
- **Auto-fill**: Ensure `autocomplete` attributes: `email`, `current-password`, `new-password`
- **CSRF**: Supabase handles via PKCE flow; validate `state` parameter on OAuth callback
- **Brute force protection**: Exponential backoff UI: 1s → 2s → 4s → block for 30s after 5 failures
- **Deep link return**: After login, redirect to original URL stored in `?returnTo=` or `sessionStorage`
- **Magic link alternative**: Support email magic link as passwordless option
- **Accessibility**: `aria-invalid`, `aria-describedby` for error messages; focus first error on submit

---

## 6. Cross-Cutting Patterns

### 6.1 Shared Custom Hooks

```tsx
// ─── Optimistic Mutation ───────────────────────────────
function useOptimisticMutation<T>({
  mutationFn,
  queryKey,
  optimisticUpdate,    // (old: T[], variables) => T[]
  rollback,            // Optional custom rollback
}) {
  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old) => optimisticUpdate(old, variables));
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
      toast.error('Operation failed');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

// ─── Debounced Value ───────────────────────────────────
function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Unsaved Changes Guard ─────────────────────────────
function useUnsavedChangesGuard(isDirty: boolean) {
  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return blocker;
}

// ─── Async Validation ──────────────────────────────────
function useAsyncValidation(
  validateFn: (value: string) => Promise<boolean>,
  delay = 500,
) {
  const [status, setStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const debouncedValidate = useDebouncedCallback(async (value: string) => {
    setStatus('validating');
    const isValid = await validateFn(value);
    setStatus(isValid ? 'valid' : 'invalid');
  }, delay);
  return { status, validate: debouncedValidate };
}
```

### 6.2 Error Boundary Strategy

```
<App>
  <ErrorBoundary fallback={<FullPageError />}>           // App-level crash
    <QueryClientProvider>
      <AuthProvider>
        <ErrorBoundary fallback={<PageError />}>         // Page-level
          <Routes>
            <Route element={<AppShell />}>
              <ErrorBoundary fallback={<SectionError />}> // Section-level
                <Outlet />
              </ErrorBoundary>
            </Route>
          </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
</App>
```

### 6.3 Standard Component Lifecycle

```
Every data-driven page follows this sequence:

  1. MOUNT → Check auth (ProtectedRoute)
  2. LOADING → useQuery fires, show skeleton
  3. ERROR → Show error state with retry
  4. EMPTY → Show EmptyState with CTA
  5. LOADED → Render data, enable interactions
  6. MUTATING → Optimistic update, disable trigger, show spinner
  7. REFETCH → Background invalidation after mutation
  8. UNMOUNT → Cleanup subscriptions, cancel in-flight requests
```

### 6.4 File Structure for New Components

```
src/
  components/
    auth/
      AuthLayout.tsx
      LoginForm.tsx
      SignupForm.tsx
      ForgotPasswordForm.tsx
      ResetPasswordForm.tsx
      OAuthButtons.tsx
      PasswordStrengthMeter.tsx
      EmailVerifyPending.tsx
    pricing/
      PricingCalculator.tsx
      PlanSelector.tsx
      PlanCard.tsx
      AddonPicker.tsx
      AddonCard.tsx
      BillingToggle.tsx
      SeatsSlider.tsx
      PromoCodeInput.tsx
      PriceSummary.tsx
      CheckoutButton.tsx
    search/
      SearchPage.tsx
      FilterSidebar.tsx
      FacetGroup.tsx
      FacetCheckbox.tsx
      ActiveFilterChips.tsx
      ResultsArea.tsx
      Pagination.tsx
      SortDropdown.tsx
    dashboard/
      StatsOverview.tsx
      StatCard.tsx
      ProjectGrid.tsx
      ProjectCard.tsx
      ProjectForm.tsx
      ConfirmDialog.tsx
      FeaturesByProjectChart.tsx
      ActivityTimeline.tsx
    forms/
      MultiStepForm.tsx
      ProgressBar.tsx
      StepRenderer.tsx
      StepNavigation.tsx
  hooks/
    useMultiStepForm.ts
    useSearchFilters.ts
    usePricingCalculator.ts
    useAuth.ts
    useOptimisticMutation.ts
    useDebouncedValue.ts
    useUnsavedChangesGuard.ts
    useAsyncValidation.ts
  schemas/
    auth.schema.ts
    project.schema.ts
    pricing.schema.ts
```
