/**
 * JARVIS — Settings Panel
 *
 * Overlay panel for API keys, connection status, preferences, and system info.
 * Slides in from the right with glass-morphism styling.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatusResponse {
  claude_code_installed: boolean;
  calendar_accessible: boolean;
  mail_accessible: boolean;
  notes_accessible: boolean;
  memory_count: number;
  task_count: number;
  server_port: number;
  uptime_seconds: number;
  env_keys_set: {
    anthropic: boolean;
    fish_audio: boolean;
    fish_voice_id: boolean;
    elevenlabs: boolean;
    deepseek: boolean;
    hermes: boolean;
    tts_provider: string;
    platform: string;
    user_name: string;
  };
}

interface PreferencesResponse {
  user_name: string;
  honorific: string;
  calendar_accounts: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let panelEl: HTMLElement | null = null;
let isOpen = false;
let isFirstTimeSetup = false;
let setupStep = 0; // 0=anthropic, 1=fish, 2=name, 3=done

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return res.json();
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// Panel HTML
// ---------------------------------------------------------------------------

function buildPanelHTML(): string {
  return `
    <div class="settings-backdrop" id="settings-backdrop"></div>
    <div class="settings-panel" id="settings-panel-inner">
      <div class="settings-header">
        <h2>Settings</h2>
        <button class="settings-close" id="settings-close">&times;</button>
      </div>

      <div class="settings-welcome" id="settings-welcome" style="display:none">
        <p>Welcome to JARVIS. Let's get you set up.</p>
      </div>

      <div class="settings-body">

        <!-- API Keys -->
        <section class="settings-section hero-section" id="section-api-keys">
          <p class="settings-kicker">AJRUSZ Polska · Jervis Virtual Assistant</p>
          <h3>Provider Onboarding</h3>
          <p class="settings-copy">Connect the model, voice and agent APIs you want Jervis to use. Required fields are Anthropic plus one voice provider.</p>

          <div class="settings-field">
            <label>Anthropic API Key <span class="field-hint">main brain</span></label>
            <div class="settings-input-row">
              <input type="password" id="input-anthropic-key" placeholder="sk-ant-..." />
              <button class="settings-btn" id="btn-test-anthropic">Test</button>
              <span class="status-dot" id="status-anthropic"></span>
            </div>
          </div>

          <div class="settings-field">
            <label>Voice Provider</label>
            <select id="input-tts-provider">
              <option value="fish">Fish Audio</option>
              <option value="elevenlabs">ElevenLabs</option>
            </select>
          </div>

          <div class="provider-grid">
            <div class="provider-card">
              <div class="provider-card-head"><strong>Fish Audio</strong><span class="status-dot" id="status-fish"></span></div>
              <input type="password" id="input-fish-key" placeholder="Fish Audio API key" />
              <input type="text" id="input-fish-voice-id" placeholder="Fish Voice ID" />
              <button class="settings-btn" id="btn-test-fish">Test Fish</button>
            </div>
            <div class="provider-card">
              <div class="provider-card-head"><strong>ElevenLabs</strong><span class="status-dot" id="status-elevenlabs"></span></div>
              <input type="password" id="input-elevenlabs-key" placeholder="ElevenLabs API key" />
              <input type="text" id="input-elevenlabs-voice-id" placeholder="ElevenLabs Voice ID" />
              <input type="text" id="input-elevenlabs-model-id" placeholder="eleven_multilingual_v2" />
              <button class="settings-btn" id="btn-test-elevenlabs">Test ElevenLabs</button>
            </div>
          </div>

          <div class="provider-grid">
            <div class="provider-card">
              <div class="provider-card-head"><strong>DeepSeek API</strong><span class="status-dot" id="status-deepseek"></span></div>
              <input type="password" id="input-deepseek-key" placeholder="DeepSeek API key" />
              <input type="text" id="input-deepseek-url" placeholder="https://api.deepseek.com" />
              <button class="settings-btn" id="btn-test-deepseek">Test DeepSeek</button>
            </div>
            <div class="provider-card">
              <div class="provider-card-head"><strong>Hermes Agent</strong><span class="status-dot" id="status-hermes"></span></div>
              <input type="password" id="input-hermes-key" placeholder="Hermes API key (optional)" />
              <input type="text" id="input-hermes-url" placeholder="https://hermes.local/api" />
              <button class="settings-btn" id="btn-test-hermes">Test Hermes</button>
            </div>
          </div>

          <div class="settings-actions">
            <button class="settings-btn primary" id="btn-save-keys">Save All Connections</button>
          </div>
        </section>

        <!-- Connection Status -->
        <section class="settings-section" id="section-status">
          <h3>Connection Status</h3>
          <div class="status-grid">
            <div class="status-row"><span class="status-dot" id="status-claude-cli"></span><span>Claude Code CLI</span></div>
            <div class="status-row"><span class="status-dot" id="status-calendar"></span><span>Apple Calendar</span></div>
            <div class="status-row"><span class="status-dot" id="status-mail"></span><span>Apple Mail</span></div>
            <div class="status-row"><span class="status-dot" id="status-notes"></span><span>Apple Notes</span></div>
            <div class="status-row"><span class="status-dot" id="status-server"></span><span>Server</span><span class="status-detail" id="status-server-detail"></span></div>
          </div>
        </section>

        <!-- User Preferences -->
        <section class="settings-section" id="section-preferences">
          <h3>User Preferences</h3>

          <div class="settings-field">
            <label>Your Name</label>
            <input type="text" id="input-user-name" placeholder="Your name" />
          </div>

          <div class="settings-field">
            <label>Honorific</label>
            <select id="input-honorific">
              <option value="sir">Sir</option>
              <option value="ma'am">Ma'am</option>
              <option value="none">None</option>
            </select>
          </div>

          <div class="settings-field">
            <label>Calendar Accounts</label>
            <textarea id="input-calendar-accounts" rows="2" placeholder="auto (or comma-separated emails)"></textarea>
          </div>

          <div class="settings-actions">
            <button class="settings-btn primary" id="btn-save-prefs">Save Preferences</button>
          </div>
        </section>

        <!-- System Info -->
        <section class="settings-section" id="section-sysinfo">
          <h3>System Info</h3>
          <div class="sysinfo-grid">
            <div class="sysinfo-row"><span class="sysinfo-label">Memory entries</span><span id="sysinfo-memory">--</span></div>
            <div class="sysinfo-row"><span class="sysinfo-label">Tasks</span><span id="sysinfo-tasks">--</span></div>
            <div class="sysinfo-row"><span class="sysinfo-label">Server port</span><span id="sysinfo-port">--</span></div>
            <div class="sysinfo-row"><span class="sysinfo-label">Uptime</span><span id="sysinfo-uptime">--</span></div>
          </div>
        </section>

        <!-- Setup Navigation (first-time only) -->
        <div class="setup-nav" id="setup-nav" style="display:none">
          <button class="settings-btn primary" id="btn-setup-next">Next</button>
        </div>

      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Panel lifecycle
// ---------------------------------------------------------------------------

function createPanel(): HTMLElement {
  const container = document.createElement("div");
  container.id = "settings-container";
  container.innerHTML = buildPanelHTML();
  document.body.appendChild(container);
  return container;
}

function setDotStatus(id: string, status: "green" | "red" | "yellow" | "off") {
  const dot = document.getElementById(id);
  if (!dot) return;
  dot.className = "status-dot";
  if (status !== "off") dot.classList.add(`status-${status}`);
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

async function loadStatus() {
  try {
    const status = await apiGet<StatusResponse>("/api/settings/status");

    setDotStatus("status-claude-cli", status.claude_code_installed ? "green" : "red");
    setDotStatus("status-calendar", status.calendar_accessible ? "green" : "red");
    setDotStatus("status-mail", status.mail_accessible ? "green" : "red");
    setDotStatus("status-notes", status.notes_accessible ? "green" : "red");
    setDotStatus("status-server", "green");

    const serverDetail = document.getElementById("status-server-detail");
    if (serverDetail) serverDetail.textContent = `port ${status.server_port} | up ${formatUptime(status.uptime_seconds)}`;

    // API key status dots
    setDotStatus("status-anthropic", status.env_keys_set.anthropic ? "green" : "red");
    setDotStatus("status-fish", status.env_keys_set.fish_audio ? "green" : "red");
    setDotStatus("status-elevenlabs", status.env_keys_set.elevenlabs ? "green" : "red");
    setDotStatus("status-deepseek", status.env_keys_set.deepseek ? "green" : "off");
    setDotStatus("status-hermes", status.env_keys_set.hermes ? "green" : "off");
    const ttsEl = document.getElementById("input-tts-provider") as HTMLSelectElement | null;
    if (ttsEl) ttsEl.value = status.env_keys_set.tts_provider || "fish";

    // System info
    const memEl = document.getElementById("sysinfo-memory");
    if (memEl) memEl.textContent = String(status.memory_count);
    const taskEl = document.getElementById("sysinfo-tasks");
    if (taskEl) taskEl.textContent = String(status.task_count);
    const portEl = document.getElementById("sysinfo-port");
    if (portEl) portEl.textContent = String(status.server_port);
    const upEl = document.getElementById("sysinfo-uptime");
    if (upEl) upEl.textContent = formatUptime(status.uptime_seconds);

    return status;
  } catch (e) {
    console.error("[settings] failed to load status:", e);
    setDotStatus("status-server", "red");
    return null;
  }
}

async function loadPreferences() {
  try {
    const prefs = await apiGet<PreferencesResponse>("/api/settings/preferences");
    const nameEl = document.getElementById("input-user-name") as HTMLInputElement;
    const honEl = document.getElementById("input-honorific") as HTMLSelectElement;
    const calEl = document.getElementById("input-calendar-accounts") as HTMLTextAreaElement;
    if (nameEl) nameEl.value = prefs.user_name || "";
    if (honEl) honEl.value = prefs.honorific || "sir";
    if (calEl) calEl.value = prefs.calendar_accounts || "auto";
  } catch (e) {
    console.error("[settings] failed to load preferences:", e);
  }
}

function wireEvents() {
  // Close
  document.getElementById("settings-close")?.addEventListener("click", closeSettings);
  document.getElementById("settings-backdrop")?.addEventListener("click", closeSettings);

  // Save keys
  document.getElementById("btn-save-keys")?.addEventListener("click", async () => {
    const fields: Array<[string, string]> = [
      ["ANTHROPIC_API_KEY", "input-anthropic-key"],
      ["TTS_PROVIDER", "input-tts-provider"],
      ["FISH_API_KEY", "input-fish-key"],
      ["FISH_VOICE_ID", "input-fish-voice-id"],
      ["ELEVENLABS_API_KEY", "input-elevenlabs-key"],
      ["ELEVENLABS_VOICE_ID", "input-elevenlabs-voice-id"],
      ["ELEVENLABS_MODEL_ID", "input-elevenlabs-model-id"],
      ["DEEPSEEK_API_KEY", "input-deepseek-key"],
      ["DEEPSEEK_API_URL", "input-deepseek-url"],
      ["HERMES_API_KEY", "input-hermes-key"],
      ["HERMES_API_URL", "input-hermes-url"],
    ];

    for (const [keyName, inputId] of fields) {
      const input = document.getElementById(inputId) as HTMLInputElement | HTMLSelectElement | null;
      const value = input?.value.trim();
      if (value) await apiPost("/api/settings/keys", { key_name: keyName, key_value: value });
    }
    await loadStatus();
  });

  // Test Anthropic
  document.getElementById("btn-test-anthropic")?.addEventListener("click", async () => {
    setDotStatus("status-anthropic", "yellow");
    const key = (document.getElementById("input-anthropic-key") as HTMLInputElement).value.trim();
    try {
      const result = await apiPost<{ valid: boolean; error?: string }>("/api/settings/test-anthropic", { key_value: key || undefined });
      setDotStatus("status-anthropic", result.valid ? "green" : "red");
    } catch {
      setDotStatus("status-anthropic", "red");
    }
  });

  const testProvider = (buttonId: string, dotId: string, inputId: string, endpoint: string) => {
    document.getElementById(buttonId)?.addEventListener("click", async () => {
      setDotStatus(dotId, "yellow");
      const key = (document.getElementById(inputId) as HTMLInputElement).value.trim();
      try {
        const result = await apiPost<{ valid: boolean; error?: string }>(endpoint, { key_value: key || undefined });
        setDotStatus(dotId, result.valid ? "green" : "red");
      } catch {
        setDotStatus(dotId, "red");
      }
    });
  };

  testProvider("btn-test-fish", "status-fish", "input-fish-key", "/api/settings/test-fish");
  testProvider("btn-test-elevenlabs", "status-elevenlabs", "input-elevenlabs-key", "/api/settings/test-elevenlabs");
  testProvider("btn-test-deepseek", "status-deepseek", "input-deepseek-key", "/api/settings/test-deepseek");
  testProvider("btn-test-hermes", "status-hermes", "input-hermes-key", "/api/settings/test-hermes");

  // Save preferences
  document.getElementById("btn-save-prefs")?.addEventListener("click", async () => {
    const user_name = (document.getElementById("input-user-name") as HTMLInputElement).value.trim();
    const honorific = (document.getElementById("input-honorific") as HTMLSelectElement).value;
    const calendar_accounts = (document.getElementById("input-calendar-accounts") as HTMLTextAreaElement).value.trim();
    await apiPost("/api/settings/preferences", { user_name, honorific, calendar_accounts });
    await loadStatus();
  });

  // Setup next button
  document.getElementById("btn-setup-next")?.addEventListener("click", advanceSetup);
}

// ---------------------------------------------------------------------------
// First-time setup wizard
// ---------------------------------------------------------------------------

function enterSetupMode() {
  isFirstTimeSetup = true;
  setupStep = 0;

  const welcome = document.getElementById("settings-welcome");
  if (welcome) welcome.style.display = "block";

  const nav = document.getElementById("setup-nav");
  if (nav) nav.style.display = "flex";

  // Hide sections except API keys
  showSetupStep(0);
}

function showSetupStep(step: number) {
  const sections = ["section-api-keys", "section-status", "section-preferences", "section-sysinfo"];
  sections.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (step === 0 && i === 0) el.style.display = "";
    else if (step === 1 && i === 0) el.style.display = "";
    else if (step === 2 && i === 2) el.style.display = "";
    else if (step === 3) el.style.display = "";
    else el.style.display = "none";
  });

  const nextBtn = document.getElementById("btn-setup-next");
  if (nextBtn) {
    if (step === 0) nextBtn.textContent = "Next: Test Keys";
    else if (step === 1) nextBtn.textContent = "Next: Set Your Name";
    else if (step === 2) nextBtn.textContent = "Finish Setup";
    else nextBtn.style.display = "none";
  }
}

async function advanceSetup() {
  setupStep++;
  if (setupStep >= 3) {
    // Done — save everything and close
    isFirstTimeSetup = false;
    const welcome = document.getElementById("settings-welcome");
    if (welcome) welcome.style.display = "none";
    const nav = document.getElementById("setup-nav");
    if (nav) nav.style.display = "none";

    // Show all sections
    ["section-api-keys", "section-status", "section-preferences", "section-sysinfo"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "";
    });

    closeSettings();
    return;
  }
  showSetupStep(setupStep);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function openSettings() {
  if (isOpen) return;
  isOpen = true;

  if (!panelEl) {
    panelEl = createPanel();
    wireEvents();
  }

  panelEl.style.display = "block";

  // Trigger animation
  requestAnimationFrame(() => {
    panelEl!.classList.add("open");
  });

  // Load data
  const status = await loadStatus();
  await loadPreferences();

  // Check for first-time setup
  if (status && !status.env_keys_set.anthropic) {
    enterSetupMode();
  }
}

export function closeSettings() {
  if (!panelEl || !isOpen) return;
  isOpen = false;
  panelEl.classList.remove("open");
  setTimeout(() => {
    if (panelEl) panelEl.style.display = "none";
  }, 300);
}

export function isSettingsOpen(): boolean {
  return isOpen;
}

/**
 * Check if first-time setup is needed and auto-open.
 */
export async function checkFirstTimeSetup(): Promise<boolean> {
  try {
    const status = await apiGet<StatusResponse>("/api/settings/status");
    if (!status.env_keys_set.anthropic) {
      openSettings();
      return true;
    }
  } catch {
    // Server not ready yet, skip
  }
  return false;
}
