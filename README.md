# Jervis — wirtualny asystent AJRUSZ Polska

**Jervis** to głosowy asystent AI inspirowany filmowym JARVIS-em: rozmawia, odpowiada głosem, uruchamia zadania developerskie, czyta kontekst systemowy i może stać się centralnym panelem dla wielu agentów oraz API.

Projekt rozwijany jest jako otwarty fundament dla **AJRUSZ Polska** — z nowoczesnym HUD-em, onboardingiem kluczy API i ścieżką do pracy na macOS oraz Windows.

> Voice-first. Agent-ready. Built to feel like a command centre.

---

## Najważniejsze możliwości

- **Głosowa rozmowa** przez Web Speech API w Chrome.
- **Animowany HUD i orb Three.js**, reagujący na stan asystenta i audio.
- **Onboarding API w aplikacji**: Anthropic, Fish Audio, ElevenLabs, DeepSeek oraz Hermes.
- **Dwa providery TTS**: Fish Audio lub ElevenLabs.
- **Tryb developerski** z Claude Code CLI do budowania i poprawiania projektów.
- **Pamięć, zadania i notatki** przechowywane lokalnie.
- **Integracje macOS**: Apple Calendar, Mail, Notes, Terminal i Chrome przez AppleScript.
- **Lepsza obsługa Windows** dla uruchamiania terminala i przeglądarki bez AppleScript.
- **Endpointy settings/status/test**, które pozwalają sprawdzać połączenia z poziomu UI.

---

## Stos technologiczny

| Warstwa | Technologia |
| --- | --- |
| Backend | Python, FastAPI, WebSocket |
| Frontend | Vite, TypeScript, Three.js |
| Głos | Web Speech API + Fish Audio lub ElevenLabs |
| LLM | Anthropic domyślnie, DeepSeek jako skonfigurowany provider opcjonalny |
| Agenci | Claude Code CLI, Hermes endpoint opcjonalny |
| Pamięć | SQLite / lokalne moduły Python |
| macOS | AppleScript bridge dla Calendar, Mail, Notes, Terminal, Chrome |
| Windows | Terminal i przeglądarka przez natywne mechanizmy systemu |

---

## Szybki start

### 1. Sklonuj repozytorium

```bash
git clone https://github.com/yourusername/jarvis.git
cd jarvis
```

### 2. Skonfiguruj środowisko

```bash
cp .env.example .env
```

Możesz wpisać klucze ręcznie w `.env` albo uruchomić aplikację i przejść onboarding w panelu **Settings**.

### 3. Backend Python

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
python server.py
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Otwórz Chrome pod adresem:

```text
http://localhost:5173
```

Kliknij stronę raz, aby przeglądarka odblokowała audio, a następnie zacznij mówić.

---

## Konfiguracja API

Jervis może działać minimalnie z Anthropic + jednym providerem głosu. Pozostałe integracje można dodać później.

| Zmienna | Wymagana | Opis |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Tak | Główny model rozmowy i orkiestracji. |
| `TTS_PROVIDER` | Tak | `fish` albo `elevenlabs`. |
| `FISH_API_KEY` | Jeśli `TTS_PROVIDER=fish` | Klucz Fish Audio. |
| `FISH_VOICE_ID` | Jeśli `TTS_PROVIDER=fish` | ID głosu Fish Audio. |
| `ELEVENLABS_API_KEY` | Jeśli `TTS_PROVIDER=elevenlabs` | Klucz ElevenLabs. |
| `ELEVENLABS_VOICE_ID` | Jeśli `TTS_PROVIDER=elevenlabs` | ID głosu ElevenLabs. |
| `ELEVENLABS_MODEL_ID` | Nie | Domyślnie `eleven_multilingual_v2`. |
| `DEEPSEEK_API_KEY` | Nie | Opcjonalny klucz DeepSeek do przyszłych workflow modelowych. |
| `DEEPSEEK_API_URL` | Nie | Domyślnie `https://api.deepseek.com`. |
| `HERMES_API_KEY` | Nie | Opcjonalny klucz dla bramki Hermes. |
| `HERMES_API_URL` | Nie | URL lokalnego lub zdalnego agenta Hermes. |
| `USER_NAME` / `HONORIFIC` | Nie | Personalizacja zwrotów asystenta. |

Panel **Settings** zapisuje te wartości do `.env`, pokazuje status połączeń i pozwala testować providery bez ręcznej edycji plików.

---

## macOS i Windows

### macOS

Najpełniejszy zestaw funkcji działa na macOS, ponieważ projekt używa AppleScript do:

- Apple Calendar,
- Apple Mail,
- Apple Notes,
- Terminal.app,
- Google Chrome.

### Windows

Projekt nie uruchamia AppleScript na Windows. Aktualnie obsługiwane są:

- start terminala przez `cmd`,
- otwieranie stron przez domyślną przeglądarkę,
- frontend, WebSocket, onboarding API i podstawowy backend.

Integracje Calendar/Mail/Notes wymagają osobnych connectorów Windows lub usług zewnętrznych.

---

## Architektura przepływu głosu

```text
Mikrofon
  -> Chrome Web Speech API
  -> WebSocket
  -> FastAPI backend
  -> Anthropic / akcje / agenci
  -> Fish Audio albo ElevenLabs TTS
  -> WebSocket audio
  -> przeglądarka + orb HUD
```

---

## Kluczowe pliki

| Plik | Cel |
| --- | --- |
| `server.py` | Backend FastAPI, WebSocket, ustawienia, TTS i orkiestracja. |
| `actions.py` | Akcje systemowe, terminal, przeglądarka, Claude Code. |
| `frontend/src/settings.ts` | Onboarding i panel konfiguracji API. |
| `frontend/src/style.css` | HUD, wizualizacja aplikacji i panel ustawień. |
| `frontend/src/orb.ts` | Wizualizacja orb Three.js. |
| `.env.example` | Szablon wszystkich obsługiwanych kluczy i providerów. |
| `memory.py` | Lokalna pamięć, zadania i notatki. |
| `calendar_access.py` | Apple Calendar przez AppleScript. |
| `mail_access.py` | Apple Mail read-only. |
| `notes_access.py` | Apple Notes read/create. |

---

## Uruchamianie testów

```bash
python -m pytest
cd frontend && npm run build
```

---

## Roadmapa

- Pełna integracja DeepSeek jako przełączalnego providera LLM.
- Connector Hermes do delegowania zadań agentowych.
- Dedykowane integracje Windows Calendar/Mail przez Microsoft Graph.
- Import/export konfiguracji agentów.
- Galeria presetów głosów i person.
- Demo GIF i screenshoty HUD-u na GitHub.

---

## Licencja

Zobacz `LICENSE`.
