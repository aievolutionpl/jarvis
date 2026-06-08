# JARVIS — Virtual AI Assistant by AI Evolution Labs

<p align="center">
  <img alt="JARVIS — premium voice assistant hero" src="jarvis-premium-clear-voice-assistant.svg" width="100%" />
</p>

<p align="center">
  <strong>Voice-first, agent-ready desktop assistant with a cinematic HUD, BYOK onboarding, memory, skills, and developer automation.</strong>
</p>

<p align="center">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-WebSocket-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Vite-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-Orb-000000?style=for-the-badge&logo=threedotjs&logoColor=white" />
</p>

> “Will do, sir.”

JARVIS is a local virtual assistant inspired by the cinematic Stark-style cockpit: a reactive orb, mission-control HUD, voice loop, persistent memory, desktop awareness, task planning, and Claude Code orchestration. The project is designed for **bring-your-own-key** operation and now includes an extensible integration catalog for Anthropic, Fish Audio, ElevenLabs, DeepSeek, OpenAI, Perplexity, Google AI, Groq, and Hermes-compatible private agent backends.

---

## Highlights

- **Beautiful onboarding** — first launch opens a guided setup for API keys, skill packs, profile, and launch readiness.
- **Multi-provider API catalog** — save core and optional keys from the settings panel; no manual `.env` editing required.
- **Voice-first assistant** — Web Speech API transcription, LLM response generation, and TTS playback.
- **Cinematic visualization** — Three.js audio-reactive orb plus MARK XL-inspired HUD panels.
- **Agent skills** — bundled productivity, developer, browser research, screen context, and voice skill packs with a path for task-specific downloadable skills.
- **Developer automation** — can spawn Claude Code sessions, scan projects, open terminals, and use prompt templates.
- **Personal operating layer** — calendar, mail, notes, tasks, memory, planning, and screen context.
- **Windows-friendly setup path** — `start.ps1`, cross-platform provider/status metadata, and graceful macOS-only capability reporting.

---

## Built-in and planned skill packs

| Skill pack | Status | What it enables |
| --- | --- | --- |
| Core Productivity | Bundled | Calendar, Mail, Notes, tasks, memory, and day planning |
| Developer Agent | Bundled | Project scanning, Claude Code dispatch, terminal automation, prompt templates |
| Browser Research | Bundled | Web browsing, research briefs, and source-aware summaries |
| Screen Context | Bundled | Active window awareness and screenshot-based context |
| Voice Studio | Optional | Fish Audio now, ElevenLabs-ready voice provider expansion |
| Task Skill Downloader | Planned | Task-specific skills installed on demand for agent workflows |

The skill catalog is exposed through `/api/skills` and rendered in the onboarding/settings UI, so future installers can attach directly to the same metadata.

---

## Supported API connectors

| Provider | Environment key | Purpose | Required? |
| --- | --- | --- | --- |
| Anthropic Claude | `ANTHROPIC_API_KEY` | Primary reasoning and conversation brain | Yes |
| Fish Audio | `FISH_API_KEY` | Default JARVIS-style TTS | Recommended |
| ElevenLabs | `ELEVENLABS_API_KEY` | Optional premium/multilingual voices | No |
| DeepSeek | `DEEPSEEK_API_KEY` | Optional coding/reasoning provider | No |
| OpenAI | `OPENAI_API_KEY` | Optional multimodal/realtime/tool model provider | No |
| Perplexity | `PERPLEXITY_API_KEY` | Optional source-grounded web research | No |
| Google AI | `GOOGLE_API_KEY` | Optional Gemini/Google ecosystem provider | No |
| Groq | `GROQ_API_KEY` | Optional ultra-fast inference | No |
| Hermes | `HERMES_API_KEY` | Optional private Hermes-compatible agent backend | No |
| Ollama | _none_ (`OLLAMA_BASE_URL`) | Local models (Llama, Gemma 3, Qwen…) — fully offline, no key | No |

> Keys are stored locally in `.env`. Do not commit your real `.env` file.

### Switching the brain and the voice

JARVIS now ships a runtime **provider router**. Open **Settings → Engine** to pick:

- **Active Brain** — the conversational model. `anthropic` (default) plus `openai`,
  `google` (Gemini), `deepseek`, `groq`, and `ollama` for local models. Selections
  persist to `.env` (`JARVIS_LLM_PROVIDER`, `JARVIS_LLM_MODEL_*`) and take effect
  without a restart. Claude still drives tool/action calls and intent classification,
  so other brains chat well but may be weaker at running tools.
- **Active Voice** — `fish_audio` (default) or `elevenlabs` (`JARVIS_TTS_PROVIDER`).

For local models, run `ollama serve`, pull a model (`ollama pull llama3.2` or
`ollama pull gemma3`), and select **Ollama (local)** — the model list is fetched
live from your Ollama server. (Note: Google's open model line is **Gemma 3**; the
hosted **Gemini** API is available via the Google AI connector.)

---

## Requirements

- Python 3.11+
- Node.js 18+
- Google Chrome for the Web Speech API
- Anthropic API key for the main assistant brain
- Optional voice/research/model keys listed above
- macOS for Apple Calendar/Mail/Notes automation; Windows/Linux can run the web app and non-Apple capabilities, with Apple integrations reported as unavailable
- Claude Code CLI for developer-agent workflows

---

## Quick start

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

Open Chrome at <http://localhost:5173>. The onboarding panel will guide you through keys and profile setup.

### Windows PowerShell

```powershell
git clone https://github.com/your-org/jarvis.git
cd jarvis
.\start.ps1
```

Then open Chrome at <http://localhost:5173>. The launcher creates `.env` from `.env.example` when needed and starts backend/frontend terminals.

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

You can also open settings with `,` and add keys from the UI.

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
                                              ├─ Skill catalog + settings onboarding
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
| `start.ps1` | Windows-friendly launcher |
| `templates/prompts/` | Agent prompt templates |

---

## Development checks

```bash
python -m compileall server.py integrations.py
cd frontend && npm run build
```

---

## Security notes

- Keep real secrets in `.env` only.
- The settings API accepts only known environment keys from the provider catalog and personalization fields.
- Mail integration is read-only by design.
- The conversational brain is routed live to the selected provider; Claude remains the orchestrator for tool/action calls when configured.

---

## Roadmap

- ~~Provider execution router for DeepSeek, OpenAI, Google, Groq, and Ollama.~~ ✅ Shipped (Perplexity/Hermes still config-only).
- ~~ElevenLabs runtime TTS selection in addition to saved configuration.~~ ✅ Shipped.
- Cross-provider tool-use parity so non-Claude brains can drive `[ACTION:X]` reliably.
- Downloadable skill marketplace with task-triggered installation.
- Windows-native desktop integrations to complement the macOS AppleScript bridge.
- ~~Hero artwork for the GitHub README.~~ ✅ Shipped — additional in-app screenshots/demo clips still planned.

---

Built by **AI Evolution Labs** for people who want a local assistant that can talk, remember, plan, build, and evolve.
