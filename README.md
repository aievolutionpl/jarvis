# JARVIS — Virtual AI Assistant by AI Evolution Labs

<p align="center">
  <img alt="JARVIS — premium voice assistant hero" src="jarvis-premium-clear-voice-assistant.svg" width="100%" />
</p>

<p align="center">
  <strong>Voice-first, agent-ready desktop assistant with a cinematic HUD, BYOK model connectors, persistent memory, installable skills, and developer automation.</strong>
</p>

<p align="center">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-WebSocket-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Vite-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-Orb-000000?style=for-the-badge&logo=threedotjs&logoColor=white" />
</p>

> “Will do, sir.”

---

## English overview

JARVIS is a local, voice-first operating layer for your computer. It combines a cinematic browser HUD, WebSocket voice loop, configurable LLM providers, text-to-speech, persistent SQLite memory, task and note management, a bundled skill catalog, screen/browser awareness, and Claude Code project orchestration.

It is designed as **bring your own key** software: keys stay in your local `.env`, the settings panel exposes only supported connectors, and the runtime router can switch brains without restarting the server.

### What JARVIS can do

- Talk with a Stark-style assistant voice and a reactive Three.js orb.
- Remember durable facts, preferences, decisions, projects, people, tasks, and notes.
- Prioritize your day using calendar events, open tasks, and important memories.
- Search or open websites, summarize pages, and send compact cards to the Control Center.
- Read Apple Calendar/Mail/Notes on macOS and degrade gracefully on Windows/Linux.
- Launch Claude Code in a project, ask it to inspect/fix/build, and track active dispatches.
- Use installable business skills such as meeting summaries, email triage, SOP writing, invoices, proposals, support replies, SQL help, and deployment checklists.
- Run executable skills that generate local artifacts under `data/artifacts/`.

### Supported connectors

#### Required / recommended

| Provider | Environment key | Purpose | Notes |
| --- | --- | --- | --- |
| Anthropic Claude | `ANTHROPIC_API_KEY` | Recommended default reasoning brain and action planner | Required unless another LLM or Ollama is selected |
| Fish Audio | `FISH_API_KEY` | Default JARVIS-style TTS voice | Recommended for voice mode |
| Fish Voice ID | `FISH_VOICE_ID` | Fish Audio voice identity | Optional override |
| Ollama | `OLLAMA_BASE_URL` | Local/offline OpenAI-compatible models | No API key required |

#### Optional supported connectors

| Provider | Environment key | Default model / role |
| --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | GPT-5 family, default `gpt-5.2`; spoken aliases like “GPT 5-5” are normalized to the configured GPT-5 default instead of sending unsupported IDs |
| DeepSeek | `DEEPSEEK_API_KEY` | DeepSeek V4 Pro, default `deepseek-v4-pro`, with `deepseek-v4-flash` as the fast option |
| Google AI | `GOOGLE_API_KEY` | Gemini models |
| ElevenLabs | `ELEVENLABS_API_KEY` | Optional premium/multilingual voice provider |

Perplexity, Groq, and Hermes were removed from the connector catalog. Hermes is not exposed because there is no Hermes API connector in this project, and unsupported providers are intentionally absent from onboarding/settings.

### How memory and skills work

- **Memory** lives in SQLite (`data/jarvis.db`) and stores facts, preferences, projects, people, decisions, tasks, and notes. Relevant memories are injected into every LLM call as private context.
- **Skills** live in the same SQLite database and are seeded from `skills.py`. Enabled skills are injected into the system prompt as compact operating instructions.
- **Executable skills** use `[ACTION:RUN_SKILL] slug ||| {json params}` to create artifacts that can be downloaded or previewed.
- **Onboarding** asks about your name, role, goals, tools, and preferences, then recommends relevant skills automatically.

### Quick start — Windows

```powershell
git clone https://github.com/your-org/jarvis.git
cd jarvis
.\start.ps1
```

The PowerShell launcher copies `.env.example` to `.env` when needed, installs a desktop shortcut named **JARVIS by AI Evolution Labs**, installs Python/frontend dependencies, and starts backend/frontend terminals.

