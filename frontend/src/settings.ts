/**
 * JARVIS — Settings Panel
 *
 * Overlay panel for API keys, connection status, preferences, and system info.
 * Slides in from the right with glass-morphism styling.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiProvider {
  id: string;
  name: string;
  env_key: string;
  category: string;
  description: string;
  placeholder: string;
  docs_url: string;
  optional: boolean;
  configured: boolean;
}

interface SkillPack {
  id: string;
  name: string;
  category: string;
  description: string;
  bundled: boolean;
  install_hint: string;
}

interface Skill {
  slug: string;
  name: string;
  category: string;
  description: string;
  when_to_use: string;
  instructions: string;
  executable: boolean;
  enabled: boolean;
}

interface SkillCategory {
  category: string;
  total: number;
  enabled: number;
}

interface McpServer {
  id: string;
  name: string;
  category: string;
  description: string;
  capabilities: string[];
  connected: boolean;
  status: string;
  auth_required: boolean;
  auth_present: boolean;
  docs_url: string;
}

interface LlmProviderStatus {
  id: string;
  label: string;
  configured: boolean;
  needs_key: boolean;
  models: string[];
  default_model: string;
  active_model: string;
  is_ollama: boolean;
}

interface LlmStatus {
  providers: LlmProviderStatus[];
  active: string;
  active_model: string;
  ollama_base_url: string;
}

interface TtsProviderStatus {
  id: string;
  label: string;
  configured: boolean;
  voice_id: string;
}

interface TtsStatus {
  providers: TtsProviderStatus[];
  active: string;
}

interface StatusResponse {
  claude_code_installed: boolean;
  calendar_accessible: boolean;
  mail_accessible: boolean;
  notes_accessible: boolean;
  memory_count: number;
  task_count: number;
  server_port: number;
  uptime_seconds: number;
  platform: string;
  env_keys_set: {
    anthropic: boolean;
    fish_audio: boolean;
    fish_voice_id: boolean;
    user_name: string;
  };
  providers: ApiProvider[];
  llm?: LlmStatus;
  tts?: TtsStatus;
  skills: SkillPack[];
  skill_counts?: { total: number; enabled: number };
  mcp_connected?: number;
  onboarding?: { status: string; turns: number };
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
        <div class="onboarding-hero">
          <span class="onboarding-kicker">AI Evolution Labs</span>
          <strong>Bring your own keys. Activate the agent stack.</strong>
          <p>Configure the core brain, voice, research, and optional Hermes-compatible connectors without editing files by hand.</p>
        </div>
        <div class="onboarding-steps" id="onboarding-steps">
          <span class="active">1 Keys</span><span>2 Skills</span><span>3 Tools</span><span>4 Profile</span><span>5 Launch</span>
        </div>
      </div>

      <div class="settings-body">

        <!-- API Keys -->
        <section class="settings-section" id="section-api-keys">
          <h3>API Keys</h3>

          <div class="settings-field">
            <label>Anthropic API Key</label>
            <div class="settings-input-row">
              <input type="password" id="input-anthropic-key" placeholder="sk-ant-..." />
              <button class="settings-btn" id="btn-test-anthropic">Test</button>
              <span class="status-dot" id="status-anthropic"></span>
            </div>
          </div>

          <div class="settings-field">
            <label>Fish Audio API Key</label>
            <div class="settings-input-row">
              <input type="password" id="input-fish-key" placeholder="Fish Audio key..." />
              <button class="settings-btn" id="btn-test-fish">Test</button>
              <span class="status-dot" id="status-fish"></span>
            </div>
          </div>

          <div class="settings-field">
            <label>Fish Voice ID</label>
            <div class="settings-input-row">
              <input type="text" id="input-fish-voice-id" placeholder="612b878b113047d9a770c069c8b4fdfe" />
              <button class="settings-btn" id="btn-save-voice-id">Save</button>
            </div>
          </div>

          <div class="provider-grid" id="provider-grid"></div>

          <div class="settings-actions">
            <button class="settings-btn primary" id="btn-save-keys">Save Keys</button>
          </div>
        </section>

        <!-- Engine: active brain + voice -->
        <section class="settings-section" id="section-engine">
          <h3>Engine</h3>
          <p class="section-note">Choose which model thinks and which voice speaks. Claude is recommended for tool actions; other brains chat well but may be weaker at running tools.</p>

          <div class="settings-field">
            <label>Active Brain</label>
            <div class="settings-input-row">
              <select id="select-llm-provider"></select>
              <span class="status-dot" id="status-llm"></span>
            </div>
          </div>

          <div class="settings-field">
            <label>Model</label>
            <div class="settings-input-row">
              <select id="select-llm-model"></select>
              <button class="settings-btn" id="btn-test-llm">Test</button>
            </div>
          </div>

          <div class="settings-field" id="field-ollama-url" style="display:none">
            <label>Ollama Base URL</label>
            <div class="settings-input-row">
              <input type="text" id="input-ollama-url" placeholder="http://localhost:11434" />
              <button class="settings-btn" id="btn-save-ollama-url">Save</button>
            </div>
          </div>

          <div class="settings-field">
            <label>Active Voice</label>
            <div class="settings-input-row">
              <select id="select-tts-provider"></select>
              <button class="settings-btn" id="btn-test-tts">Test</button>
              <span class="status-dot" id="status-tts"></span>
            </div>
          </div>

          <div class="settings-field" id="field-eleven-voice" style="display:none">
            <label>ElevenLabs Voice ID</label>
            <div class="settings-input-row">
              <input type="text" id="input-eleven-voice" placeholder="JBFqnCBsd6RMkjVDRZzb" />
              <button class="settings-btn" id="btn-save-eleven-voice">Save</button>
            </div>
          </div>
        </section>

        <!-- Skills -->
        <section class="settings-section" id="section-skills">
          <h3>Skills <span class="skills-count" id="skills-count"></span></h3>
          <p class="section-note">Enable the capabilities JARVIS should be ready to use. Active skills are loaded into context so he performs the task well. Some skills can run and produce a file.</p>
          <input type="search" id="skills-search" class="skills-search" placeholder="Search 100 skills — invoice, email, hiring..." />
          <div class="skills-chips" id="skills-chips"></div>
          <div class="skills-list" id="skills-list"></div>
        </section>

        <!-- Connected Tools (MCP) -->
        <section class="settings-section" id="section-mcp">
          <h3>Connected Tools <span class="skills-count" id="mcp-count"></span></h3>
          <p class="section-note">Connect external tools over MCP so JARVIS can reach your email, docs, CRM, and database. Add the matching API key in Settings where a tool needs auth.</p>
          <div class="mcp-list" id="mcp-list"></div>
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
            <div class="sysinfo-row"><span class="sysinfo-label">Platform</span><span id="sysinfo-platform">--</span></div>
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

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[char] || char));
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function renderProviders(providers: ApiProvider[]) {
  const grid = document.getElementById("provider-grid");
  if (!grid) return;
  grid.innerHTML = providers
    .filter((provider) => !["anthropic", "fish_audio"].includes(provider.id))
    .map((provider) => `
      <div class="provider-card ${provider.configured ? "configured" : ""}">
        <div class="provider-card-header">
          <span class="status-dot ${provider.configured ? "status-green" : ""}" id="status-provider-${escapeHtml(provider.id)}"></span>
          <div>
            <strong>${escapeHtml(provider.name)}</strong>
            <small>${escapeHtml(provider.category)}</small>
          </div>
          ${provider.docs_url ? `<a href="${escapeHtml(provider.docs_url)}" target="_blank" rel="noreferrer">Docs</a>` : ""}
        </div>
        <p>${escapeHtml(provider.description)}</p>
        <input type="password" data-provider-key="${escapeHtml(provider.env_key)}" placeholder="${escapeHtml(provider.placeholder || provider.env_key)}" />
      </div>
    `)
    .join("");
}

// --- Engine (active brain + voice) -----------------------------------------

let llmStatusCache: LlmStatus | null = null;

function populateModelSelect(providerId: string, selected?: string) {
  const sel = document.getElementById("select-llm-model") as HTMLSelectElement | null;
  if (!sel || !llmStatusCache) return;
  const provider = llmStatusCache.providers.find((p) => p.id === providerId);
  const models = provider?.models?.length ? provider.models : (provider ? [provider.active_model] : []);
  const want = selected || provider?.active_model || provider?.default_model || "";
  sel.innerHTML = models
    .map((m) => `<option value="${escapeHtml(m)}" ${m === want ? "selected" : ""}>${escapeHtml(m)}</option>`)
    .join("");
}

async function refreshOllamaModels(selected?: string) {
  const sel = document.getElementById("select-llm-model") as HTMLSelectElement | null;
  if (!sel) return;
  sel.innerHTML = `<option>loading…</option>`;
  try {
    const data = await apiGet<{ models: string[]; error?: string }>("/api/settings/ollama-models");
    const models = data.models?.length ? data.models : ["llama3.2"];
    sel.innerHTML = models
      .map((m) => `<option value="${escapeHtml(m)}" ${m === selected ? "selected" : ""}>${escapeHtml(m)}</option>`)
      .join("");
    if (data.error) console.warn("[engine] ollama:", data.error);
  } catch (e) {
    sel.innerHTML = `<option value="llama3.2">llama3.2</option>`;
    console.warn("[engine] ollama models failed:", e);
  }
}

function renderEngine(status: StatusResponse) {
  const llm = status.llm;
  const tts = status.tts;
  if (llm) {
    llmStatusCache = llm;
    const sel = document.getElementById("select-llm-provider") as HTMLSelectElement | null;
    if (sel) {
      sel.innerHTML = llm.providers
        .map((p) => {
          const tag = p.is_ollama ? " (local)" : p.configured ? "" : " — no key";
          return `<option value="${escapeHtml(p.id)}" ${p.id === llm.active ? "selected" : ""} ${!p.configured && !p.is_ollama ? "disabled" : ""}>${escapeHtml(p.label)}${tag}</option>`;
        })
        .join("");
    }
    const active = llm.providers.find((p) => p.id === llm.active);
    setDotStatus("status-llm", active && active.configured ? "green" : "red");
    const urlField = document.getElementById("field-ollama-url");
    if (urlField) urlField.style.display = llm.active === "ollama" ? "" : "none";
    const urlInput = document.getElementById("input-ollama-url") as HTMLInputElement | null;
    if (urlInput && !urlInput.value) urlInput.value = llm.ollama_base_url || "";
    if (llm.active === "ollama") refreshOllamaModels(llm.active_model);
    else populateModelSelect(llm.active, llm.active_model);
  }
  if (tts) {
    const sel = document.getElementById("select-tts-provider") as HTMLSelectElement | null;
    if (sel) {
      sel.innerHTML = tts.providers
        .map((p) => `<option value="${escapeHtml(p.id)}" ${p.id === tts.active ? "selected" : ""}>${escapeHtml(p.label)}${p.configured ? "" : " — no key"}</option>`)
        .join("");
    }
    const active = tts.providers.find((p) => p.id === tts.active);
    setDotStatus("status-tts", active && active.configured ? "green" : "red");
    const voiceField = document.getElementById("field-eleven-voice");
    if (voiceField) voiceField.style.display = tts.active === "elevenlabs" ? "" : "none";
    const voiceInput = document.getElementById("input-eleven-voice") as HTMLInputElement | null;
    const eleven = tts.providers.find((p) => p.id === "elevenlabs");
    if (voiceInput && !voiceInput.value && eleven) voiceInput.value = eleven.voice_id || "";
  }
}

// --- Skills browser --------------------------------------------------------

let allSkills: Skill[] = [];
let skillCategories: SkillCategory[] = [];
let activeCategory = "All";
let skillSearchTerm = "";

async function loadSkills() {
  try {
    const data = await apiGet<{ skills: Skill[]; categories: SkillCategory[]; counts: { total: number; enabled: number } }>("/api/skills");
    allSkills = data.skills || [];
    skillCategories = data.categories || [];
    const countEl = document.getElementById("skills-count");
    if (countEl) countEl.textContent = `${data.counts.enabled}/${data.counts.total} active`;
    renderChips();
    renderSkillsList();
  } catch (e) {
    console.error("[settings] failed to load skills:", e);
  }
}

function renderChips() {
  const chips = document.getElementById("skills-chips");
  if (!chips) return;
  const cats = ["All", ...skillCategories.map((c) => c.category)];
  chips.innerHTML = cats
    .map((c) => {
      const meta = skillCategories.find((x) => x.category === c);
      const count = c === "All" ? "" : ` <em>${meta?.enabled ?? 0}/${meta?.total ?? 0}</em>`;
      return `<button class="skill-chip ${c === activeCategory ? "active" : ""}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}${count}</button>`;
    })
    .join("");
}

function renderSkillsList() {
  const list = document.getElementById("skills-list");
  if (!list) return;
  const term = skillSearchTerm.toLowerCase();
  const filtered = allSkills.filter((s) => {
    const matchesCat = activeCategory === "All" || s.category === activeCategory;
    const matchesTerm =
      !term ||
      `${s.name} ${s.description} ${s.instructions} ${s.category}`.toLowerCase().includes(term);
    return matchesCat && matchesTerm;
  });

  if (filtered.length === 0) {
    list.innerHTML = `<p class="section-note">No skills match "${escapeHtml(skillSearchTerm)}".</p>`;
    return;
  }

  list.innerHTML = filtered
    .map(
      (s) => `
    <div class="skill-row ${s.enabled ? "enabled" : ""}">
      <div class="skill-row-main">
        <strong>${escapeHtml(s.name)}${s.executable ? ' <span class="skill-exec">runs</span>' : ""}</strong>
        <small>${escapeHtml(s.category)}</small>
        <p>${escapeHtml(s.description)}</p>
      </div>
      <button class="skill-toggle ${s.enabled ? "on" : ""}" data-slug="${escapeHtml(s.slug)}" role="switch" aria-checked="${s.enabled}" aria-label="Toggle ${escapeHtml(s.name)}"><span></span></button>
    </div>`
    )
    .join("");
}

async function toggleSkill(slug: string) {
  const skill = allSkills.find((s) => s.slug === slug);
  if (!skill) return;
  const next = !skill.enabled;
  skill.enabled = next; // optimistic
  renderSkillsList();
  try {
    await apiPost(`/api/skills/${slug}/toggle`, { enabled: next });
    await loadSkills();
  } catch {
    skill.enabled = !next;
    renderSkillsList();
  }
}

// --- MCP tools -------------------------------------------------------------

async function loadMcp() {
  try {
    const data = await apiGet<{ servers: McpServer[] }>("/api/mcp");
    const servers = data.servers || [];
    const countEl = document.getElementById("mcp-count");
    if (countEl) countEl.textContent = `${servers.filter((s) => s.connected).length} connected`;
    renderMcp(servers);
  } catch (e) {
    console.error("[settings] failed to load MCP servers:", e);
  }
}

function renderMcp(servers: McpServer[]) {
  const list = document.getElementById("mcp-list");
  if (!list) return;
  list.innerHTML = servers
    .map(
      (s) => `
    <div class="mcp-card ${s.connected ? "connected" : ""}">
      <div class="mcp-card-head">
        <span class="status-dot ${s.connected ? "status-green" : ""}"></span>
        <div>
          <strong>${escapeHtml(s.name)}</strong>
          <small>${escapeHtml(s.category)}${s.capabilities.length ? " · " + escapeHtml(s.capabilities.join(", ")) : ""}</small>
        </div>
        <button class="settings-btn mcp-btn" data-mcp="${escapeHtml(s.id)}" data-connected="${s.connected}">${s.connected ? "Disconnect" : "Connect"}</button>
      </div>
      <p>${escapeHtml(s.description)}</p>
      ${s.connected && s.auth_required && !s.auth_present ? `<small class="mcp-warn">Needs an API key — add it in the Keys section.</small>` : ""}
    </div>`
    )
    .join("");
}

async function toggleMcp(id: string, connected: boolean) {
  try {
    await apiPost(`/api/mcp/${id}/${connected ? "disconnect" : "connect"}`, { config: {} });
    await loadMcp();
  } catch (e) {
    console.error("[settings] MCP toggle failed:", e);
  }
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

    renderProviders(status.providers || []);
    renderEngine(status);
    loadSkills();
    loadMcp();

    // System info
    const memEl = document.getElementById("sysinfo-memory");
    if (memEl) memEl.textContent = String(status.memory_count);
    const taskEl = document.getElementById("sysinfo-tasks");
    if (taskEl) taskEl.textContent = String(status.task_count);
    const portEl = document.getElementById("sysinfo-port");
    if (portEl) portEl.textContent = String(status.server_port);
    const upEl = document.getElementById("sysinfo-uptime");
    if (upEl) upEl.textContent = formatUptime(status.uptime_seconds);
    const platformEl = document.getElementById("sysinfo-platform");
    if (platformEl) platformEl.textContent = status.platform || "unknown";

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
    const anthropicKey = (document.getElementById("input-anthropic-key") as HTMLInputElement).value.trim();
    const fishKey = (document.getElementById("input-fish-key") as HTMLInputElement).value.trim();

    if (anthropicKey) {
      await apiPost("/api/settings/keys", { key_name: "ANTHROPIC_API_KEY", key_value: anthropicKey });
    }
    if (fishKey) {
      await apiPost("/api/settings/keys", { key_name: "FISH_API_KEY", key_value: fishKey });
    }

    const providerInputs = Array.from(document.querySelectorAll<HTMLInputElement>("[data-provider-key]"));
    await Promise.all(providerInputs.map((input) => {
      const value = input.value.trim();
      if (!value) return Promise.resolve();
      return apiPost("/api/settings/keys", { key_name: input.dataset.providerKey, key_value: value });
    }));

    await loadStatus();
  });

  // Save voice ID
  document.getElementById("btn-save-voice-id")?.addEventListener("click", async () => {
    const voiceId = (document.getElementById("input-fish-voice-id") as HTMLInputElement).value.trim();
    if (voiceId) {
      await apiPost("/api/settings/keys", { key_name: "FISH_VOICE_ID", key_value: voiceId });
    }
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

  // Test Fish
  document.getElementById("btn-test-fish")?.addEventListener("click", async () => {
    setDotStatus("status-fish", "yellow");
    const key = (document.getElementById("input-fish-key") as HTMLInputElement).value.trim();
    try {
      const result = await apiPost<{ valid: boolean; error?: string }>("/api/settings/test-fish", { key_value: key || undefined });
      setDotStatus("status-fish", result.valid ? "green" : "red");
    } catch {
      setDotStatus("status-fish", "red");
    }
  });

  // --- Engine: active brain ---
  document.getElementById("select-llm-provider")?.addEventListener("change", async (e) => {
    const provider = (e.target as HTMLSelectElement).value;
    const urlField = document.getElementById("field-ollama-url");
    if (urlField) urlField.style.display = provider === "ollama" ? "" : "none";
    if (provider === "ollama") await refreshOllamaModels();
    else populateModelSelect(provider);
    const model = (document.getElementById("select-llm-model") as HTMLSelectElement)?.value;
    await apiPost("/api/settings/active", { llm_provider: provider, llm_model: model });
    await loadStatus();
  });

  document.getElementById("select-llm-model")?.addEventListener("change", async (e) => {
    const provider = (document.getElementById("select-llm-provider") as HTMLSelectElement)?.value;
    const model = (e.target as HTMLSelectElement).value;
    if (provider) await apiPost("/api/settings/active", { llm_provider: provider, llm_model: model });
  });

  document.getElementById("btn-test-llm")?.addEventListener("click", async () => {
    const provider = (document.getElementById("select-llm-provider") as HTMLSelectElement)?.value;
    if (!provider) return;
    setDotStatus("status-llm", "yellow");
    try {
      const result = await apiPost<{ valid: boolean; error?: string }>("/api/settings/test-provider", { provider });
      setDotStatus("status-llm", result.valid ? "green" : "red");
    } catch {
      setDotStatus("status-llm", "red");
    }
  });

  document.getElementById("btn-save-ollama-url")?.addEventListener("click", async () => {
    const url = (document.getElementById("input-ollama-url") as HTMLInputElement).value.trim();
    if (url) {
      await apiPost("/api/settings/keys", { key_name: "OLLAMA_BASE_URL", key_value: url });
      await refreshOllamaModels();
    }
  });

  // --- Engine: active voice ---
  document.getElementById("select-tts-provider")?.addEventListener("change", async (e) => {
    const provider = (e.target as HTMLSelectElement).value;
    const voiceField = document.getElementById("field-eleven-voice");
    if (voiceField) voiceField.style.display = provider === "elevenlabs" ? "" : "none";
    await apiPost("/api/settings/active", { tts_provider: provider });
    await loadStatus();
  });

  document.getElementById("btn-test-tts")?.addEventListener("click", async () => {
    const provider = (document.getElementById("select-tts-provider") as HTMLSelectElement)?.value;
    if (!provider) return;
    setDotStatus("status-tts", "yellow");
    try {
      const result = await apiPost<{ valid: boolean; error?: string }>("/api/settings/test-provider", { provider });
      setDotStatus("status-tts", result.valid ? "green" : "red");
    } catch {
      setDotStatus("status-tts", "red");
    }
  });

  document.getElementById("btn-save-eleven-voice")?.addEventListener("click", async () => {
    const voice = (document.getElementById("input-eleven-voice") as HTMLInputElement).value.trim();
    if (voice) await apiPost("/api/settings/keys", { key_name: "ELEVENLABS_VOICE_ID", key_value: voice });
  });

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

  // Skills search
  document.getElementById("skills-search")?.addEventListener("input", (e) => {
    skillSearchTerm = (e.target as HTMLInputElement).value;
    renderSkillsList();
  });

  // Category chips (delegated)
  document.getElementById("skills-chips")?.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-cat]");
    if (!btn) return;
    activeCategory = btn.dataset.cat || "All";
    renderChips();
    renderSkillsList();
  });

  // Skill toggles (delegated)
  document.getElementById("skills-list")?.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-slug]");
    if (!btn) return;
    toggleSkill(btn.dataset.slug || "");
  });

  // MCP connect/disconnect (delegated)
  document.getElementById("mcp-list")?.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-mcp]");
    if (!btn) return;
    toggleMcp(btn.dataset.mcp || "", btn.dataset.connected === "true");
  });
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

const ALL_SECTIONS = ["section-api-keys", "section-skills", "section-mcp", "section-status", "section-preferences", "section-sysinfo"];
// Which section each setup step reveals (0=keys, 1=skills, 2=tools, 3=profile).
const SETUP_STEP_SECTION: Record<number, string> = {
  0: "section-api-keys",
  1: "section-skills",
  2: "section-mcp",
  3: "section-preferences",
};

function showSetupStep(step: number) {
  document.querySelectorAll("#onboarding-steps span").forEach((item, index) => {
    item.classList.toggle("active", index === Math.min(step, 4));
  });
  const visible = SETUP_STEP_SECTION[step];
  ALL_SECTIONS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = id === visible ? "" : "none";
  });

  const nextBtn = document.getElementById("btn-setup-next");
  if (nextBtn) {
    const labels: Record<number, string> = {
      0: "Next: Skills",
      1: "Next: Tools",
      2: "Next: Profile",
      3: "Finish Setup",
    };
    nextBtn.textContent = labels[step] || "Finish Setup";
  }
}

async function advanceSetup() {
  setupStep++;
  if (setupStep >= 4) {
    // Done — reveal everything and close
    isFirstTimeSetup = false;
    const welcome = document.getElementById("settings-welcome");
    if (welcome) welcome.style.display = "none";
    const nav = document.getElementById("setup-nav");
    if (nav) nav.style.display = "none";

    ALL_SECTIONS.forEach((id) => {
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
