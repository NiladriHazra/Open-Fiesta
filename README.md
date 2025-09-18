# Open-Fiesta

<video controls poster="./public/osfiesta.png" width="800">
  <source src="./public/OSFiesta.mp4" type="video/mp4" />
  <a href="./public/OSFiesta.mp4">
    <img src="./public/osfiesta.png" alt="Open-Fiesta preview" />
  </a>
  Your browser does not support the video tag.
</video>

<!-- Fallback link for renderers that don't support <video> -->

[![Open-Fiesta](public/osfiesta.png)](public/OSFiesta.mp4)

An open-source, multi-model AI chat playground built with Next.js App Router. Switch between providers and models, compare outputs side-by-side, and use optional web search and image attachments.

## Features

- **Multiple providers**: Gemini, OpenRouter (DeepSeek R1, Llama 3.3, Qwen, Mistral, Moonshot, Reka, Sarvam, etc.)
- **Selectable model catalog**: choose up to 5 models to run
- **Web search toggle** per message
- **Image attachment** support (Gemini)
- **Conversation sharing**: Share conversations with shareable links
- **Clean UI**: keyboard submit, streaming-friendly API normalization

## Tech Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- API routes for provider calls
- Docker containerization support

## Quick Start

### Option 1: Traditional Development

1. Install deps

```bash
npm i
```

2. Configure environment
   Copy the example environment file:

```bash
cp env.example .env
```

Then set the environment variables you plan to use. You can also enter keys at runtime in the app's Settings.

```bash
# OpenRouter (wide catalog of community models)
OPENROUTER_API_KEY=your_openrouter_key

# Google Gemini (Gemini 2.5 Flash/Pro)
GEMINI_API_KEY=your_gemini_key

# Supabase (auth + chat persistence)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run dev server

```bash
npm run dev
# open http://localhost:3000
```

## Environment Variables

Set only those you need; others can be provided per-request from the UI:

- `OPENROUTER_API_KEY` — required for OpenRouter models.
- `GEMINI_API_KEY` — required for Gemini models with images/web.
- `OLLAMA_URL` — base URL for Ollama API (e.g., http://localhost:11434 or http://host.docker.internal:11434)

## Supabase Setup

To enable authentication and chat persistence, configure Supabase:

- **Required env vars** (local `.env.local` and Vercel Project Settings):
  - `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon/public API key

- **OAuth redirect URL** (if using Google/GitHub sign-in):
  - Add to each provider in Supabase Auth Settings:
    - `https://YOUR_DOMAIN/auth/callback` (Production)
    - `http://localhost:3000/auth/callback` (Local)

- **Database schema** (tables used by this app). Run in Supabase SQL editor:

```sql
-- Chats table
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid null,
  title text not null default 'New Chat',
  page_type text not null default 'home',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  owner_id uuid not null,
  role text not null check (role in ('system','user','assistant')),
  content text not null,
  model text null,
  content_json jsonb null,
  metadata jsonb null,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_chats_owner on public.chats(owner_id);
create index if not exists idx_msgs_chat on public.messages(chat_id);
create index if not exists idx_msgs_owner on public.messages(owner_id);

-- Row Level Security (optional; tighten as needed)
alter table public.chats enable row level security;
alter table public.messages enable row level security;

-- Simple owner-based policies (adjust to your auth strategy)
do $$ begin
  if not exists (
    select 1 from pg_policy where polname = 'chats_owner_policy'
  ) then
    create policy chats_owner_policy on public.chats
      using (owner_id::text = auth.uid()::text)
      with check (owner_id::text = auth.uid()::text);
  end if;

  if not exists (
    select 1 from pg_policy where polname = 'messages_owner_policy'
  ) then
    create policy messages_owner_policy on public.messages
      using (owner_id::text = auth.uid()::text)
      with check (owner_id::text = auth.uid()::text);
  end if;
end $$;
```

Notes:
- The app uses `lib/supabase.ts` on the client. Ensure the two `NEXT_PUBLIC_*` vars are set in Vercel to avoid build/runtime issues.
- If you change columns, update usages in `lib/data.ts` accordingly.