Open Chrome at <http://localhost:5173>. If Vite prints a different local URL, use the URL shown in the terminal.

### Quick start — macOS / Linux

```bash
git clone https://github.com/your-org/jarvis.git
cd jarvis
./start.sh
```

The shell launcher copies `.env.example` to `.env` when needed, installs a desktop shortcut (`JARVIS.command` on macOS or `jarvis.desktop` on Linux), installs dependencies, and starts the backend plus frontend dev server.

### Manual start

```bash
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

### Manual configuration

```env
ANTHROPIC_API_KEY=your-anthropic-api-key-here
FISH_API_KEY=your-fish-audio-api-key-here
FISH_VOICE_ID=612b878b113047d9a770c069c8b4fdfe
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
DEEPSEEK_API_KEY=
OPENAI_API_KEY=
GOOGLE_API_KEY=
JARVIS_LLM_PROVIDER=anthropic
JARVIS_TTS_PROVIDER=fish_audio
OLLAMA_BASE_URL=http://localhost:11434
# JARVIS_LLM_MODEL_OPENAI=gpt-5.2
# JARVIS_LLM_MODEL_DEEPSEEK=deepseek-v4-pro
USER_NAME=Tony
HONORIFIC=sir
JARVIS_UI_LANGUAGE=en
JARVIS_RESPONSE_LANGUAGE=en
```

You can also press `,` in the app and configure everything from Settings.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` | Focus command bar |
| `M` | Mute / unmute microphone |
| `Esc` | Stop speaking or close panels |
| `L` | Clear activity log |
| `,` | Open settings/onboarding |
| `?` | Toggle shortcuts overlay |

### Architecture

```text
Microphone → Web Speech API → WebSocket → FastAPI → LLM provider → TTS provider → WebSocket → Speaker
                                              │
                                              ├─ Memory / Tasks / Notes / Onboarding
                                              ├─ Enabled Skills + executable artifacts
                                              ├─ Claude Code / developer agent dispatch
                                              ├─ Calendar / Mail / Notes integrations
                                              └─ Browser, screen context, planning, and templates
```

| Layer | Technology |
| --- | --- |
| Backend | FastAPI + Python |
| Frontend | Vite + TypeScript + Three.js |
| Transport | WebSocket JSON messages + binary audio |
| LLM | Anthropic default; OpenAI, DeepSeek, Google, Ollama optional |
| TTS | Fish Audio default; ElevenLabs optional |
| Local state | SQLite memory/tasks/notes/skills |
| OS bridge | AppleScript on macOS, graceful status elsewhere |

### Development checks

```bash
python -m compileall server.py providers integrations.py memory.py skills.py
python tests/test_providers.py
cd frontend && npm run build
```

### Key files

| File | Purpose |
| --- | --- |
| `server.py` | Main FastAPI/WebSocket server, settings APIs, voice/action loop |
| `providers/config.py` | Single source of truth for LLM/TTS provider metadata |
| `providers/llm.py` | Unified completion router for Anthropic, OpenAI-compatible providers, Gemini, and Ollama |
| `integrations.py` | Onboarding/settings connector catalog |
| `memory.py` | SQLite memory, tasks, notes, FTS search, and prompt context |
| `skills.py` | Skill catalog, enable/disable logic, prompt injection, executable handlers |
| `frontend/src/settings.ts` | Onboarding/settings UI logic |
| `.env.example` | Safe BYOK configuration template |
| `start.ps1` / `start.sh` | Windows and macOS/Linux launchers with shortcut installation |
| `CLAUDE.md` | Instructions for future coding agents working in this repo |

---

## Polski opis

JARVIS to lokalny, głosowy asystent dla komputera: kinowy HUD w przeglądarce, reaktywna kula Three.js, WebSocket voice loop, wybieralne modele LLM, synteza mowy, trwała pamięć SQLite, zadania, notatki, katalog umiejętności, świadomość ekranu/przeglądarki oraz integracja z Claude Code do pracy nad projektami.

