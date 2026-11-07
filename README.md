# Brand Catalyst

**The deal desk for creator partnerships.** Brands and creators find the right fit, negotiate a
campaign agreement (a *Consignment*) clause by clause, and lock terms both sides can trust.

Built at [UB Hacking 2026](https://ubhacking.cse.buffalo.edu/). All code in this repository was
written during the event; the concept was first explored in an earlier class project, but no code,
designs or other materials from it are reused.

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui (Base UI) |
| Database | [Tiger Data](https://www.tigerdata.com/) (Postgres + TimescaleDB) via Drizzle ORM |
| Auth | Clerk |
| Real-time | Pusher Channels (Milestone 3) |
| AI | Google Gemini API (Milestone 4) |
| Hosting | Vercel |

## Getting started

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL and the Clerk keys
npm run db:push              # create tables in Tiger Data
npm run dev                  # http://localhost:3000
```

Ask the team lead for the shared Tiger Data and Clerk development keys.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run db:push` | Push `src/db/schema.ts` to the database |
| `npm run db:studio` | Browse the database in Drizzle Studio |

## Project structure

```
src/
  app/
    (app)/            signed-in pages: dashboard, discover, collaborations, messages, profile...
    onboarding/       role selection and first profile fields
    sign-in/ sign-up/ Clerk pages
  components/         shared components; ui/ holds shadcn primitives
  db/schema.ts        all tables (owner: data lead)
  lib/                auth helpers, profile helpers, constants
  proxy.ts            Clerk auth (Next.js 16 renamed middleware to proxy)
```

## Working together

- `main` is always deployable. Branch per feature (`feat/invitations`), open a PR, squash-merge.
- One person owns `src/db/schema.ts`; coordinate schema changes with them.
- Never commit `.env.local`. The repository is public.
- Every server action checks the signed-in user and their role on the server (`requireUser`).

## AI tools disclosure

Parts of this project were written with the help of AI coding assistants (Claude), as allowed by
MLH rules. The team reviewed and directed all code.
