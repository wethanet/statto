# Statto

A browser-first AFL team stats and club admin app built with Vite, React, TypeScript, and Supabase.

Statto helps clubs, coaches, and team managers keep the weekly chaos under control in one place, from training attendance and match availability through to live stats, votes, fitness tracking, and fines.

## Tech Stack

- Vite
- React
- TypeScript
- Supabase

## Features

- Training attendance tracking
- Match availability management
- Live match stats entry
- Match voting across players, coaches, and B&F
- Team management with CSV import
- Fitness tracking
- Player fines and payment tracking
- Shared club access with invite codes

## Getting Started

### Prerequisites

- Node.js
- npm

### Install dependencies

```bash
npm --prefix web install
```

### Start the web app

```bash
npm run dev
```

### Build the web app

```bash
npm run build
```

### Typecheck

```bash
npm run typecheck
```

### Release version

Bump the app version before each release so the live app shows the new build number:

```bash
npm run release:patch
```

Use `npm run release:minor` or `npm run release:major` when the release needs a larger version step.

## Supabase Setup

1. Create a Supabase project.
2. Copy [web/.env.example](/Users/andrewmccallum/Development/statto/web/.env.example) to `web/.env.local`.
3. Fill in:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Run [supabase/schema.sql](/Users/andrewmccallum/Development/statto/supabase/schema.sql) in the Supabase SQL editor.
5. Enable email/password sign-in in Supabase Auth.
6. Configure Auth URL settings:
   - Site URL: your deployed app URL.
   - Redirect URLs: your deployed app URL plus `/auth/reset-password`, and any local dev URL you use plus `/auth/reset-password`.
7. Configure custom SMTP for production Auth emails. Supabase's default email service is only suitable for development and restricted test addresses.
   - Use a dedicated auth sending identity, for example `no-reply@auth.example.com`.
   - Set DKIM, SPF, and DMARC with the email provider.
   - Keep SMTP credentials out of `web/.env.local`; that file is for browser-safe `VITE_*` values only.
   - For local Supabase config, copy [.env.example](/Users/andrewmccallum/Development/statto/.env.example), fill the `SMTP_*` values, and restart Supabase.
8. Configure Resend for reminder emails sent from Supabase Edge Functions:
   - Set `RESEND_API_KEY` as a Supabase function secret.
   - Set `RESEND_FROM_EMAIL` to a verified sender identity, for example `Warners Bay Bulldogs <no-reply@example.com>`.
9. If you want Google login, enable the Google provider in Supabase Auth, add your app URL and local dev URL to the Google OAuth client, and add the same redirect URLs to Supabase Auth URL configuration.
10. Restart the Vite dev server after changing environment variables.

Use only the public anon key in the client app. Do not use the Supabase service role key in `web/.env.local` or in Vercel.

## Deployment

Recommended Vercel settings:

- Framework Preset: `Vite`
- Root Directory: `web`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

Set these environment variables in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

SPA rewrites are configured in [web/vercel.json](/Users/andrewmccallum/Development/statto/web/vercel.json).

## Security Checks

GitHub Actions runs a security workflow from [.github/workflows/security.yml](/Users/andrewmccallum/Development/statto/.github/workflows/security.yml) that covers:

- `npm audit` against the `web/` app dependencies
- Gitleaks secret scanning across the repository

The workflow runs on pull requests, pushes to `main`, manual dispatch, and a weekly schedule.

## Project Structure

```text
statto/
├── lib/                # shared domain logic and data helpers
├── supabase/           # schema and database assets
├── web/                # Vite + React application
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── routes/
│   │   └── styles/
│   └── package.json
└── README.md
```

## Notes

- The Expo app has been removed. `web/` is now the only supported runtime.
- Root npm scripts proxy into `web/`, but dependency installation should be run against `web/`.
- Shared business logic remains in root `lib/` so the web app can stay thin and focused on browser concerns.
- Product feature and fix follow-up work is tracked in [FEATURE_BACKLOG.md](/Users/andrewmccallum/Development/statto/FEATURE_BACKLOG.md).

## License

Add your preferred license here.
