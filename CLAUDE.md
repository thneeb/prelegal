# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation (PL-5) has AI chat for the Mutual NDA Creator with a tab switcher (Chat / Form). Multi-document support and real authentication have not been built yet.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database should use SQLLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
The frontend is statically built (`next build` with `output: 'export'` and `trailingSlash: true`) and served by FastAPI via `StaticFiles`.  
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation history

### PL-4 — V1 Foundation (merged 2026-04-05)

- **Backend** (`backend/`): FastAPI uv project. On startup, initialises a SQLite DB at `$DB_PATH` (default `/data/prelegal.db`) with a `users` table. Exposes `/api/health` and `/api/login` (fake — any credentials accepted). Serves the statically-built frontend via `StaticFiles`.
- **Frontend** (`frontend/`): Next.js with `output: 'export'` and `trailingSlash: true`. Unauthenticated visits to `/` redirect to `/login/`. Login stores the email in `localStorage` under `prelegal_user`. The existing Mutual NDA Creator is the only app screen.
- **Docker**: Multi-stage `Dockerfile` — Stage 1 builds the Next.js `out/` directory; Stage 2 copies it into `backend/static/` and runs uvicorn. `docker-compose.yml` exposes port 8000 and mounts a named volume for the SQLite database. Use `docker-compose` (hyphen) — the `docker compose` plugin is not installed.
- **Scripts**: `scripts/start-*.sh` / `stop-*.sh` for Mac and Linux; `scripts/start-windows.ps1` / `stop-windows.ps1` for Windows. All wrap `docker-compose up --build -d` / `docker-compose down`.
- **Running locally without Docker**: `cd backend && DB_PATH=/tmp/prelegal.db uv run uvicorn main:app --host 0.0.0.0 --port 8000` (requires `backend/static/` to be populated by copying `frontend/out/`).

### PL-5 — AI Chat for Mutual NDA (merged 2026-04-07)

- **Backend** (`backend/chat.py`): `POST /api/chat` endpoint using LiteLLM + OpenRouter + Cerebras (`openrouter/openai/gpt-oss-120b`) with Pydantic structured outputs. `next_question()` handles deterministic flow control — appends the next unanswered field question if the LLM reply omits it. Signatures are stripped from the context sent to the LLM.
- **Frontend**: Tab switcher (Chat / Form) with CSS hide/show to preserve `react-signature-canvas` refs. `NdaChat` component manages conversation state and applies `field_updates` directly to form state. `ChatInput` restores focus via `useEffect` on the `disabled` prop transition.
- **PDF**: `html-to-image` replaces `html2canvas` (fixes `lab()` CSS color parse error). Two separate refs (`previewRef`, `standardTermsRef`) in `NdaPreview` allow forced page breaks between cover page and standard terms. 36pt margins.
- **Auth**: Logout button clears `localStorage` and redirects to `/login/`.
- **Tests**: `backend/test_chat.py` (12 tests); `frontend/__tests__/ChatInput.test.tsx` (5 tests); Jest multi-project config (node/jsdom).
