# JARVIS — Virtual AI Assistant by AI Evolution Labs

<p align="center">
  <a href="https://aievolutionlabs.io/"><strong>AI Evolution Labs</strong></a> · voice-first desktop AI · cinematic HUD · local BYOK setup
</p>

<p align="center">
  <strong>A local, agent-ready assistant that can listen, speak, remember, plan, research, code, and automate your daily operating system.</strong>
</p>

<p align="center">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-WebSocket-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Vite-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-Orb-000000?style=for-the-badge&logo=threedotjs&logoColor=white" />
</p>

> “Will do, sir.”

JARVIS is a local virtual assistant inspired by a cinematic mission-control cockpit: a reactive Three.js orb, live HUD panels, voice input, TTS output, persistent memory, screen context, task planning, skill packs, and developer automation. The project is built for **bring-your-own-key** usage and branded for **[AI Evolution Labs](https://aievolutionlabs.io/)**.

---

## What JARVIS can do

Use voice or the command bar. Examples:

| Area | Example command | What happens |
| --- | --- | --- |
| Executive brief | “Summarize today’s calendar and unread email priorities.” | Builds a concise daily brief from calendar/mail integrations where available. |
| Screen help | “Look at my screen and tell me what matters.” | Uses screen context to explain the current state and suggest next action. |
| Coding | “Review this project and suggest one high-impact improvement.” | Scans a codebase, reasons about architecture, and can dispatch Claude Code workflows. |
| Research | “Create a source-aware research brief about this market.” | Uses browser/research tools and optional Perplexity configuration for grounded summaries. |
| Planning | “Turn this idea into milestones and next tasks.” | Produces structured plans and can track tasks/memory locally. |
| Writing | “Draft a polished client email from these notes.” | Converts rough notes into professional output. |
| Files | “Use this dropped CSV as context and summarize anomalies.” | Dropped text/code/JSON/Markdown/CSV files become context. |
| Personal ops | “What should I focus on next?” | Combines tasks, memory, notes, and schedule context. |
| Voice studio | “Answer out loud in the JARVIS voice.” | Uses Fish Audio by default and keeps ElevenLabs-ready settings available. |
| Automation | “Create a landing page from this prompt template.” | Uses bundled prompt templates and developer-agent flow. |

---

## Visual UI

- **Reactive orb:** Three.js center visualization responds to assistant state and speech.
- **MARK XL-style HUD:** left/right glass panels show live systems, artifacts, rapid actions, logs, and guarded actions.
- **Polished onboarding:** guided setup for keys, skills, tools, profile, launch examples, and desktop shortcut status.
- **Provider marketplace:** Anthropic, Fish Audio, ElevenLabs, DeepSeek, OpenAI, Perplexity, Google AI, Groq, and Hermes-compatible configuration cards.
- **Skills browser:** searchable categories with toggles so JARVIS knows which capabilities should be active.

---

## Installation and onboarding flow

### Windows PowerShell — recommended for first install

```powershell
git clone https://github.com/your-org/jarvis.git
cd jarvis
.\start.ps1
```

The launcher will:

1. Create `.env` from `.env.example` if needed.
2. Create or refresh a desktop shortcut named **JARVIS by AI Evolution Labs**.
3. Install Python dependencies and start the backend.
4. Install frontend dependencies and start Vite.
5. Print the local app URL: <http://localhost:5173>.

> If Windows blocks scripts, run PowerShell as your user and execute:
>
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
> ```

### macOS / Linux

```bash
git clone https://github.com/your-org/jarvis.git
cd jarvis
cp .env.example .env
python -m pip install -r requirements.txt
cd frontend && npm install && cd ..
python server.py
```

In a second terminal:

```bash
cd frontend
npm run dev
```

Open Chrome at <http://localhost:5173>. The onboarding panel opens automatically when the main Anthropic key is missing.

---

## Onboarding checklist

| Step | UI section | Goal |
| --- | --- | --- |
| 1 | Keys | Add the required Anthropic key and recommended voice key. |
| 2 | Skills | Enable the capabilities JARVIS should keep ready. |
| 3 | Tools | Connect MCP tools for email, docs, CRM, databases, or team systems. |
| 4 | Profile | Save your name, honorific, and calendar preferences. |
| 5 | Launch | Try example commands and confirm the desktop shortcut path. |

You can reopen setup/settings anytime with the **gear/menu** or by pressing `,`.

---

## Supported API connectors

| Provider | Environment key | Purpose | Required? |
| --- | --- | --- | --- |
| Anthropic Claude | `ANTHROPIC_API_KEY` | Primary reasoning and conversation brain | Yes |
| Fish Audio | `FISH_API_KEY` | Default JARVIS-style TTS | Recommended |
| Fish Voice | `FISH_VOICE_ID` | Voice selection for Fish Audio | Recommended |
| ElevenLabs | `ELEVENLABS_API_KEY` | Optional premium/multilingual voices | No |
| DeepSeek | `DEEPSEEK_API_KEY` | Optional coding/reasoning provider | No |
| OpenAI | `OPENAI_API_KEY` | Optional multimodal/realtime/tool model provider | No |
| Perplexity | `PERPLEXITY_API_KEY` | Optional source-grounded web research | No |
| Google AI | `GOOGLE_API_KEY` | Optional Gemini/Google ecosystem provider | No |
| Groq | `GROQ_API_KEY` | Optional ultra-fast inference | No |
| Hermes | `HERMES_API_KEY` | Optional private Hermes-compatible agent backend | No |

Keys are stored locally in `.env`. Never commit a real `.env` file.

---

## Built-in and planned skill packs

| Skill pack | Status | What it enables |
| --- | --- | --- |
| Core Productivity | Bundled | Calendar, Mail, Notes, tasks, memory, and day planning |
| Developer Agent | Bundled | Project scanning, Claude Code dispatch, terminal automation, prompt templates |
| Browser Research | Bundled | Web browsing, research briefs, and source-aware summaries |
| Screen Context | Bundled | Active window awareness and screenshot-based context |
| Voice Studio | Optional | Fish Audio now; ElevenLabs-ready voice provider expansion |
| Task Skill Downloader | Planned | Task-specific skills installed on demand for agent workflows |

The skill catalog is exposed through `/api/skills` and rendered in onboarding/settings, so future installers can attach to the same metadata.

---

## Requirements

- Python 3.11+
- Node.js 18+
- Google Chrome for the Web Speech API
- Anthropic API key for the main assistant brain
- Optional voice/research/model keys listed above
- macOS for Apple Calendar/Mail/Notes automation; Windows/Linux can run the web app and non-Apple capabilities with graceful unavailable status
- Claude Code CLI for developer-agent workflows

---

## Manual configuration

```env
ANTHROPIC_API_KEY=your-anthropic-api-key-here
FISH_API_KEY=your-fish-audio-api-key-here
FISH_VOICE_ID=612b878b113047d9a770c069c8b4fdfe
ELEVENLABS_API_KEY=
DEEPSEEK_API_KEY=
OPENAI_API_KEY=
PERPLEXITY_API_KEY=
GOOGLE_API_KEY=
GROQ_API_KEY=
HERMES_API_KEY=
USER_NAME=Tony
HONORIFIC=sir
CALENDAR_ACCOUNTS=auto
```

---

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` | Focus the command bar |
| `M` | Mute / unmute microphone |
| `Esc` | Stop speaking or close panels |
| `L` | Clear activity log |
| `,` | Open settings and onboarding |
| `?` | Toggle shortcuts overlay |

---

## Architecture

```text
Microphone → Web Speech API → WebSocket → FastAPI → LLM provider → TTS provider → WebSocket → Speaker
                                              │
                                              ├─ Skill catalog + onboarding/settings
                                              ├─ Claude Code / developer agent dispatch
                                              ├─ Calendar / Mail / Notes / Tasks / Memory
                                              └─ Browser, screen context, planning, and templates
```

| Layer | Technology |
| --- | --- |
| Backend | FastAPI + Python |
| Frontend | Vite + TypeScript + Three.js |
| Transport | WebSocket JSON messages + binary audio |
| LLM | Anthropic primary, optional provider keys ready for expansion |
| TTS | Fish Audio primary, ElevenLabs-ready configuration |
| Local state | SQLite memory/tasks/notes |
| OS bridge | AppleScript on macOS, graceful platform status elsewhere |

---

## Key files

| File | Purpose |
| --- | --- |
| `server.py` | Main FastAPI/WebSocket server and settings endpoints |
| `integrations.py` | API provider and skill-pack catalog |
| `frontend/src/settings.ts` | Onboarding/settings UI logic |
| `frontend/src/style.css` | Cinematic HUD, onboarding, provider, and skill styling |
| `frontend/src/orb.ts` | Three.js orb visualization |
| `.env.example` | Complete BYOK configuration template |
| `start.ps1` | Windows launcher and desktop shortcut installer |
| `templates/prompts/` | Agent prompt templates |

---

## Development checks

```bash
python -m compileall server.py integrations.py onboarding.py
cd frontend && npm run build
python -m pytest -q
```

---

## Security notes

- Keep real secrets in `.env` only.
- The settings API accepts only known environment keys from the provider catalog and personalization fields.
- Mail integration is read-only by design.
- Optional providers are configuration-ready; execution routing should be implemented per provider before enabling autonomous use.

---

## Roadmap

- Provider execution router for DeepSeek, OpenAI, Google, Groq, Perplexity, and Hermes.
- Downloadable skill marketplace with task-triggered installation.
- ElevenLabs runtime TTS selection in addition to saved configuration.
- Windows-native desktop integrations to complement the macOS AppleScript bridge.
- Screenshot/demo media for the GitHub README.

---

Built by **[AI Evolution Labs](https://aievolutionlabs.io/)** for people who want a local assistant that can talk, remember, plan, build, and evolve.