### How it works (at a glance)

- **Client setup**: `lib/supabase.ts` creates a Supabase client from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Auth context**: `lib/auth.tsx` (`AuthProvider`) listens to `supabase.auth` and exposes `user/session` to the app.
- **Sign in UI**: `app/signin/page.tsx` renders Google/GitHub buttons via `AuthProvider.signInWithProvider()`.
- **OAuth callback**: `app/auth/callback/route.ts` handles the redirect from providers.
- **Data access**: `lib/data.ts` reads/writes:
  - `fetchThreads(userId)` -> selects user's `chats` + `messages`.
  - `createThread(...)` -> inserts into `chats` and optional first `messages` row.
  - `addMessage(...)` -> inserts into `messages` and touches `chats.updated_at`.
  - `updateThreadTitle(...)` / `deleteThread(...)` -> updates/deletes `chats`.
- **Chat flow**: `lib/chatActions.ts` orchestrates chat turn lifecycle and persists messages. The UI (`components/chat/ChatGrid.tsx`) displays and supports editing.

### Step-by-step: set up Supabase

1. **Create Supabase project**
   - Go to supabase.com -> New Project.
   - From Project Settings -> API, copy:
     - Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
     - anon/public API key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Configure OAuth providers (optional but recommended)**
   - In Supabase Dashboard -> Authentication -> Providers:
     - Enable Google and/or GitHub.
     - Set Redirect URLs:
       - Local: `http://localhost:3000/auth/callback`
       - Prod: `https://YOUR_DOMAIN/auth/callback`

3. **Create tables and policies**
   - Open SQL editor in Supabase, paste the schema above in “Database schema” and run.
   - This creates `public.chats` and `public.messages`, indexes, RLS, and owner policies.

4. **Add env vars to your app**
   - Local: create `.env.local` (or `.env`) and set:
     ```bash
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - Vercel: Project Settings -> Environment Variables -> add both for Production and Preview.

5. **Run the app**
   - `npm run dev` -> open http://localhost:3000
   - Use the Sign In button (top-right) to authenticate.
   - Start a chat; threads/messages will be persisted in Supabase.

### Troubleshooting

- **Build fails with “supabaseUrl is required”**
  - Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel.
  - We guard the client in `lib/supabase.ts` to avoid SSR/prerender crashes, but missing envs will still block actual usage.

- **403 / RLS errors**
  - Confirm you are signed in (see `components/auth/AuthButton.tsx`).
  - Check `owner_id` is set to `auth.uid()` on insert paths used by `lib/data.ts`.
  - Verify the owner policies from the schema ran successfully.

- **Nothing shows in sidebar after sign-in**
  - `lib/data.ts.fetchThreads(userId)` filters `chats.owner_id = userId`. Ensure you created chats after logging in.

- **Changed schema?**
  - Update `lib/data.ts` mappings: `mapChatRowToThread()` and `mapMessageRowToChatMessage()`.

## Bypass sign-in (dev only)

Enable a safe, local-only bypass to develop without authenticating.

### How to enable

1. Copy example env file and edit locally:
   ```bash
   cp env.example .env.local
   ```
2. In `.env.local` set:
   ```bash
   NEXT_PUBLIC_BYPASS_AUTH=1
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. The app will treat you as a signed-in mock user. UI gates won’t block.

### How it works

- `lib/auth.tsx` checks both:
  - `process.env.NEXT_PUBLIC_BYPASS_AUTH === '1'`
  - `process.env.NODE_ENV !== 'production'`
- When true, it:
  - Sets a mock `User` (`id: 00000000-0000-0000-0000-000000000001`)
  - Skips Supabase auth listeners
  - Makes `signInWithProvider()` a no-op in dev

### Safety

- Bypass is hard-disabled in production by the `NODE_ENV` check.
- Do not set `NEXT_PUBLIC_BYPASS_AUTH` on Vercel.
- Example variables are in `env.example`; copy it locally instead of committing secrets.

