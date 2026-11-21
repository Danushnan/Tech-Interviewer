# Prepwise

A calmer place for students and graduates to prepare for technology interviews. Built with **React + TypeScript, Tailwind CSS, FastAPI, MySQL, parameterised raw SQL, and OpenAI / OpenRouter**.

## Run locally

Python 3.12+ and Node.js 22+ are required. From the repository root:

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r backend/requirements.txt
Copy-Item .env.example .env
.venv\Scripts\python -m uvicorn backend.app.main:app --reload
```

In a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open [Prepwise locally](http://127.0.0.1:5173). The dev server proxies `/api` to FastAPI on port 8000. [Interactive API documentation](http://127.0.0.1:8000/docs) is available while the backend runs.

The default SQLite database makes the application runnable without a separate service. It uses the same parameterised repository as MySQL. With no backend, the web interface offers an explicitly labelled browser demo using local storage. API errors during a connected session are reported rather than silently switching databases.

## Run the MySQL stack

Install and start Docker Desktop. Copy `.env.example` to `.env` and set `MYSQL_ROOT_PASSWORD` and `MYSQL_PASSWORD` to your own alphanumeric passwords. Then run:

```powershell
docker compose up --build
```

Open [the Docker application](http://localhost:8080). Nginx serves React and proxies requests to FastAPI; MySQL 8.4 stores workspaces in a persistent volume. Database and API ports are not exposed to the host. For a separately managed MySQL database, set `DATABASE_URL=mysql://user:password@host:3306/prepwise` and URL-encode special characters in credentials.

## What works

- Three-step onboarding covers the interview goal, availability, confidence and learning priorities. Optional PDF, DOCX or TXT extraction lets the student review and edit CV / job description text before saving. Uploads are limited to 5 MB and originals are not retained.
- A five-question starting assessment spans communication, behavioural examples, problem solving, data structures and algorithms. It can be completed at the student's pace.
- A deterministic scheduler fits practice and reflection into the daily time budget before the interview, over any deadline from today to 180 days away. Stretch questions are introduced later for less confident students.
- The dashboard displays actual task completion, practice streak, minutes invested and the interview countdown. The plan has a weekly calendar and a three-point explanation of its priorities.
- The question bank supports search, category / difficulty filters, bookmarks and answer frameworks. Frameworks are revealed after attempting a question.
- Practice includes text drafts, an optional timer that can be paused, read-aloud, hints, contextual follow-ups, feedback and a saved journal.
- Configured AI coaching evaluates answers against a validated rubric, quotes evidence when available and generates questions from the student's verified context. It adapts future tasks while preserving today's tasks and completed work.
- Students can add their own confidence assessment and change the plan's priorities without overwriting observed evidence.
- A profile reset deletes saved CV text, answers, progress and the plan from the active workspace.

## Enable AI coaching

Keep all credentials in the root `.env`, never the frontend. Set **one** provider:

```dotenv
LLM_PROVIDER=openrouter
LLM_API_KEY=your-provider-key
LLM_MODEL=openrouter/free
```

Or set `LLM_PROVIDER=openai`, an OpenAI key and a currently supported chat model in `LLM_MODEL`. Restart FastAPI, then enable text sharing in the profile's final step. Students explicitly request tailored questions from the question bank. Data is sent to the configured provider only on answer submission or a tailored-question request.

The integration uses the providers' OpenAI-compatible Chat Completions endpoint with JSON responses, validated by Pydantic. [OpenRouter's free router](https://openrouter.ai/collections/free-models/) selects from available free models; model availability, limits and provider data policies can change. See [OpenRouter's developer documentation](https://openrouter.ai/developers) and [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat).

`LLM_PROVIDER=demo` is the default. Offline feedback is a **writing checklist**, not a simulated AI assessment: it does not claim to evaluate technical correctness and never updates skill estimates. Provider failures preserve the answer in the editor and return an actionable error.

## Optional local speech

```powershell
.venv\Scripts\python -m pip install faster-whisper
```

Set `ENABLE_WHISPER=true` and optionally `WHISPER_MODEL=base`, then restart the backend. First use downloads the model weights. The browser requests microphone access only when the student starts recording. Audio is uploaded to this backend for local transcription, deleted after processing and never sent to the LLM. The student reviews and edits the transcript before submitting it. Filler counts and pauses are estimates; neither affects coaching scores. Whisper transcription is an optional enhancement and is not included in the default Docker image.

## Verification and delivery

```powershell
.venv\Scripts\python -m pytest backend/tests -q
cd frontend
npm run build
```

Tests exercise deadline / daily-budget constraints, beginner pacing, preservation of completed tasks, onboarding, persistence, workspace isolation, follow-ups, extraction limits, malformed files, bookmarks, confidence reviews, reset, provider errors and AI-driven adaptation. Set `TEST_MYSQL_URL` to also exercise the MySQL repository.

GitHub Actions builds the frontend and runs backend tests against SQLite plus a MySQL service. On successful pushes to `main`, it publishes SHA-tagged API and web container images to GHCR. Application deployment to a chosen server is not configured; the images are deployable with the supplied Compose topology. The Sites deployment is a private, static **browser demo**; it does not host Python or MySQL.

## Architecture and boundaries

`frontend/src` contains the web app and offline demo. `backend/app` contains the API, SQL repository, question catalog, scheduler and coaching boundary. Workspace state is stored as JSON in a MySQL `LONGTEXT` column (SQLite `TEXT` in development), with row-locked mutations and bound SQL parameters. This intentionally small prototype repository can later be normalised into profiles, tasks and session tables.

Each browser receives an opaque, HttpOnly, SameSite session cookie for a separate workspace. This is a local MVP, with no account login, cross-device recovery or public production identity layer. Before deploying the full backend to the public internet, add account authentication, HTTPS-only cookies, request limits, retention controls and database backups. Stored CV text and answers are not encrypted at the application layer. User-provided documents are untrusted input in AI prompts; returned output is validated and rendered as text.

AI observations are provisional coaching feedback, not a validated measure of employability. General questions do not predict a company's interview. Technical answers are not executed. Prompt guardrails reduce but cannot eliminate model mistakes, so frameworks encourage reasoning, verification and reflection.
