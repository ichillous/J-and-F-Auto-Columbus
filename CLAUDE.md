# CLAUDE.md

Repository conventions, structure, build commands, coding style, and commit/PR
guidelines live in [`AGENTS.md`](./AGENTS.md). Treat it as the single source of
truth. This file only adds Harness-specific workflow notes that `AGENTS.md`
doesn't cover.

## Harness workflow

- Active task list: [`Plans.md`](./Plans.md). Add new work here before starting.
- Harness config: [`harness.toml`](./harness.toml). Re-run `harness sync` after edits.
- Health check: `harness doctor` — run after pulls that touch `harness.toml` or `.claude-plugin/`.

## Project-specific reminders

- `.env` and `.env.local` are denied via `harness.toml` sandbox rules. Use `.env.example` as reference.
- Supabase migrations apply manually, in order, from `supabase/migrations/*.sql` — never reorder or edit a shipped migration.
- Default to server components; add `'use client'` only when needed (see `AGENTS.md`).
