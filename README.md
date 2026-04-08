# Statto

An AFL team stats and admin app built with Expo.

Statto helps clubs, coaches, and team managers keep the weekly chaos under control in one place — from training attendance and game availability through to match stats, player votes, and fines.

## Features

* **Training attendance** tracking for players across sessions
* **Game availability** management for upcoming matches
* **Game stats** recording and review
* **Player votes** entry and tallying
* **Player fines** logging and tracking

## Why Statto?

Local footy admin can get messy fast. Statto is designed to give clubs a simple way to manage the player data that usually ends up scattered across group chats, notebooks, spreadsheets, and someone’s memory.

## Tech Stack

* **Expo**
* **React Native**
* **TypeScript**
* **Supabase** for auth and online storage

## Getting Started

### Prerequisites

Make sure you have installed:

* [Node.js](https://nodejs.org/)
* npm, yarn, pnpm, or bun
* Expo Go on your mobile device, or an iOS/Android simulator

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npx expo start
```

This will open the Expo developer tools in your terminal or browser. From there you can run the app on:

* **iOS simulator**
* **Android emulator**
* **Expo Go** on a physical device
* **Web**

### Supabase setup

Statto now supports:

* email/password auth with Supabase Auth
* shared club/team access in Supabase
* local fallback storage when Supabase is not configured yet

To enable Supabase:

1. Create a Supabase project.
2. Copy [.env.example](/Users/andrewmccallum/Development/statto/.env.example) to `.env` and fill in:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

3. In the Supabase SQL editor, run [supabase/schema.sql](/Users/andrewmccallum/Development/statto/supabase/schema.sql).
4. In Supabase Auth, enable email/password sign-in.
5. Restart the Expo dev server.

For EAS deploys and builds, set the same `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` values in your EAS environment as well. Local
`.env` files help during development, but remote EAS deploys need those values
provided in the export environment too.

For web deploys, do not rely on `eas deploy` by itself. The browser bundle needs
to be exported with the right environment first, then deployed. In this project
the safe production path is:

```bash
npm run deploy
```

That script pulls the production EAS environment locally, exports the web app,
and then deploys the generated bundle.

Once configured, the app will require sign-in before opening the main tabs. Users can create a club or join an existing one with an invite code, and team data, training sessions, attendance, fixtures, availability, and votes are stored against that shared club so multiple people can manage the same team.

## Project Structure

```text
statto/
├── app/
├── components/
│   ├── ui/
├── features/
│   ├── attendance/
│   ├── availability/
│   ├── stats/
│   ├── votes/
│   └── fines/
├── constants/
├── hooks/
├── services/
├── store/
├── assets/
└── README.md
```

## Core Modules

### Attendance

Track who turns up to training and build a reliable attendance history across the season.

### Availability

Let players mark whether they are available, unavailable, or uncertain for upcoming games.

### Game Stats

Capture match-day performance data for players and teams.

Possible stat categories could include:

* Kicks
* Handballs
* Marks
* Tackles
* Goals
* Behinds
* Hitouts
* Clearances
* Inside 50s

### Player Votes

Record votes after each match and keep a running leaderboard across the season.

### Player Fines

Track team fines with reasons, amounts, and payment status.

## Roadmap

Potential future features:

* Team selection tools
* Season ladders and player leaderboards
* Push notifications for training and match reminders
* Coach and admin roles
* Data export to CSV
* Match reports and summaries
* Club payments integration

## Scripts

Common Expo scripts:

```bash
npm run start
npm run android
npm run ios
npm run web
```

Depending on your setup, your `package.json` scripts may vary.

## Environment Variables

If your app uses environment variables, create a `.env` file in the project root.

Example:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Never commit secrets to version control.

## Contributing

Contributions, ideas, and feedback are welcome.

To contribute:

1. Fork the repo
2. Create a feature branch
3. Commit your changes
4. Open a pull request

## Design Principles

Statto aims to be:

* **Fast** enough for match day
* **Simple** enough for volunteers and team managers
* **Useful** enough that coaches actually keep using it
* **Flexible** enough to work across local clubs and competitions

## License

Add your preferred license here.

---

Built for footy clubs who are tired of running the season off spreadsheets, whiteboards, and pure optimism.
