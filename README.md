# WABuddy

A Python and TypeScript application for linked WhatsApp accounts, prompt-driven workflows, and a live orders spreadsheet.

## Features

- Animated 3D phone with genuine WhatsApp Linked Devices pairing.
- Saved account sessions, account switching, and standard/business interface modes.
- Connected messaging, attachments, synchronized conversation history, and message receipts.
- Prompt-based order analysis, owner-approved knowledge, local suspicious-message review, and scheduled monitoring.
- Parallel text/image analysis with independent verification before results are published.
- An automatically updated orders spreadsheet with source evidence and optional Excel export.
- Account-bound MCP tools and configurable local Codex or compatible text/vision API execution.

Some business-profile editors are interface previews. Native business catalog, registered business name, and operating-hours editing are not supported by the current connector. Audio transcription is not implemented. Analysis covers synchronized history rather than a guaranteed complete phone archive. Suspicious-message workflows use a local review queue; they do not automatically block or report accounts.

## Run locally

Requirements: Windows, PowerShell 7, Python 3.12 or newer, and Node.js 22.12 or newer.

```powershell
git clone https://github.com/lownamlee/WABuddy.git
cd WABuddy
./setup.ps1
./start-wabuddy.ps1
```

Open `http://127.0.0.1:8787`. In WhatsApp, choose **Linked devices → Link a device**, then scan the pairing QR. Each installation starts without linked accounts or AI credentials.

The launcher starts a local watchdog to recover an exited server. To stop the app and its automatic recovery:

```powershell
./stop-wabuddy.ps1
```

Stopping preserves linked-device sessions; explicit logout unlinks the account. Hosting and local AI execution require the computer to remain awake and connected.

## AI workflows

Configure the execution engine in Settings. Use your own compatible text/vision API credentials, or an installed Codex CLI with your own sign-in. Image analysis requires a vision-capable model. Model availability and provider quotas apply separately from application usage limits.

In Chat, `orders` builds the live spreadsheet and monitors for changes. `learn` reviews questions and owner knowledge; `phishing` reviews suspicious content; `stop` pauses account monitoring. A request can be scoped using `orders for <customer name or international phone number>`. Longer prompts use the AI coordinator. Commands route tasks deterministically; order extraction and verification still use real model inference.

When both text and image order sources are present, independent analysts work in parallel before a verifier checks the combined output. Existing verified results remain available while new results are processed. Remembered answers and draft replies are not automatically sent by these commands.

## MCP

With the local application running, configure an MCP client to launch:

```powershell
./.venv/Scripts/python.exe -m wabuddy.live_mcp --account default
```

Set its working directory to this repository. Each server is bound to its selected saved account. Read `get_capabilities`, `read_whatsapp`, and `get_execution_engine` before acting. `submit_goal`, `get_run`, and `get_spreadsheet` provide the workflow interface. Use stable request IDs for mutations and do not claim jobs already handled by configured automatic workers.

## Development

```powershell
# Backend
./.venv/Scripts/python.exe -m wabuddy

# Frontend, in a second terminal
npm run dev

# Validation
npm run build
npm test
./.venv/Scripts/python.exe -m pytest -q
```

Backend code lives in `backend/wabuddy`; frontend code and bundled assets live in `frontend/src`. Tests use fixtures and do not require personal account data. The production build is generated in `frontend/dist` and served by the Python application.

## Data and deployment

Device sessions, account data, model configuration, and logs belong in private `.local` storage. They are excluded from this repository and must not be served as static files. Do not commit pairing payloads, API keys, OAuth credentials, exported chats, or account screenshots. Internal planning documents, presentation scripts, and rehearsal artifacts are intentionally absent.

The service binds to loopback by default. The application's existing public-origin checks reference `wabuddy.my`; a different deployment must explicitly configure its own allowed origin and reverse proxy. No tunnel credentials or machine-specific deployment configuration are included.

This application uses the unofficial [Neonize](https://github.com/krypton-byte/neonize) WhatsApp connector and is not affiliated with WhatsApp or Meta. Bundled asset and component credits are retained in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and their license files.
