# ADV AI Concierge v0.9 — standalone sales chatbot

This is a **development build**, not a production-hardened public service. The existing ADV-WAVE website and all SIG systems are not touched.

## What works
- `public/widget.js`: embeddable JavaScript widget (Shadow DOM). No browser API secrets.
- `server.mjs`: `POST /api/session`, `POST /api/chat`, `GET /health`, `GET /widget.js`, `GET /`.
- Local mock mode (`DEMO_MODE=true`) works without any API key.
- In real mode, the backend calls OpenAI Responses API with its server-side key.
- Conversation history uses an in-memory store by default; with `DATABASE_URL`, it uses the **existing dedicated ADV** Supabase Postgres database tables in the `concierge` schema.
- Knowledge is chosen from `knowledge.json` (published items only). The microCMS sync script uses the content API and **never includes a draftKey**. It retains manually curated website entries and removes non-published microCMS entries on next sync.

## Local run

Node.js 20+ required:

```sh
cd adv-ai-concierge-v0.9
npm install
DEMO_MODE=true node server.mjs
```

Open http://127.0.0.1:3001 in the browser. Run tests with `DEMO_MODE=true npm test`.

For real AI mode set `DEMO_MODE=false`, `OPENAI_API_KEY` and `OPENAI_MODEL` **in a private server-side environment**. Do not put keys in the widget, commit secrets, or paste secrets into a chat.

## Supabase persistence

Only if you want to connect the standalone API to the ADV database, set `DATABASE_URL` to a connection string belonging to the intentionally repurposed ADV project (not any SIG project), after checking the hostname/project reference. This requires installing the npm `pg` dependency (`npm install` with network access). The dependency could not be downloaded in the current offline build environment. The four tables have already been created in the `concierge` schema of the ADV project. This code has **not** been tested against the live database.

If `DATABASE_URL` is blank, memory-mode sessions disappear on restart and do not work across multiple API instances. This is **not suitable for public Cloud Run deployment**. Keep the database server-side, disable public DB access, and do not expose the connection string.

## microCMS (optional)

Set `MICROCMS_SERVICE`, `MICROCMS_API_KEY`, `MICROCMS_ENDPOINT`, the actual content field names (`MICROCMS_TITLE_FIELD`, `MICROCMS_BODY_FIELD`), and `MICROCMS_PUBLIC_URL_TEMPLATE` containing `{id}`. The example URL is **not verified**; change it to your real public content URL format.

```sh
npm run sync:microcms
```

The sync runs **only when invoked**. After sync, restart the API to reload knowledge. No microCMS API call is needed to operate with manually curated `knowledge.json`.

## Website embed (after separately deploying API)

```html
<script src="https://YOUR-API-HOST/widget.js" data-api-base="https://YOUR-API-HOST" defer></script>
```

`YOUR-API-HOST` must be a real HTTPS deployment URL and `ALLOWED_ORIGIN` must equal the browser origin of the site that embeds the widget. The widget `src` and the API base must be controlled by ADV-WAVE. Do not deploy until the app has server-side rate limits suitable for multiple instances, privacy/retention policy, abuse controls, and access review.

## Known limitations / next steps

1. `DATABASE_URL` with Supabase has not been smoke-tested and real OpenAI calls have not been made.
2. Current limiter is per instance and in-memory; replace with shared quota/rate limiting before public release.
3. Knowledge search is simple keyword matching, not vector search. The example entry is a placeholder; real ADV-WAVE pages have not yet been imported into this build.
4. Need consent and a privacy notice before saving live visitor conversations; lead submission and Google Chat delivery are **not implemented** yet.
5. Authentication and project-specific access must be reviewed prior to deploying Cloud Run.
6. A full microCMS sync and actual public URLs require the real microCMS schema.
7. `wave_manage@adv-wave.co.jp` is the intended operational account, but no account sign-in or API key registration was performed by this package.

## Safety isolation

This package only targets a separately configured `DATABASE_URL`; it does not discover or connect to any Supabase project by itself. It has no dependency on SIG, and no existing website or cloud resource is modified by the code-generation process.

