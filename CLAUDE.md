# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation (PL-6) supports all 11 catalog document types via AI chat. Users land on a document selection page and are guided through creation. Real authentication has not been built yet.

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

### PL-6 — Expand to all legal document types (PR open, 2026-04-08)

- **Document selection** (`/`): Landing page with a card grid of all 11 document types + an AI chat (`POST /api/select-document`) that recommends the right document or explains when an unsupported type (e.g. "lease") is requested and offers the closest match. Selecting a document stores the choice in `localStorage` and navigates to `/create/`.
- **Backend** (`backend/document_configs.py`): 10 `DocumentConfig` dataclasses (ai-addendum, baa, csa, design-partner, dpa, partnership, pilot, psa, sla, software-license) each with ordered `FieldQuestion` list, `field_to_placeholder` mapping, and a dynamically created Pydantic model via `pydantic.create_model`. `POST /api/chat` dispatches to MNDA (existing) or generic (config-driven) path based on `document_type` param. `next_question_for_doc()` drives flow control for all non-MNDA types.
- **Template filling** (`frontend/app/utils/templateUtils.ts`): `fillGenericTemplate()` handles all 5 placeholder span classes (`coverpage_link`, `keyterms_link`, `orderform_link`, `businessterms_link`, `sow_link`). `buildGenericCoverPage()` generates a cover page with party info, key terms section, and signature blocks for any document type.
- **Frontend**: `GenericCreatorClient` + `GenericPreview` for chat-only flow (no Form tab). MNDA retains Chat + Form tabs. `ChatSignatures` accepts configurable party labels. All creators have a Back button linking to the selector.
- **Routing**: `/create/` reads `prelegal_selected_doc` from `localStorage` and renders the appropriate creator.
- **Templates**: All 11 `.md` template files copied to `frontend/public/templates/`.
- **Tests**: `backend/test_selection.py` (13 tests); `frontend/__tests__/genericTemplateUtils.test.ts` (20 tests). Total: 25 backend + 58 frontend tests.

### PL-7 — Support multiple users (PR open, 2026-04-10)

- **Real auth** (`backend/auth.py`): `POST /api/signup` and `POST /api/login` with bcrypt password hashing. `get_current_user` FastAPI dependency uses `HTTPBearer` + `PyJWT` to validate tokens on protected routes. JWT stored in `localStorage` as `prelegal_token` (7-day expiry). `/api/chat` and `/api/select-document` now protected via `dependencies=[Depends(get_current_user)]` at `include_router` time — no changes to `chat.py`/`selection.py`.
- **Document history** (`backend/history.py`): `POST /api/documents` saves a document on PDF download (signatures stripped before storage); `GET /api/documents` lists user's documents (no form_data in list); `GET /api/documents/{id}` returns full record including form_data. `documents` table added to `database.py`.
- **DB migration**: `init_db()` adds `password_hash` column to `users` via `ALTER TABLE` guard for existing deployments; `documents` table created fresh.
- **Frontend auth** (`frontend/app/utils/authUtils.ts`): `setToken`, `clearAuth`, `getAuthHeaders`, `isAuthenticated` (client-side JWT expiry check). All API calls use `getAuthHeaders()`. 401 responses in any API call clear auth and redirect to `/login/`.
- **New routes**: `/signup/` (separate from `/login/`), `/history/`. Both login and signup redirect already-authenticated users to `/`.
- **Document history UI** (`frontend/app/history/page.tsx`): Lists documents by name + date. "Reopen" button fetches form_data via `GET /api/documents/{id}`, stores it as `prelegal_resume_data` in `localStorage`, navigates to `/create/`. Creators accept optional `initialFormData` prop for pre-population; key is cleared immediately after reading (one-shot pattern).
- **Disclaimer modal** (`frontend/app/components/DisclaimerModal.tsx`): One-time per session (sessionStorage flag). Mounted globally via `ClientProviders` in `layout.tsx`.
- **Tests**: `backend/test_auth.py` (9 tests), `backend/test_history.py` (7 tests); `frontend/__tests__/authUtils.test.ts` (8 tests), `__tests__/DisclaimerModal.test.tsx` (4 tests), `__tests__/historyApi.test.ts` (4 tests). Total: 41 backend + 75 frontend tests.
