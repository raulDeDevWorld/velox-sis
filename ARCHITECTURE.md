# Lava Velox Architecture

## Target Structure

The application should evolve incrementally toward a feature-first architecture:

```txt
src/
  app/              Next.js route boundaries only
  features/         Business domains and workflows
  shared/           Cross-cutting UI, browser, logging and formatting utilities
  services/         External adapters such as Supabase, storage and exports
  supabase/data/    Supabase persistence modules split by domain
  components/       Legacy shared components during migration
  context/          Legacy app state during migration
```

## Current Migration Rule

Do not move large route files until the behavior is covered by focused tests. New code should go into `shared/`, `features/` or `services/` first, then old route code should be reduced gradually.

## Layer Rules

- `app/` can compose pages, layouts and route-level loading states.
- `features/` owns business workflows such as orders, customers, services and branches.
- `features/*/*.repository.js` can depend on `services/`, but not on `app/`, `components/` or route state.
- `services/supabase/*.adapter.js` is the boundary to Supabase persistence.
- `shared/` must not depend on app routes or business data.
- Supabase access should stay behind adapter functions; page components should not know table schemas.
- UI components should receive normalized props and avoid reading global context directly unless they are layout/navigation components.

## Data Access Flow

```txt
app route/page
  -> feature repository
  -> service adapter
  -> Supabase domain data module
  -> Supabase client
```

Legacy path compatibility is concentrated in `src/supabase/database.js`. New code should use the domain adapters in `src/services/supabase/` instead of importing that compatibility module directly. Domain-specific persistence logic belongs in `src/supabase/data/`.

## Production Quality Gates

Before a production release:

- `npm run lint`
- `npm test`
- `npm run build`
- no `console.log` in `src`
- no invalid JSX SVG attributes
- no local logs, caches or generated artifacts tracked
- role-based flows verified against Supabase RLS