## v0.9 Cloud Run準備

`Dockerfile`、`.dockerignore`、`CLOUD_RUN_SETUP.md` を追加。productionでは `DEMO_MODE=true`、APIキーやDB設定の欠落、HTTPS以外のCORSオリジンを起動時に拒否する。**Cloud Run実配備済みではない**。公開前の運用・セキュリティ要件は `CLOUD_RUN_SETUP.md` を参照。

## v1.0: Optional lead intake (development build)

- The widget now includes an expandable contact form with name, email, optional company, inquiry summary and **explicit consent**.
- `POST /api/lead` validates inputs, requires the session token and stores the lead in `concierge.ai_leads` when Postgres is connected. In memory mode it is only temporary.
- Optional `GOOGLE_CHAT_WEBHOOK_URL` posts a **notification with a lead ID only**, never the contact's identity or conversation. Notifications are best-effort; if they fail, leads remain in the database.
- Supply `data-privacy-url="https://YOUR-REAL-PRIVACY-PAGE"` on the embedded script. The default destination is the site's home page and **is not a substitute for a privacy notice**.

Example:

```html
<script src="https://YOUR-API-HOST/widget.js" data-api-base="https://YOUR-API-HOST" data-privacy-url="https://YOUR-REAL-PRIVACY-PAGE" defer></script>
```

**Important: NOT ready to expose publicly yet.** The in-process rate limiter and session-based lead duplicate guard are not distributed; Cloud Run scale-out requires centralized anti-abuse limits and durable per-session lead uniqueness. Also implement operational retention/deletion, visitor privacy disclosures, database connection/TLS verification, cookie/browser restrictions as appropriate, and live API tests. Origin headers and session tokens do not protect a public API from automated abuse by themselves. `/health` reports a mode and must not be treated as proof of an AI/DB end-to-end working service.

## v1.1 — additional hardening

- The dedicated ADV database project now has a unique index on `concierge.ai_leads(session_id)`; this prevents duplicate lead submissions across multiple API instances. The code uses `ON CONFLICT DO NOTHING`.
- Memory-mode lead storage also prevents duplicates.
- JSON-only API payloads for chat and lead submission; production rejects requests without the configured browser Origin.
- The widget accepts only hex CSS colors via `data-accent`.

### Still blocking public launch

- Shared (distributed) rate limiting and spend protection are not implemented. Per-process in-memory IP limiting is insufficient for Cloud Run horizontal scaling.
- Real OpenAI, microCMS, and Postgres connectivity tests have not run.
- Verified privacy notice, retention/deletion procedure, and production configuration are still required.
- Do not expose unauthenticated Cloud Run service to the public until those are addressed.

## v1.2 — shared API quota

This version adds `lib/quota.mjs` and a private `concierge.ai_quota` table to make API request quotas shared between Cloud Run instances (unlike the original in-memory limits). This is **not** an edge WAF or a guarantee of a spending ceiling: OpenAI billing also depends on tokens, and an attacker can still consume requests up to the configured daily quota. Production requires `QUOTA_HASH_SECRET` (at least 32 random characters, Secret Manager) and a dedicated `DATABASE_URL` for the ADV project. The default shared quotas are 8 calls/min per session/address key, 120 calls/min globally, and 500 calls/day globally, with a smaller `DAILY_API_REQUEST_LIMIT` configurable. The daily cap is for API requests, not currency. Session creation uses the server connection address; reverse proxies may cause several visitors to share a limit. Check your trusted ingress before relying on client-IP rate limits.

Database table `concierge.ai_quota` was created **only** in Supabase project `iaphrvoktlelquoqsbjn` and verified with RLS enabled and no `anon`/`authenticated` grants. See `sql/001_rate_limits.sql`. The quota table needs periodic retention cleanup: delete counters older than 2 days from an authenticated maintenance job (not configured yet).

**Not deployed / not verified:** Real OpenAI communication, Supabase client connection from the Node app, Cloud Run deployment, microCMS API content mapping, security penetration tests, and privacy-policy signoff. No other Supabase projects, SIG repositories, or existing ADV-WAVE site files were touched.
