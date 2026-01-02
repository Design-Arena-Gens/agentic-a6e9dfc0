# Agentic Studio – YouTube Automation Copilot

Agentic Studio is a Next.js application that orchestrates the full lifecycle of a YouTube drop. Ingest media, generate a narrative plan, craft metadata and chat with the production agent—all from a single workspace optimised for rapid iteration.

Live deployment: https://agentic-a6e9dfc0.vercel.app

## Features

- Drag-and-drop asset intake with instant tagging for video and audio clips.
- Creative brief form that returns hooks, storyline beats, shot lists and VO script moments.
- Metadata intelligence that converts the plan into titles, descriptions, keywords and chapters tuned for search intent.
- Production pipeline timeline that tracks ingest → scripting → metadata → publish readiness.
- Realtime chat copilot that stays aware of workspace state (uploads, plan, metadata) for fast adjustments.

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [React 18](https://react.dev) with TypeScript
- [Zod](https://github.com/colinhacks/zod) for runtime validation
- Custom glassmorphism interface styled with modern CSS

## Getting Started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to interact with the workspace.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
app/
  api/agent/route.ts     # AI agent endpoints for planning, metadata and chat
  layout.tsx             # Shared shell and theming
  page.tsx               # Main dashboard UI and client-side logic
  globals.css            # Global styling / visual system
lib/
  agent.ts               # Synthetic agent logic and generators
```

## Customising the Agent

- Extend `lib/agent.ts` with real model calls (OpenAI, Vertex, etc.).
- Persist uploaded assets by connecting to object storage or a database.
- Wire YouTube OAuth + Data API v3 for automated publishing.
- Add background jobs to export renders or trigger template-based edits.

## Deployment

The repo is preconfigured for Vercel. To redeploy:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-a6e9dfc0
```

## License

MIT © 2026 Agentic Studio
