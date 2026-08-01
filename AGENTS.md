<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Pixel Idol Development Guide

## Project overview

Pixel Idol is a season-based territory game for idol fandoms.

Users select one idol to support and use tokens to occupy empty tiles, attack adjacent enemy tiles, defend their territory, and contribute to their fandom's connected territory.

At the end of each season, the final map is rendered as a permanent image and stored in a season archive.

## Current development stage

The current goal is to build and validate a local game prototype.

Do not implement production authentication, payment processing, real-money token purchases, or large-scale realtime infrastructure unless explicitly requested.

## Core MVP rules

- The map is made of square tiles.
- Each user supports one idol.
- Each idol has a predefined starting territory.
- Empty tiles can only be occupied when adjacent to the user's idol territory.
- Adjacency uses four directions only: up, down, left, and right.
- Diagonal adjacency does not count.
- Enemy tiles can only be attacked when adjacent to the user's idol territory.
- Each tile has HP.
- An attack reduces the tile's HP.
- When HP reaches zero, ownership changes to the attacking idol.
- Ownership, HP, and token calculations must be handled by pure game logic functions.
- Game balance values must be stored in centralized configuration rather than hardcoded throughout the UI.

## Representative canvas concept

Each fandom may later have one season representative image or poster.

The largest connected territory owned by an idol may be treated as that idol's representative canvas.

Planned behavior:

- The largest connected territory displays the representative image.
- Smaller disconnected territories display only the idol color, initials, or pattern.
- Only tiles currently owned by the idol reveal the corresponding portion of the image.
- Losing a tile hides or replaces that part of the image.
- Season-ending maps are rendered and archived permanently.

Do not implement image upload or copyrighted idol photographs without explicit instructions.

## Architecture rules

- Use Next.js App Router.
- Use TypeScript with strict typing.
- Avoid `any`.
- Use Tailwind CSS for styling.
- Use reusable components.
- Keep `src/app/page.tsx` small.
- Separate UI, rendering, state management, game logic, and types.
- Prefer pure functions for game calculations.
- Do not place all game logic inside React components.
- Do not install external packages unless their purpose is explained first.
- Do not modify unrelated files.
- Do not expose secrets in client-side code.
- Do not create environment variables with real credentials in committed files.

## Recommended source structure

Use this structure when appropriate:

```text
src/
  app/
  components/
    game/
    layout/
  config/
  features/
    game/
      components/
      hooks/
      logic/
      types/
  lib/
  styles/
```

The exact structure may be adjusted if there is a clear reason.

## Canvas and map rules

- Render large tile maps using HTML Canvas rather than one DOM element per tile.
- Support panning and zooming.
- Draw only the visible area where practical.
- Keep coordinate conversion logic separate from React UI.
- Device pixel ratio must be handled correctly.
- Selected tiles must be visually highlighted.
- Tile coordinates, owner, and HP must be available in an information panel.
- Do not use browser-only APIs during server rendering without guards.

## Data and state rules

For the local prototype:

- Use mock data or local in-memory state.
- Do not add Supabase, Convex, Firebase, or another backend yet.
- Do not implement localStorage authentication.
- Keep state structures compatible with a future server-backed implementation.
- Identify tiles using stable coordinates or IDs.
- Avoid duplicating the same tile state in multiple places.

For a future production version:

- The client must never determine authoritative attack results.
- Token deduction and tile updates must occur atomically on the server.
- Duplicate requests must be handled safely.
- Server-side validation must check ownership, adjacency, tokens, season status, and rate limits.

## Testing requirements

Add tests for pure game logic when implementing it.

Important cases include:

- four-direction adjacency,
- diagonal rejection,
- occupation eligibility,
- enemy attack eligibility,
- HP reduction,
- ownership transfer,
- insufficient token handling,
- invalid coordinates,
- connected territory calculation.

After meaningful changes, run the available checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Run tests as well when a test script exists.

## Git workflow

Make focused changes and use clear commit messages.

Examples:

```text
chore: initialize project
feat: add canvas tile map
feat: add tile attack logic
fix: prevent diagonal occupation
refactor: separate game rendering logic
test: add ownership transfer tests
docs: update game rules
```

Do not commit:

- `.env.local`
- API secrets
- service-role keys
- build output
- temporary screenshots
- generated local database files

## Coding-agent workflow

Before changing files:

1. Read this file.
2. Inspect the repository.
3. Read the relevant current Next.js documentation from `node_modules/next/dist/docs/`.
4. State which files will be changed.
5. Avoid changing unrelated files.

After changing files:

1. Summarize each changed file.
2. Explain how to test the feature manually.
3. Report lint, type-check, test, and build results.
4. Clearly identify any unresolved issue.
5. Do not claim checks passed unless they were actually run.

## Deferred features

Do not implement these until explicitly requested:

- real-money payment,
- token purchase limits,
- payment refunds,
- user-generated image upload,
- idol registration requests,
- public chat,
- direct messages,
- user-to-user token transfer,
- realtime multiplayer,
- season reward distribution,
- advertising or donation rewards,
- sponsor integration,
- production admin dashboard.
