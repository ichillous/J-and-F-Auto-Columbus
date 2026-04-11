# Repository Guidelines

## Project Structure & Module Organization
This repo is a Next.js App Router application for a single-dealership car site with a Supabase-backed admin panel. Public routes live in `app/` (`app/page.tsx`, `app/inventory`, `app/contact`, `app/cars/[slug]`). Admin and auth flows live under `app/admin/**` and `app/auth/**`. Shared UI components are in `components/`, admin-only components in `components/admin/`, and shadcn primitives in `components/ui/`. Put shared logic in `lib/`, especially `lib/supabase/*`, `lib/auth.ts`, `lib/types.ts`, and `lib/utils.ts`. Static images belong in `public/` or `public/assets/`. Database changes go in ordered SQL files under `supabase/migrations/`.

## Build, Test, and Development Commands
Use `npm install` to install dependencies. `npm run dev` starts the local Next.js server on port 3000. `npm run build` creates the production build, and `npm run start` serves that build. `npm run lint` runs the repository’s ESLint config and is the minimum pre-PR check. Supabase migrations are applied manually from `supabase/migrations/*.sql` in order.

## Coding Style & Naming Conventions
Write TypeScript with strict typing and App Router conventions. Follow the existing style: 2-space indentation, single quotes, semicolons, and functional React components. Use the `@/` path alias instead of long relative imports. Keep route folders lowercase, component filenames kebab-case (for example `lead-form-modal.tsx`), and exported component names PascalCase. Default to server components; add `'use client';` only when hooks, browser APIs, or client-side state are required.

## Testing Guidelines
There is no automated test runner configured yet. For now, run `npm run lint` and manually verify the main flows you touch: public pages, inventory filtering, car detail leads, and relevant admin CRUD/auth screens. If you add tests, prefer `*.test.ts` or `*.test.tsx` colocated with the feature or under a nearby `__tests__/` folder.

## Commit & Pull Request Guidelines
This branch has no existing commit history, so use clear imperative commits with a scope, such as `feat(admin): add car image upload` or `fix(auth): protect settings route`. PRs should include a short summary, linked issue if available, notes for any migration or env-var changes, screenshots for UI changes, and a brief manual test checklist.

## Security & Configuration Tips
Keep Supabase keys in `.env.local` and never commit secrets. Only check in reviewed migration files, and call out schema or storage changes in the PR description so reviewers can replay them safely.