Projekt działa w modelu **bring your own key**: klucze zostają lokalnie w `.env`, ustawienia pokazują tylko wspierane connectory, a aktywny model można zmienić z panelu bez restartu serwera.

### Co JARVIS potrafi

- Rozmawiać głosem w stylu Stark/JARVIS i animować audio-reaktywną kulę.
- Zapamiętywać fakty, preferencje, decyzje, projekty, osoby, zadania i notatki.
- Planować dzień na podstawie kalendarza, otwartych zadań i ważnych wspomnień.
- Otwierać strony, robić research przez przeglądarkę i wysyłać krótkie karty do Control Center.
- Czytać Apple Calendar/Mail/Notes na macOS; na Windows/Linux pokazuje status niedostępnych integracji bez wysypywania aplikacji.
- Uruchamiać Claude Code w projekcie, prosić go o analizę/poprawki/build i śledzić aktywne dispatch’e.
- Korzystać z umiejętności biznesowych: podsumowania spotkań, triage maili, SOP, faktury, oferty, odpowiedzi supportu, SQL, checklisty deploymentu i inne.
- Generować lokalne artefakty z umiejętności wykonywalnych w `data/artifacts/`.

### Connectory API

#### Wymagane / rekomendowane

| Provider | Klucz środowiskowy | Zastosowanie | Uwagi |
| --- | --- | --- | --- |
| Anthropic Claude | `ANTHROPIC_API_KEY` | Domyślny mózg i planner akcji | Wymagany, chyba że wybierzesz inny LLM lub Ollamę |
| Fish Audio | `FISH_API_KEY` | Domyślny głos JARVIS-a | Rekomendowany do trybu głosowego |
| Fish Voice ID | `FISH_VOICE_ID` | Identyfikator głosu Fish Audio | Opcjonalna podmiana |
| Ollama | `OLLAMA_BASE_URL` | Lokalne/offline modele kompatybilne z OpenAI | Bez klucza API |

#### Opcjonalne wspierane connectory

| Provider | Klucz środowiskowy | Model / rola |
| --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | Rodzina GPT-5, domyślnie `gpt-5.2`; aliasy mówione typu „GPT 5-5” są normalizowane do skonfigurowanego domyślnego GPT-5 |
| DeepSeek | `DEEPSEEK_API_KEY` | DeepSeek V4 Pro, domyślnie `deepseek-v4-pro`, szybka opcja `deepseek-v4-flash` |
| Google AI | `GOOGLE_API_KEY` | Modele Gemini |
| ElevenLabs | `ELEVENLABS_API_KEY` | Opcjonalny premium/multilingual TTS |

Perplexity, Groq i Hermes zostały usunięte z katalogu connectorów. Hermes nie jest wystawiany, bo projekt nie posiada realnego Hermes API connectora.

### Instalacja i start

Windows:

```powershell
.\start.ps1
```

macOS/Linux:

```bash
./start.sh
```

Launchery tworzą `.env` z `.env.example`, instalują zależności, dodają skrót na pulpit i uruchamiają backend oraz frontend. Potem otwórz Chrome na <http://localhost:5173>.

### Jak odpalić ręcznie

```bash
cp .env.example .env
python -m pip install -r requirements.txt
cd frontend && npm install && cd ..
python server.py
```

Drugi terminal:

```bash
cd frontend
npm run dev
```

### Jak myśleć o systemie

- **Pamięć** to prywatny kontekst lokalny: JARVIS używa jej, żeby nie zaczynać od zera w każdej rozmowie.
- **Skille** to instrukcje operacyjne: po włączeniu uczą JARVIS-a konkretnego sposobu wykonania zadania.
- **Connectory** to tylko realnie obsługiwane integracje: Anthropic/OpenAI/DeepSeek/Google/Ollama dla modeli oraz Fish/ElevenLabs dla głosu.
- **Claude Code dispatch** to tryb pracy nad repozytoriami: JARVIS potrafi otworzyć projekt i zlecić agentowi konkretne zadanie.

---

Built by **AI Evolution Labs** for people who want a local assistant that can talk, remember, plan, build, and evolve.