## Ollama Support

Open-Fiesta supports local Ollama models. To use Ollama:

1. **Configure Ollama**:
   - Ensure Ollama is running and accessible: `ollama serve`
   - Make sure Ollama is configured to accept external connections by setting:
     ```bash
     export OLLAMA_HOST=0.0.0.0:11434
     ```

2. **Add Ollama Models**:
   - Go to the "Custom Models" section in the app (wrench icon)
   - Add Ollama models by entering the model name (e.g., "llama3", "mistral", "gemma")
   - The system will validate that the model exists in your Ollama instance

3. **Docker Networking**:
   - If running Open-Fiesta in Docker, use `http://host.docker.internal:11434` as the Ollama URL
   - This allows the Docker container to communicate with Ollama running on your host machine

4. **Select and Use**:
   - Select your Ollama models in the model picker
   - Start chatting with your locally running models

## Docker Support

This project includes comprehensive Docker support for both development and production:

### Development

- Hot reload enabled for instant code changes
- Volume mounting for live code updates
- Includes all development dependencies

### Production

- Multi-stage build for optimized image size (~100MB)
- Proper security practices with non-root user
- Environment variable configuration support

### Available Docker Commands

- `npm run docker:build` - Build production Docker image
- `npm run docker:run` - Run production container
- `npm run docker:dev` - Start development environment with Docker Compose
- `npm run docker:prod` - Start production environment with Docker Compose

## Project Structure

- `app/` – UI and API routes
  - `api/openrouter/route.ts` – normalizes responses across OpenRouter models; strips reasoning, cleans up DeepSeek R1 to plain text
  - `api/gemini/route.ts`, `api/gemini-pro/route.ts`
  - `shared/[encodedData]/` – shared conversation viewer
- `components/` – UI components (chat box, model selector, etc.)
  - `shared/` – components for shared conversation display
- `lib/` – model catalog and client helpers
  - `sharing/` – conversation sharing utilities
- `Dockerfile` – Production container definition
- `Dockerfile.dev` – Development container definition
- `docker-compose.yml` – Multi-container setup
- `.dockerignore` – Files to exclude from Docker builds

## Notes on DeepSeek R1

Open-Fiesta post-processes DeepSeek R1 outputs to remove reasoning tags and convert Markdown to plain text for readability while preserving content.

## Contributing

We welcome contributions of all kinds: bug fixes, features, docs, and examples.

- **Set up**
  - Fork this repo and clone your fork.
  - Start the dev server with `npm run dev`.

- **Branching**
  - Create a feature branch from `main`: `feat/<short-name>` or `fix/<short-name>`.

- **Coding standards**
  - TypeScript, Next.js App Router.
  - Run linters and build locally:
    - `npm run lint`
    - `npm run build`
  - Keep changes focused and small. Prefer clear names and minimal dependencies.

- **UI/UX**
  - Reuse components in `components/` where possible.
  - Keep props typed and avoid unnecessary state.

- **APIs & models**
  - OpenRouter logic lives in `app/api/openrouter/`.
  - Gemini logic lives in `app/api/gemini/` and `app/api/gemini-pro/`.
  - If adding models/providers, update `lib/models.ts` or `lib/customModels.ts` and ensure the UI reflects new options.

- **Docker changes**
  - When modifying dependencies, ensure both `Dockerfile` and `Dockerfile.dev` are updated if needed
  - Test both development and production Docker builds

- **Commit & PR**
  - Write descriptive commits (imperative mood): `fix: …`, `feat: …`, `docs: …`.
  - Open a PR to `main` with:
    - What/why, screenshots if UI changes, and testing notes.
    - Checklist confirming `npm run lint` and `npm run build` pass.
    - Test both traditional and Docker setups if applicable.
  - Link related issues if any.

- **Issue reporting**

Thank you for helping improve Open‑Fiesta!

## License

This project is licensed under the MIT License. See `LICENSE` for details.

## Acknowledgements

- Model access via OpenRouter and Google
